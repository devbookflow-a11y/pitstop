import {
  FuelLog,
  Vehicle,
  StationStats,
  FlexComparisonResult,
  AnomalyReport,
  DrivingProfile,
  FuelType,
  RefuelProjection,
  ProjectionMode,
  TireCalibrationLog,
  TireCalibrationStatus,
  GasStation,
  TripSimulationInput,
  TripSimulationResult,
  RefuelStopPlan,
  StartingTankLevel,
} from '../types';

/**
 * Computes exact fuel consumption for a vehicle's logs using the strict
 * full-tank to full-tank algorithm.
 * 
 * Rules:
 * - Logs are sorted chronologically by odometer.
 * - When isFullTank = true and there was a previous isFullTank = true,
 *   the distance traveled is (odometer - previousFullOdometer) and liters
 *   consumed is the sum of current liters + all partial fills since the previous full tank.
 * - If isFullTank = false, it's marked as accumulating partial fill.
 */
export function calculateFuelLogsMetrics(logs: FuelLog[]): FuelLog[] {
  if (!logs || logs.length === 0) return [];

  // Sort ascending by odometer, with date as secondary chronological tie-breaker
  const sorted = [...logs].sort((a, b) => {
    const odoDiff = (Number(a.odometer) || 0) - (Number(b.odometer) || 0);
    if (odoDiff !== 0) return odoDiff;
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    return (Number.isFinite(tA) ? tA : 0) - (Number.isFinite(tB) ? tB : 0);
  });

  let lastFullTankIndex: number | null = null;
  const processedLogs: FuelLog[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = { ...sorted[i] };
    const prev = i > 0 ? sorted[i - 1] : null;

    current.distanceTraveled = prev ? Math.max(0, (Number(current.odometer) || 0) - (Number(prev.odometer) || 0)) : null;

    if (current.isFullTank) {
      if (lastFullTankIndex !== null) {
        const lastFullLog = sorted[lastFullTankIndex];
        const distanceSinceLastFull = (Number(current.odometer) || 0) - (Number(lastFullLog.odometer) || 0);

        // Sum liters and costs of all logs from lastFullTankIndex + 1 up to current
        let totalLiters = 0;
        let totalCost = 0;
        for (let j = lastFullTankIndex + 1; j <= i; j++) {
          totalLiters += Number(sorted[j].liters) || 0;
          totalCost += Number(sorted[j].totalCost) || 0;
        }

        if (distanceSinceLastFull > 0 && totalLiters > 0) {
          const kmL = Number((distanceSinceLastFull / totalLiters).toFixed(2));
          const costKm = Number((totalCost / distanceSinceLastFull).toFixed(2));
          current.calculatedKmPerLiter = kmL;
          current.calculatedCostPerKm = costKm;
        } else {
          current.calculatedKmPerLiter = null;
          current.calculatedCostPerKm = null;
        }
      } else {
        // First full tank in history serves as the baseline
        current.calculatedKmPerLiter = null;
        current.calculatedCostPerKm = null;
      }
      lastFullTankIndex = i;
    } else {
      current.calculatedKmPerLiter = null;
      current.calculatedCostPerKm = null;
    }

    processedLogs.push(current);
  }

  // Calculate historical averages per profile to detect anomalies
  const profileTotals: Record<DrivingProfile, { sumKmL: number; count: number }> = {
    cidade: { sumKmL: 0, count: 0 },
    estrada: { sumKmL: 0, count: 0 },
    misto: { sumKmL: 0, count: 0 },
  };

  processedLogs.forEach(log => {
    if (log.calculatedKmPerLiter && log.calculatedKmPerLiter > 0) {
      const p = log.drivingProfile || 'misto';
      profileTotals[p].sumKmL += log.calculatedKmPerLiter;
      profileTotals[p].count += 1;
    }
  });

  // Flag anomalies (drop > 15% vs profile historical avg or general avg)
  const enrichedLogs = processedLogs.map(log => {
    if (!log.calculatedKmPerLiter || log.calculatedKmPerLiter <= 0) {
      return { ...log, isAnomaly: false };
    }

    const p = log.drivingProfile || 'misto';
    const profileStat = profileTotals[p];
    const avg = profileStat.count > 1 ? profileStat.sumKmL / profileStat.count : null;

    if (avg && avg > 0) {
      const dropPct = (avg - log.calculatedKmPerLiter) / avg;
      return {
        ...log,
        isAnomaly: dropPct >= 0.15,
      };
    }
    return { ...log, isAnomaly: false };
  });

  // Return in descending order (most recent first) for UI presentation
  return enrichedLogs.sort((a, b) => {
    const odoDiff = (Number(b.odometer) || 0) - (Number(a.odometer) || 0);
    if (odoDiff !== 0) return odoDiff;
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    return (Number.isFinite(tB) ? tB : 0) - (Number.isFinite(tA) ? tA : 0);
  });
}

/**
 * Detects if the most recent full fuel-up has an abnormal drop in efficiency
 */
export function checkRecentAnomaly(logs: FuelLog[]): AnomalyReport | null {
  const fullLogs = logs.filter(l => l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0);
  if (fullLogs.length < 3) {
    return null;
  }

  // The latest full log is index 0 (since logs are sorted descending)
  const latest = fullLogs[0];
  const sameProfileLogs = fullLogs.slice(1).filter(l => l.drivingProfile === latest.drivingProfile);
  const baselineLogs = sameProfileLogs.length >= 2 ? sameProfileLogs : fullLogs.slice(1);

  const sum = baselineLogs.reduce((acc, curr) => acc + (curr.calculatedKmPerLiter || 0), 0);
  const avg = baselineLogs.length > 0 ? sum / baselineLogs.length : 0;

  if (!Number.isFinite(avg) || avg <= 0) {
    return null;
  }

  const drop = (avg - (latest.calculatedKmPerLiter || 0)) / avg;

  if (drop >= 0.15) {
    const dropPercentage = Number((drop * 100).toFixed(1));
    return {
      detected: true,
      dropPercentage,
      recentConsumption: latest.calculatedKmPerLiter || 0,
      historicalAverage: Number(avg.toFixed(2)),
      drivingProfile: latest.drivingProfile,
      recommendations: [
        'Verificar a calibragem de todos os pneus a frio (pressão baixa aumenta até 15% o consumo).',
        'Inspecionar o filtro de ar do motor e velas de ignição.',
        `Atenção à qualidade e procedência do combustível abastecido no posto ${latest.stationName} (${latest.stationBrand}).`,
        'Conferir se o uso de ar-condicionado ou trânsito atípico justificam a variação.',
      ],
    };
  }

  return null;
}

/**
 * Calculates vehicle overall dashboard KPIs
 */
export function calculateDashboardKPIs(logs: FuelLog[], vehicle: Vehicle) {
  const validFullLogs = logs.filter(l => l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0);

  // Overall average km/L
  const totalKmCalculated = validFullLogs.reduce((acc, l) => acc + (l.distanceTraveled || 0), 0);
  const totalLitersForCalculated = validFullLogs.reduce((acc, l) => acc + l.liters, 0);
  const avgKmL = validFullLogs.length > 0
    ? Number((validFullLogs.reduce((acc, l) => acc + (l.calculatedKmPerLiter || 0), 0) / validFullLogs.length).toFixed(2))
    : 0;

  // Average cost per km
  const validCostLogs = validFullLogs.filter(l => l.calculatedCostPerKm && l.calculatedCostPerKm > 0);
  const avgCostPerKm = validCostLogs.length > 0
    ? Number((validCostLogs.reduce((acc, l) => acc + (l.calculatedCostPerKm || 0), 0) / validCostLogs.length).toFixed(2))
    : 0;

  // Total spent in current month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLogs = logs.filter(l => l.date.startsWith(currentYearMonth));
  const currentMonthSpent = monthLogs.reduce((acc, l) => acc + l.totalCost, 0);

  // Estimated remaining autonomy
  // Estimate fuel left in tank based on last fuel-up liters and km driven since
  const safeTankCapacity = Math.max(1, Number(vehicle.tankCapacityLiters) || 50);
  const latestLog = logs.length > 0 ? logs[0] : null;
  let estimatedRemainingKm = 0;
  if (latestLog && avgKmL > 0) {
    const kmDrivenSince = Math.max(0, (Number(vehicle.currentOdometer) || 0) - (Number(latestLog.odometer) || 0));
    const estimatedLitersUsed = kmDrivenSince / avgKmL;
    const latestLiters = Math.max(0, Number(latestLog.liters) || 0);
    const initialLitersInTank = latestLog.isFullTank
      ? safeTankCapacity
      : Math.min(safeTankCapacity, latestLiters > 0 ? latestLiters * 1.2 : safeTankCapacity * 0.5);
    const estimatedLitersLeft = Math.max(0, initialLitersInTank - estimatedLitersUsed);
    estimatedRemainingKm = Math.round(estimatedLitersLeft * avgKmL);
  } else if (avgKmL > 0) {
    estimatedRemainingKm = Math.round((safeTankCapacity * 0.5) * avgKmL);
  }

  // Best and worst efficiency
  const bestKmL = validFullLogs.length > 0
    ? Math.max(...validFullLogs.map(l => l.calculatedKmPerLiter || 0))
    : 0;
  const worstKmL = validFullLogs.length > 0
    ? Math.min(...validFullLogs.map(l => l.calculatedKmPerLiter || 0))
    : 0;

  return {
    avgKmL,
    avgCostPerKm,
    currentMonthSpent,
    estimatedRemainingKm,
    totalLogsCount: logs.length,
    validFullTanksCount: validFullLogs.length,
    bestKmL,
    worstKmL,
  };
}

/**
 * Computes Smart Flex Calculator result using the car's actual historical ratio
 */
export function calculateSmartFlex(
  logs: FuelLog[],
  vehicle: Vehicle,
  etanolPrice: number,
  gasolinaPrice: number
): FlexComparisonResult {
  const etanolLogs = logs.filter(
    l => l.fuelType === 'etanol' && l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0
  );
  const gasolinaLogs = logs.filter(
    l => (l.fuelType === 'gasolina_comum' || l.fuelType === 'gasolina_aditivada') &&
      l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0
  );

  const hasSufficientData = etanolLogs.length >= 1 && gasolinaLogs.length >= 1;

  // Defaults if no history yet
  const defaultAvgEtanol = 8.8;
  const defaultAvgGasolina = 12.5;

  const safeEtanolPrice = Math.max(0, Number(etanolPrice) || 0);
  const safeGasolinaPrice = Math.max(0, Number(gasolinaPrice) || 0);
  const safeTankCapacity = Math.max(1, Number(vehicle.tankCapacityLiters) || 50);

  const carAvgEtanol = etanolLogs.length > 0
    ? Math.max(0.1, Number((etanolLogs.reduce((acc, l) => acc + (l.calculatedKmPerLiter || 0), 0) / etanolLogs.length).toFixed(2)))
    : defaultAvgEtanol;

  const carAvgGasolina = gasolinaLogs.length > 0
    ? Math.max(0.1, Number((gasolinaLogs.reduce((acc, l) => acc + (l.calculatedKmPerLiter || 0), 0) / gasolinaLogs.length).toFixed(2)))
    : defaultAvgGasolina;

  const carRealRatio = Number((carAvgEtanol / carAvgGasolina).toFixed(4));
  const standardRatio = 0.70;

  const etanolCostPerKm = Number((safeEtanolPrice / carAvgEtanol).toFixed(3));
  const gasolinaCostPerKm = Number((safeGasolinaPrice / carAvgGasolina).toFixed(3));

  const recommendedFuel = etanolCostPerKm < gasolinaCostPerKm ? 'etanol' : 'gasolina';
  const savingsPerKm = Math.abs(gasolinaCostPerKm - etanolCostPerKm);

  // Tank capacity savings calculation:
  // How much does it cost to drive 1 full tank range?
  const tankRange = (recommendedFuel === 'etanol' ? carAvgEtanol : carAvgGasolina) * safeTankCapacity;
  const savingsPerTank = Number((savingsPerKm * tankRange).toFixed(2));

  const breakEvenEtanolPrice = Number((safeGasolinaPrice * carRealRatio).toFixed(2));

  return {
    etanolPrice: safeEtanolPrice,
    gasolinaPrice: safeGasolinaPrice,
    standardRatio,
    carRealRatio,
    hasSufficientData,
    carAvgEtanol,
    carAvgGasolina,
    recommendedFuel,
    etanolCostPerKm,
    gasolinaCostPerKm,
    savingsPerKm: Number(savingsPerKm.toFixed(3)),
    savingsPerTank,
    breakEvenEtanolPrice,
  };
}

/**
 * Calculates Gas Station yield & cost ranking
 */
export function calculateStationRankings(logs: FuelLog[]): StationStats[] {
  const stationMap: Record<string, {
    stationName: string;
    stationBrand: string;
    visits: number;
    totalLiters: number;
    totalCost: number;
    validKmLs: number[];
    validCostKms: number[];
  }> = {};

  logs.forEach(l => {
    const key = `${l.stationName}___${l.stationBrand}`.toLowerCase();
    if (!stationMap[key]) {
      stationMap[key] = {
        stationName: l.stationName,
        stationBrand: l.stationBrand,
        visits: 0,
        totalLiters: 0,
        totalCost: 0,
        validKmLs: [],
        validCostKms: [],
      };
    }

    stationMap[key].visits += 1;
    stationMap[key].totalLiters += l.liters;
    stationMap[key].totalCost += l.totalCost;

    if (l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0) {
      stationMap[key].validKmLs.push(l.calculatedKmPerLiter);
    }
    if (l.calculatedCostPerKm && l.calculatedCostPerKm > 0) {
      stationMap[key].validCostKms.push(l.calculatedCostPerKm);
    }
  });

  const stations: StationStats[] = Object.values(stationMap).map(s => {
    const avgKmL = s.validKmLs.length > 0
      ? Number((s.validKmLs.reduce((a, b) => a + b, 0) / s.validKmLs.length).toFixed(2))
      : 0;

    const avgCostKm = s.validCostKms.length > 0
      ? Number((s.validCostKms.reduce((a, b) => a + b, 0) / s.validCostKms.length).toFixed(2))
      : 0;

    let efficiencyRating: 'excelente' | 'bom' | 'regular' | 'ruim' = 'bom';
    if (avgKmL >= 12.5) efficiencyRating = 'excelente';
    else if (avgKmL >= 10.5) efficiencyRating = 'bom';
    else if (avgKmL >= 9.0) efficiencyRating = 'regular';
    else if (avgKmL > 0) efficiencyRating = 'ruim';

    return {
      stationName: s.stationName,
      stationBrand: s.stationBrand,
      visitCount: s.visits,
      totalLiters: Number(s.totalLiters.toFixed(1)),
      totalCost: Number(s.totalCost.toFixed(2)),
      avgKmPerLiter: avgKmL,
      avgCostPerKm: avgCostKm,
      efficiencyRating,
    };
  });

  // Sort by highest average km/L descending, or most visits if tied
  return stations.sort((a, b) => {
    if (b.avgKmPerLiter !== a.avgKmPerLiter) {
      return b.avgKmPerLiter - a.avgKmPerLiter;
    }
    return b.visitCount - a.visitCount;
  });
}

/**
 * Calculates predictive next refuel projection based on historical logs and vehicle tank.
 * Supports 'habito_real' (driver's empirical frequency) and 'limite_tanque' (technical 15% reserve).
 */
export function calculateRefuelProjection(
  logs: FuelLog[],
  vehicle: Vehicle,
  simulatedOdometer?: number,
  simulatedFuelType?: FuelType,
  mode: ProjectionMode = 'habito_real'
): RefuelProjection {
  // 1. Sort logs chronologically
  const sortedLogsAsc = [...logs].sort((a, b) => {
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    const dDiff = (Number.isFinite(tA) ? tA : 0) - (Number.isFinite(tB) ? tB : 0);
    if (dDiff !== 0) return dDiff;
    return (Number(a.odometer) || 0) - (Number(b.odometer) || 0);
  });
  const sortedLogsDesc = [...sortedLogsAsc].reverse();
  const latestLog = sortedLogsDesc[0] || null;

  const lastLogOdometer = latestLog
    ? latestLog.odometer
    : (vehicle.currentOdometer || vehicle.initialOdometer || 0);

  const lastLogDate = latestLog?.date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Elapsed days since the last recorded refueling
  let daysSinceLastLog = 0;
  if (lastLogDate) {
    const dLast = new Date(lastLogDate + 'T00:00:00');
    if (!isNaN(dLast.getTime())) {
      daysSinceLastLog = Math.max(0, Math.floor((today.getTime() - dLast.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  // 2. Historical Habits Analysis (Empirical rhythm between visits)
  const intervalsInDays: number[] = [];
  const kmBetweenFills: number[] = [];
  const litersPerFill: number[] = [];

  for (let i = 1; i < sortedLogsAsc.length; i++) {
    const prev = sortedLogsAsc[i - 1];
    const curr = sortedLogsAsc[i];
    const dPrev = new Date(prev.date + 'T00:00:00');
    const dCurr = new Date(curr.date + 'T00:00:00');
    if (!isNaN(dPrev.getTime()) && !isNaN(dCurr.getTime())) {
      const diffDays = Math.round((dCurr.getTime() - dPrev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 1 && diffDays <= 45) {
        intervalsInDays.push(diffDays);
      }
    }
    const kmDiff = curr.odometer - prev.odometer;
    if (kmDiff >= 50 && kmDiff <= 1500) {
      kmBetweenFills.push(kmDiff);
    }
    if (curr.liters > 0) {
      litersPerFill.push(curr.liters);
    }
  }

  const historicalAvgDaysBetweenFills = intervalsInDays.length > 0
    ? Number((intervalsInDays.reduce((a, b) => a + b, 0) / intervalsInDays.length).toFixed(1))
    : undefined;

  const historicalAvgKmBetweenFills = kmBetweenFills.length > 0
    ? Math.round(kmBetweenFills.reduce((a, b) => a + b, 0) / kmBetweenFills.length)
    : undefined;

  const typicalRefuelLiters = litersPerFill.length > 0
    ? Number((litersPerFill.reduce((a, b) => a + b, 0) / litersPerFill.length).toFixed(1))
    : undefined;

  // 3. Daily Driving Rate (km/dia)
  let dailyKm = 35;
  let daysTracked = 30;

  if (sortedLogsAsc.length >= 2) {
    const firstLog = sortedLogsAsc[0];
    const lastLog = sortedLogsAsc[sortedLogsAsc.length - 1];
    const dFirst = new Date(firstLog.date + 'T00:00:00');
    const dLast = new Date(lastLog.date + 'T00:00:00');
    const totalDays = (!isNaN(dFirst.getTime()) && !isNaN(dLast.getTime()))
      ? Math.max(1, Math.round((dLast.getTime() - dFirst.getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    const totalKm = Math.max(0, lastLog.odometer - firstLog.odometer);

    if (totalDays >= 3 && totalKm > 0) {
      dailyKm = Math.max(8, Math.min(250, Number((totalKm / totalDays).toFixed(1))));
      daysTracked = totalDays;
    }
  } else if (historicalAvgDaysBetweenFills && historicalAvgDaysBetweenFills > 0 && historicalAvgKmBetweenFills) {
    dailyKm = Math.max(1, Number((historicalAvgKmBetweenFills / historicalAvgDaysBetweenFills).toFixed(1)));
  }
  dailyKm = Math.max(1, Number.isFinite(dailyKm) ? dailyKm : 35);

  // 4. Determine Fuel Type & Average km/L
  const fuelTypeUsed: FuelType = simulatedFuelType || (latestLog ? latestLog.fuelType : (vehicle.acceptedFuels[0] || 'gasolina_comum'));

  const logsWithThisFuel = logs.filter(l => l.fuelType === fuelTypeUsed && l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0);
  let avgKmL = 0;
  if (logsWithThisFuel.length > 0) {
    avgKmL = Number((logsWithThisFuel.reduce((sum, l) => sum + (l.calculatedKmPerLiter || 0), 0) / logsWithThisFuel.length).toFixed(2));
  } else {
    const allValidLogs = logs.filter(l => l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0);
    if (allValidLogs.length > 0) {
      const overallAvg = allValidLogs.reduce((sum, l) => sum + (l.calculatedKmPerLiter || 0), 0) / allValidLogs.length;
      if (fuelTypeUsed === 'etanol') {
        avgKmL = Number((overallAvg * 0.72).toFixed(2));
      } else if (fuelTypeUsed.startsWith('gasolina')) {
        avgKmL = Number(overallAvg.toFixed(2));
      } else if (fuelTypeUsed === 'diesel_s10') {
        avgKmL = Number((overallAvg * 1.15).toFixed(2));
      } else {
        avgKmL = Number(overallAvg.toFixed(2));
      }
    } else {
      switch (fuelTypeUsed) {
        case 'etanol': avgKmL = 8.2; break;
        case 'diesel_s10': avgKmL = 13.5; break;
        case 'gnv': avgKmL = 14.0; break;
        case 'gasolina_aditivada':
        case 'gasolina_comum':
        default:
          avgKmL = 11.4; break;
      }
    }
  }

  avgKmL = Math.max(1, Number.isFinite(avgKmL) ? avgKmL : 11.4);

  // 5. Effective Current Odometer & Driven Distance
  let effectiveCurrentOdometer = lastLogOdometer;
  let kmDrivenSinceLastLog = 0;

  if (simulatedOdometer !== undefined) {
    effectiveCurrentOdometer = simulatedOdometer;
    kmDrivenSinceLastLog = Math.max(0, effectiveCurrentOdometer - lastLogOdometer);
  } else if (vehicle.currentOdometer > lastLogOdometer) {
    effectiveCurrentOdometer = vehicle.currentOdometer;
    kmDrivenSinceLastLog = effectiveCurrentOdometer - lastLogOdometer;
  } else {
    // If odometer hasn't been updated manually since last visit, calculate expected km driven by days elapsed
    const estimatedDriven = Math.round(daysSinceLastLog * dailyKm);
    kmDrivenSinceLastLog = estimatedDriven;
    effectiveCurrentOdometer = lastLogOdometer + estimatedDriven;
  }

  // 6. Target Autonomy: Hábito Real vs Limite Técnico do Tanque (85%)
  const tankCapacity = Math.max(1, Number(vehicle.tankCapacityLiters) || 50);
  const fullAutonomyKm = Math.max(1, Math.round(tankCapacity * avgKmL));
  const technicalSafeAutonomyKm = Math.max(1, Math.round(fullAutonomyKm * 0.85));

  let targetCycleKm = technicalSafeAutonomyKm;
  if (mode === 'habito_real' && historicalAvgKmBetweenFills && historicalAvgKmBetweenFills >= 100) {
    targetCycleKm = Math.min(technicalSafeAutonomyKm, historicalAvgKmBetweenFills);
  }

  const safeAutonomyKm = targetCycleKm;
  const targetOdometer = lastLogOdometer + targetCycleKm;
  const remainingKm = Math.max(0, targetOdometer - effectiveCurrentOdometer);

  // 7. Cycle in Days & Projected Target Date Anchored to Last Log Date
  let totalCycleDays = Math.max(1, Math.round(targetCycleKm / dailyKm));
  if (mode === 'habito_real' && historicalAvgDaysBetweenFills && historicalAvgDaysBetweenFills >= 2) {
    totalCycleDays = Math.round(historicalAvgDaysBetweenFills);
  }

  let projectedDate: Date;
  let daysRemaining: number;

  const parsedLastLogDate = lastLogDate ? new Date(lastLogDate + 'T00:00:00') : null;
  if (parsedLastLogDate && !isNaN(parsedLastLogDate.getTime())) {
    projectedDate = parsedLastLogDate;
    projectedDate.setDate(projectedDate.getDate() + totalCycleDays);

    // Days remaining from TODAY
    const diffMs = projectedDate.getTime() - today.getTime();
    daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
  } else {
    daysRemaining = Math.max(1, Math.round(remainingKm / dailyKm));
    projectedDate = new Date(today);
    projectedDate.setDate(projectedDate.getDate() + daysRemaining);
  }

  const isDue = daysRemaining <= 0 || effectiveCurrentOdometer >= targetOdometer || remainingKm <= 0;
  if (isDue) {
    daysRemaining = 0;
  }

  // Formatting date in Portuguese
  let projectedDateFormatted = '';
  if (isDue) {
    projectedDateFormatted = 'Janela Atingida! (Abastecer Hoje)';
  } else if (daysRemaining === 1) {
    projectedDateFormatted = 'Amanhã';
  } else if (daysRemaining === 2) {
    projectedDateFormatted = 'Em 2 dias';
  } else {
    const rawWeekday = projectedDate.toLocaleDateString('pt-BR', { weekday: 'short' });
    const capitalizedWeekday = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1).replace('.', '');
    const dayMonth = projectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    projectedDateFormatted = `${capitalizedWeekday}, ${dayMonth} (em ~${daysRemaining} dias)`;
  }

  // 8. Progress Percentage Consumed
  const progressPct = targetCycleKm > 0
    ? Math.min(100, Math.round((kmDrivenSinceLastLog / targetCycleKm) * 100))
    : 100;

  let progressLevel: 'normal' | 'warning' | 'urgent' = 'normal';
  if (isDue || progressPct >= 90) {
    progressLevel = 'urgent';
  } else if (progressPct >= 70) {
    progressLevel = 'warning';
  }

  // 9. Fuel Price per Liter
  const matchingPriceLog = sortedLogsDesc.find(l => l.fuelType === fuelTypeUsed && l.pricePerLiter > 0);
  let estimatedPricePerLiter = matchingPriceLog ? matchingPriceLog.pricePerLiter : (latestLog ? latestLog.pricePerLiter : 0);
  if (!estimatedPricePerLiter || estimatedPricePerLiter <= 0) {
    switch (fuelTypeUsed) {
      case 'etanol': estimatedPricePerLiter = 3.99; break;
      case 'diesel_s10': estimatedPricePerLiter = 5.95; break;
      case 'gnv': estimatedPricePerLiter = 4.49; break;
      case 'gasolina_aditivada': estimatedPricePerLiter = 6.19; break;
      case 'gasolina_comum':
      default:
        estimatedPricePerLiter = 5.89; break;
    }
  }

  // 10. Liters to Fill & Estimated Cost
  let estimatedLitersToFill = 0;
  if (mode === 'habito_real' && typicalRefuelLiters && typicalRefuelLiters > 5) {
    estimatedLitersToFill = Number(Math.min(tankCapacity, typicalRefuelLiters).toFixed(1));
  } else {
    const consumedLiters = kmDrivenSinceLastLog > 0 ? (kmDrivenSinceLastLog / avgKmL) : (tankCapacity * 0.85);
    estimatedLitersToFill = Number(Math.min(tankCapacity, Math.max(10, consumedLiters)).toFixed(1));
  }
  const estimatedCost = Number((estimatedLitersToFill * estimatedPricePerLiter).toFixed(2));

  // 11. Best Station Tip
  const stationRankings = calculateStationRankings(logs);
  let bestStationTip: RefuelProjection['bestStationTip'] = undefined;
  if (stationRankings.length > 0) {
    const topStation = stationRankings[0];
    if (topStation && topStation.avgKmPerLiter > avgKmL && avgKmL > 0) {
      const pctBetter = Math.round(((topStation.avgKmPerLiter - avgKmL) / avgKmL) * 100);
      const estimatedSavings = Number(((tankCapacity * (pctBetter / 100)) * (estimatedPricePerLiter * 0.35)).toFixed(0));

      bestStationTip = {
        stationName: topStation.stationName,
        stationBrand: topStation.stationBrand,
        avgKmL: topStation.avgKmPerLiter,
        estimatedSavings: estimatedSavings > 5 ? estimatedSavings : 18,
        tipMessage: `No ${topStation.stationName} (${topStation.stationBrand}), seu veículo rende ${topStation.avgKmPerLiter} km/L (+${pctBetter}% vs média). Economia estimada de ~R$ ${estimatedSavings > 5 ? estimatedSavings : 18} por tanque.`
      };
    } else if (topStation) {
      bestStationTip = {
        stationName: topStation.stationName,
        stationBrand: topStation.stationBrand,
        avgKmL: topStation.avgKmPerLiter,
        tipMessage: `Posto com maior histórico: ${topStation.stationName} (${topStation.visitCount} abastecimentos). Eficiência: ${topStation.efficiencyRating.toUpperCase()}.`
      };
    }
  }

  return {
    dailyKm,
    daysTracked,
    lastLogOdometer,
    lastLogDate,
    daysSinceLastLog,
    currentOdometer: effectiveCurrentOdometer,
    kmDrivenSinceLastLog,
    tankCapacity,
    fuelTypeUsed,
    avgKmL,
    fullAutonomyKm,
    safeAutonomyKm,
    targetOdometer,
    remainingKm,
    isDue,
    daysRemaining,
    projectedDate,
    projectedDateFormatted,
    progressPct,
    progressLevel,
    estimatedLitersToFill,
    estimatedPricePerLiter,
    estimatedCost,
    projectionMode: mode,
    historicalAvgDaysBetweenFills,
    historicalAvgKmBetweenFills,
    typicalRefuelLiters,
    bestStationTip,
  };
}

/**
 * Evaluates dual-criteria tire calibration status:
 * 1. Time criterion: days elapsed vs configured interval (e.g. 15 days)
 * 2. Operational criterion: refuels performed without calibration (e.g. every 2 refuels)
 */
export function calculateTireCalibrationStatus(
  calibrations: TireCalibrationLog[],
  logs: FuelLog[],
  vehicle: Vehicle
): TireCalibrationStatus {
  const frontPsi = vehicle.frontTirePsi || 32;
  const rearPsi = vehicle.rearTirePsi || 30;
  const maxDays = vehicle.tireCalibrationDaysInterval || 15;
  const maxFills = vehicle.tireCalibrationFillsInterval || 2;

  // Find vehicle calibrations sorted by date descending
  const vehicleCalibrations = calibrations
    .filter(c => c.vehicleId === vehicle.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latestCalibration = vehicleCalibrations[0] || null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysSinceLast = 0;
  let fillsSinceLast = 0;
  let lastCalibrationDate: string | undefined = undefined;
  let lastCalibrationOdometer: number | undefined = undefined;

  const vehicleLogs = logs
    .filter(l => l.vehicleId === vehicle.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (latestCalibration) {
    lastCalibrationDate = latestCalibration.date;
    lastCalibrationOdometer = latestCalibration.odometer;
    const dCalib = new Date(latestCalibration.date + 'T00:00:00');
    daysSinceLast = Math.max(0, Math.floor((today.getTime() - dCalib.getTime()) / (1000 * 60 * 60 * 24)));

    // Count fills that occurred after the calibration date or odometer
    fillsSinceLast = vehicleLogs.filter(l => {
      const dLog = new Date(l.date + 'T00:00:00');
      return dLog.getTime() > dCalib.getTime() || l.odometer > latestCalibration.odometer;
    }).length;
  } else {
    // If no calibration is on record, look at vehicle's logs
    if (vehicleLogs.length > 0) {
      const oldestLog = vehicleLogs[vehicleLogs.length - 1];
      const dOldest = new Date(oldestLog.date + 'T00:00:00');
      daysSinceLast = Math.min(20, Math.max(8, Math.floor((today.getTime() - dOldest.getTime()) / (1000 * 60 * 60 * 24))));
      fillsSinceLast = Math.min(maxFills, vehicleLogs.length);
    } else {
      daysSinceLast = 0;
      fillsSinceLast = 0;
    }
  }

  const daysRemaining = Math.max(0, maxDays - daysSinceLast);

  // Status Classification:
  // - Urgent: > 15 days elapsed OR >= 2 refuels without calibration
  // - Warning: 10 to 15 days elapsed OR 1 refuel performed
  // - OK: < 10 days AND 0 refuels pending
  let status: 'ok' | 'warning' | 'urgent' = 'ok';
  let badgeText = 'Calibragem em dia';
  let explanationText = '';

  if (daysSinceLast > maxDays || fillsSinceLast >= maxFills) {
    status = 'urgent';
    if (daysSinceLast > maxDays && fillsSinceLast >= maxFills) {
      badgeText = `Vencido há ${daysSinceLast - maxDays} dias (${fillsSinceLast} abastecimentos)`;
      explanationText = `Calibragem urgente: ${daysSinceLast} dias decorridos e ${fillsSinceLast} paradas sem calibrar`;
    } else if (daysSinceLast > maxDays) {
      badgeText = `Calibragem pendente há ${daysSinceLast - maxDays} dias`;
      explanationText = `Prazo de ${maxDays} dias ultrapassado (${daysSinceLast} dias decorridos)`;
    } else {
      badgeText = `Calibragem pendente (${fillsSinceLast} abastecimentos)`;
      explanationText = `Limite de ${maxFills} abastecimentos sem calibrar atingido`;
    }
  } else if ((daysSinceLast >= 10 && daysSinceLast <= maxDays) || fillsSinceLast === 1) {
    status = 'warning';
    badgeText = 'Calibrar no próximo posto';
    explanationText = `Atenção: ${daysSinceLast} dias desde a última checagem · ${fillsSinceLast} abastecimento recente sem calibrar`;
  } else {
    status = 'ok';
    badgeText = 'Calibragem em dia';
    explanationText = lastCalibrationDate
      ? `Última checagem há ${daysSinceLast} ${daysSinceLast === 1 ? 'dia' : 'dias'} · Nenhum abastecimento pendente`
      : 'Pressão recomendada configurada e pronta para acompanhamento';
  }

  return {
    status,
    daysSinceLast,
    fillsSinceLast,
    lastCalibrationDate,
    lastCalibrationOdometer,
    badgeText,
    explanationText,
    frontPsi,
    rearPsi,
    daysRemaining,
  };
}

/**
 * Calculates geodesic distance between two latitude/longitude points in kilometers
 * using the Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Searches a list of stations to find any station within a given radius (default 300 meters).
 * Returns the closest station found or null if none is within the threshold.
 */
export function findNearbyStation(
  latitude: number,
  longitude: number,
  stations: GasStation[],
  thresholdKm = 0.300 // 300 meters
): { station: GasStation; distanceMeters: number } | null {
  if (!stations || stations.length === 0) return null;

  let closest: GasStation | null = null;
  let minDistanceKm = Infinity;

  for (const st of stations) {
    if (st.latitude !== undefined && st.longitude !== undefined) {
      const distKm = calculateHaversineDistanceKm(latitude, longitude, st.latitude, st.longitude);
      if (distKm <= thresholdKm && distKm < minDistanceKm) {
        minDistanceKm = distKm;
        closest = st;
      }
    }
  }

  if (closest && minDistanceKm <= thresholdKm) {
    return {
      station: closest,
      distanceMeters: Math.round(minDistanceKm * 1000),
    };
  }

  return null;
}

/**
 * Simulates trip fuel consumption, side-by-side fuel costs (Gasolina vs Etanol / Diesel),
 * highway safe autonomy, necessary refueling stops (considering a 15% reserve),
 * and total trip expenditure including tolls.
 */
export function simulateTripCost(
  vehicle: Vehicle,
  logs: FuelLog[],
  input: TripSimulationInput
): TripSimulationResult {
  const baseDistance = Math.max(1, Number(input.distanceKm) || 1);
  const totalDistanceKm = input.isRoundTrip ? baseDistance * 2 : baseDistance;
  const safeTankCapacity = Math.max(1, Number(vehicle.tankCapacityLiters) || 50);

  // Filter logs for this vehicle with calculated metrics
  const vehicleLogs = logs.filter(l => l.vehicleId === vehicle.id && l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0);

  // Group by driving profile
  const highwayLogs = vehicleLogs.filter(l => l.drivingProfile === 'estrada');
  const cityLogs = vehicleLogs.filter(l => l.drivingProfile === 'cidade');
  const mixedLogs = vehicleLogs.filter(l => l.drivingProfile === 'misto');

  // Baseline vehicle averages
  const avgOverallKmL = vehicleLogs.length > 0
    ? vehicleLogs.reduce((acc, l) => acc + (l.calculatedKmPerLiter || 0), 0) / vehicleLogs.length
    : 11.5;

  const avgHighwayKmL = highwayLogs.length > 0
    ? highwayLogs.reduce((acc, l) => acc + (l.calculatedKmPerLiter || 0), 0) / highwayLogs.length
    : avgOverallKmL * 1.15; // Realistic ~15% boost on highway if no specific logs

  const avgCityKmL = cityLogs.length > 0
    ? cityLogs.reduce((acc, l) => acc + (l.calculatedKmPerLiter || 0), 0) / cityLogs.length
    : avgOverallKmL * 0.90;

  // Specific fuel averages
  const gasolinaLogs = vehicleLogs.filter(l => l.fuelType === 'gasolina_comum' || l.fuelType === 'gasolina_aditivada');
  const etanolLogs = vehicleLogs.filter(l => l.fuelType === 'etanol');
  const dieselLogs = vehicleLogs.filter(l => l.fuelType === 'diesel_s10');

  const hasGasolina = vehicle.acceptedFuels.some(f => f.includes('gasolina'));
  const hasEtanol = vehicle.acceptedFuels.includes('etanol');
  const hasDiesel = vehicle.acceptedFuels.includes('diesel_s10');

  // Baseline Gasolina km/L for Highway / Mixed
  let baseGasolinaHighwayKmL = 12.5;
  if (gasolinaLogs.length > 0) {
    const gasHighway = gasolinaLogs.filter(l => l.drivingProfile === 'estrada');
    if (gasHighway.length > 0) {
      baseGasolinaHighwayKmL = gasHighway.reduce((a, b) => a + (b.calculatedKmPerLiter || 0), 0) / gasHighway.length;
    } else {
      const gasAll = gasolinaLogs.reduce((a, b) => a + (b.calculatedKmPerLiter || 0), 0) / gasolinaLogs.length;
      baseGasolinaHighwayKmL = gasAll * 1.15;
    }
  } else if (hasGasolina) {
    baseGasolinaHighwayKmL = avgHighwayKmL;
  }

  // Baseline Etanol km/L
  let baseEtanolHighwayKmL = baseGasolinaHighwayKmL * 0.72; // Default Brazilian 70-73% flex ratio
  if (etanolLogs.length > 0) {
    const etaHighway = etanolLogs.filter(l => l.drivingProfile === 'estrada');
    if (etaHighway.length > 0) {
      baseEtanolHighwayKmL = etaHighway.reduce((a, b) => a + (b.calculatedKmPerLiter || 0), 0) / etaHighway.length;
    } else {
      const etaAll = etanolLogs.reduce((a, b) => a + (b.calculatedKmPerLiter || 0), 0) / etanolLogs.length;
      baseEtanolHighwayKmL = etaAll * 1.15;
    }
  }

  // Baseline Diesel km/L
  let baseDieselHighwayKmL = 13.0;
  if (dieselLogs.length > 0) {
    baseDieselHighwayKmL = dieselLogs.reduce((a, b) => a + (b.calculatedKmPerLiter || 0), 0) / dieselLogs.length;
  }

  // Determine effective km/L based on selected profile
  let gasolinaKmL = baseGasolinaHighwayKmL;
  let etanolKmL = baseEtanolHighwayKmL;
  let dieselKmL = baseDieselHighwayKmL;

  if (input.routeProfile === 'misto') {
    // 70% Highway + 30% City mix
    gasolinaKmL = Number((baseGasolinaHighwayKmL * 0.70 + (avgCityKmL > 0 ? avgCityKmL : baseGasolinaHighwayKmL * 0.8) * 0.30).toFixed(2));
    etanolKmL = Number((baseEtanolHighwayKmL * 0.70 + (baseEtanolHighwayKmL * 0.75) * 0.30).toFixed(2));
    dieselKmL = Number((baseDieselHighwayKmL * 0.85).toFixed(2));
  } else if (input.routeProfile === 'personalizado' && input.customKmL && input.customKmL > 0) {
    gasolinaKmL = Number(input.customKmL.toFixed(2));
    // Scale etanol proportionally based on known flex ratio
    const ratio = baseGasolinaHighwayKmL > 0 ? baseEtanolHighwayKmL / baseGasolinaHighwayKmL : 0.72;
    etanolKmL = Number((input.customKmL * ratio).toFixed(2));
    dieselKmL = Number(input.customKmL.toFixed(2));
  }

  // Primary effective km/L for autonomy calculation
  const rawPrimaryKmL = hasGasolina ? gasolinaKmL : (hasDiesel ? dieselKmL : (etanolKmL || 10));
  const primaryKmL = Math.max(1, Number.isFinite(rawPrimaryKmL) ? rawPrimaryKmL : 10);

  const safeGasPrice = Math.max(0, Number(input.gasolinaPrice) || 0);
  const safeEtaPrice = Math.max(0, Number(input.etanolPrice) || 0);
  const safeDieselPrice = Math.max(0, Number(input.dieselPrice) || 0);

  // Fuel computations
  const gasolinaLitersNeeded = Number((totalDistanceKm / Math.max(1, gasolinaKmL)).toFixed(2));
  const gasolinaTotalCost = Number((gasolinaLitersNeeded * safeGasPrice).toFixed(2));
  const gasolinaCostPerKm = Number((gasolinaTotalCost / totalDistanceKm).toFixed(3));

  const etanolLitersNeeded = Number((totalDistanceKm / Math.max(1, etanolKmL)).toFixed(2));
  const etanolTotalCost = Number((etanolLitersNeeded * safeEtaPrice).toFixed(2));
  const etanolCostPerKm = Number((etanolTotalCost / totalDistanceKm).toFixed(3));

  const dieselLitersNeeded = hasDiesel ? Number((totalDistanceKm / Math.max(1, dieselKmL)).toFixed(2)) : undefined;
  const dieselTotalCost = (hasDiesel && safeDieselPrice > 0) ? Number(((dieselLitersNeeded || 0) * safeDieselPrice).toFixed(2)) : undefined;
  const dieselCostPerKm = dieselTotalCost !== undefined ? Number((dieselTotalCost / totalDistanceKm).toFixed(3)) : undefined;

  // Best fuel comparison
  let betterFuel: 'gasolina' | 'etanol' | 'diesel' | 'none' = 'none';
  let savingsAmount = 0;
  let savingsPercentage = 0;
  let savingsPerKm = 0;

  if (hasGasolina && hasEtanol) {
    if (etanolTotalCost < gasolinaTotalCost) {
      betterFuel = 'etanol';
      savingsAmount = Number((gasolinaTotalCost - etanolTotalCost).toFixed(2));
      savingsPercentage = gasolinaTotalCost > 0
        ? Number(((savingsAmount / gasolinaTotalCost) * 100).toFixed(1))
        : 0;
      savingsPerKm = Number((gasolinaCostPerKm - etanolCostPerKm).toFixed(3));
    } else {
      betterFuel = 'gasolina';
      savingsAmount = Number((etanolTotalCost - gasolinaTotalCost).toFixed(2));
      savingsPercentage = etanolTotalCost > 0
        ? Number(((savingsAmount / etanolTotalCost) * 100).toFixed(1))
        : 0;
      savingsPerKm = Number((etanolCostPerKm - gasolinaCostPerKm).toFixed(3));
    }
  } else if (hasDiesel) {
    betterFuel = 'diesel';
  } else if (hasGasolina) {
    betterFuel = 'gasolina';
  } else if (hasEtanol) {
    betterFuel = 'etanol';
  }

  // Starting tank calculation
  const tankLevelRatios: Record<StartingTankLevel, number> = {
    full: 1.0,
    three_quarters: 0.75,
    half: 0.50,
    one_quarter: 0.25,
    reserve: 0.12,
  };

  const departureRatio = tankLevelRatios[input.startingTankLevel] ?? 1.0;
  const departureLiters = Number((safeTankCapacity * departureRatio).toFixed(1));
  const departureAutonomyKm = Math.round(departureLiters * primaryKmL);

  // Safe reserve is 15% of tank capacity
  const reserveLiters = safeTankCapacity * 0.15;
  const usableDepartureLiters = Math.max(0, departureLiters - reserveLiters);
  const safeDepartureAutonomyKm = Math.round(usableDepartureLiters * primaryKmL);

  const fullTankAutonomyKm = Math.max(1, Math.round(safeTankCapacity * primaryKmL));
  const safeTankAutonomyKm = Math.max(1, Math.round(safeTankCapacity * 0.85 * primaryKmL));

  // Stop Planning
  const isDepartureFuelSufficient = safeDepartureAutonomyKm >= totalDistanceKm;
  const stops: RefuelStopPlan[] = [];

  if (!isDepartureFuelSufficient && safeTankAutonomyKm > 0) {
    // We need to stop before the initial departure fuel reaches safety reserve
    let currentDistanceCovered = safeDepartureAutonomyKm;
    let stopCount = 1;

    while (currentDistanceCovered < totalDistanceKm && stopCount <= 10) {
      const remainingTotal = totalDistanceKm - currentDistanceCovered;
      // At this stop, fill up safe tank capacity or just what's needed to finish
      const litersToPump = Math.min(
        safeTankCapacity * 0.85,
        Number((remainingTotal / primaryKmL).toFixed(1)) + 5 // plus 5L safety buffer
      );

      const fuelChosenPrice = betterFuel === 'etanol' ? safeEtaPrice : safeGasPrice;
      const fuelTypeChosen: FuelType = betterFuel === 'etanol' ? 'etanol' : 'gasolina_comum';

      stops.push({
        stopNumber: stopCount,
        atDistanceKm: Math.round(currentDistanceCovered),
        recommendedOdometer: Math.round((Number(vehicle.currentOdometer) || 0) + currentDistanceCovered),
        litersToFill: Number(litersToPump.toFixed(1)),
        estimatedCost: Number((litersToPump * fuelChosenPrice).toFixed(2)),
        fuelType: fuelTypeChosen,
        tip: stopCount === 1
          ? `Primeira parada preventiva sugerida no km ${Math.round(currentDistanceCovered)} antes de entrar na reserva (15%).`
          : `Parada #${stopCount} para completar o tanque e garantir margem segura até o destino.`,
      });

      // Next stop after another safe tank interval
      currentDistanceCovered += safeTankAutonomyKm;
      stopCount++;
    }
  }

  const tollCost = Number(Math.max(0, input.tollCost || 0).toFixed(2));
  const primaryFuelCost = betterFuel === 'etanol' ? etanolTotalCost : (hasDiesel && dieselTotalCost !== undefined ? dieselTotalCost : gasolinaTotalCost);
  const grandTotalCost = Number((primaryFuelCost + tollCost).toFixed(2));
  const costPerKm = Number((grandTotalCost / totalDistanceKm).toFixed(3));

  return {
    totalDistanceKm,
    effectiveKmL: Number(primaryKmL.toFixed(2)),
    totalLitersNeeded: betterFuel === 'etanol' ? etanolLitersNeeded : (dieselLitersNeeded || gasolinaLitersNeeded),
    isGasolinaAvailable: hasGasolina,
    isEtanolAvailable: hasEtanol,
    isDieselAvailable: hasDiesel,

    gasolinaKmL,
    gasolinaLitersNeeded,
    gasolinaTotalCost,
    gasolinaCostPerKm,

    etanolKmL,
    etanolLitersNeeded,
    etanolTotalCost,
    etanolCostPerKm,

    dieselKmL,
    dieselLitersNeeded,
    dieselTotalCost,
    dieselCostPerKm,

    betterFuel,
    savingsAmount,
    savingsPercentage,
    savingsPerKm,

    departureLiters,
    departureAutonomyKm,
    isDepartureFuelSufficient,

    fullTankAutonomyKm,
    safeTankAutonomyKm,
    stopsNeeded: stops.length,
    stops,

    tollCost,
    grandTotalCost,
    costPerKm,
  };
}

