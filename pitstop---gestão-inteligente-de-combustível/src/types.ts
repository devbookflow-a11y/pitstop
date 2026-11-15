export type FuelType = 'gasolina_comum' | 'gasolina_aditivada' | 'etanol' | 'diesel_s10' | 'gnv';

export type DrivingProfile = 'cidade' | 'estrada' | 'misto';

export interface Vehicle {
  id: string;
  name: string;
  model: string;
  year: number;
  plate: string;
  initialOdometer: number;
  currentOdometer: number;
  tankCapacityLiters: number;
  acceptedFuels: FuelType[];
  color: string;
  isDefault?: boolean;
  frontTirePsi?: number;
  rearTirePsi?: number;
  tireCalibrationDaysInterval?: number;
  tireCalibrationFillsInterval?: number;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string; // ISO date YYYY-MM-DD
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelType: FuelType;
  isFullTank: boolean;
  drivingProfile: DrivingProfile;
  stationName: string;
  stationBrand: string; // 'Shell' | 'Ipiranga' | 'Petrobras' | 'Ale' | 'Outro'
  stationId?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  
  // Computed values
  calculatedKmPerLiter?: number | null; // null if partial or first full tank
  calculatedCostPerKm?: number | null;
  distanceTraveled?: number | null;
  isAnomaly?: boolean; // if consumption dropped > 15% vs historical
}

export interface GasStation {
  id: string;
  name: string;
  brand: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceItem {
  id: string;
  vehicleId: string;
  title: string;
  intervalKm: number;
  lastDoneOdometer: number;
  lastDoneDate: string;
  cost?: number;
  category: 'oleo' | 'pneus' | 'filtros' | 'freios' | 'ignicao' | 'correias' | 'geral';
  notes?: string;
}

export interface StationStats {
  stationName: string;
  stationBrand: string;
  visitCount: number;
  totalLiters: number;
  totalCost: number;
  avgKmPerLiter: number;
  avgCostPerKm: number;
  efficiencyRating: 'excelente' | 'bom' | 'regular' | 'ruim';
}

export interface FlexComparisonResult {
  etanolPrice: number;
  gasolinaPrice: number;
  standardRatio: number; // 0.70
  carRealRatio: number; // calculated from car's history (avg etanol / avg gasolina)
  hasSufficientData: boolean;
  carAvgEtanol: number;
  carAvgGasolina: number;
  recommendedFuel: 'etanol' | 'gasolina';
  etanolCostPerKm: number;
  gasolinaCostPerKm: number;
  savingsPerKm: number;
  savingsPerTank: number; // based on vehicle tank capacity
  breakEvenEtanolPrice: number;
}

export interface AnomalyReport {
  detected: boolean;
  dropPercentage: number;
  recentConsumption: number;
  historicalAverage: number;
  drivingProfile: DrivingProfile;
  recommendations: string[];
}

export type ExpenseCategory =
  | 'ipva_impostos'
  | 'seguro'
  | 'licenciamento_taxas'
  | 'estacionamento_pedagio'
  | 'lavagem_estetica'
  | 'multas'
  | 'outros';

export type ExpenseRecurrence = 'unica' | 'mensal' | 'anual';

export interface ExtraExpense {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number; // R$
  odometer?: number; // optional reference odometer
  recurrence?: ExpenseRecurrence;
  notes?: string;
}

export type ProjectionMode = 'habito_real' | 'limite_tanque';

export interface RefuelProjection {
  dailyKm: number;
  daysTracked: number;
  lastLogOdometer: number;
  lastLogDate?: string;
  daysSinceLastLog: number;
  currentOdometer: number;
  kmDrivenSinceLastLog: number;
  tankCapacity: number;
  fuelTypeUsed: FuelType;
  avgKmL: number;
  fullAutonomyKm: number;
  safeAutonomyKm: number;
  targetOdometer: number;
  remainingKm: number;
  isDue: boolean;
  daysRemaining: number;
  projectedDate: Date;
  projectedDateFormatted: string;
  progressPct: number;
  progressLevel: 'normal' | 'warning' | 'urgent';
  estimatedLitersToFill: number;
  estimatedPricePerLiter: number;
  estimatedCost: number;
  projectionMode: ProjectionMode;
  historicalAvgDaysBetweenFills?: number;
  historicalAvgKmBetweenFills?: number;
  typicalRefuelLiters?: number;
  bestStationTip?: {
    stationName: string;
    stationBrand: string;
    avgKmL: number;
    priceDiffPerLiter?: number;
    estimatedSavings?: number;
    tipMessage: string;
  };
}

export interface TireCalibrationLog {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  frontPsi?: number;
  rearPsi?: number;
  notes?: string;
}

export interface TireCalibrationStatus {
  status: 'ok' | 'warning' | 'urgent';
  daysSinceLast: number;
  fillsSinceLast: number;
  lastCalibrationDate?: string;
  lastCalibrationOdometer?: number;
  badgeText: string;
  explanationText: string;
  frontPsi: number;
  rearPsi: number;
  daysRemaining: number;
}

export interface BackupData {
  version: string;
  exportDate: string;
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceItems: MaintenanceItem[];
  extraExpenses?: ExtraExpense[];
  tireCalibrations?: TireCalibrationLog[];
  stations?: GasStation[];
}

export type RouteProfile = 'estrada' | 'misto' | 'personalizado';
export type StartingTankLevel = 'full' | 'three_quarters' | 'half' | 'one_quarter' | 'reserve';

export interface TripSimulationInput {
  distanceKm: number;
  isRoundTrip: boolean;
  routeProfile: RouteProfile;
  customKmL?: number;
  startingTankLevel: StartingTankLevel;
  gasolinaPrice: number;
  etanolPrice: number;
  dieselPrice?: number;
  tollCost?: number;
}

export interface RefuelStopPlan {
  stopNumber: number;
  atDistanceKm: number;
  recommendedOdometer: number;
  litersToFill: number;
  estimatedCost: number;
  fuelType: FuelType;
  tip: string;
}

export interface TripSimulationResult {
  totalDistanceKm: number;
  effectiveKmL: number;
  totalLitersNeeded: number;
  isGasolinaAvailable: boolean;
  isEtanolAvailable: boolean;
  isDieselAvailable: boolean;

  // Comparison (Gasolina vs Etanol)
  gasolinaKmL: number;
  gasolinaLitersNeeded: number;
  gasolinaTotalCost: number;
  gasolinaCostPerKm: number;

  etanolKmL: number;
  etanolLitersNeeded: number;
  etanolTotalCost: number;
  etanolCostPerKm: number;

  dieselKmL?: number;
  dieselLitersNeeded?: number;
  dieselTotalCost?: number;
  dieselCostPerKm?: number;

  betterFuel: 'gasolina' | 'etanol' | 'diesel' | 'none';
  savingsAmount: number;
  savingsPercentage: number;
  savingsPerKm: number;

  // Tank & Departure
  departureLiters: number;
  departureAutonomyKm: number;
  isDepartureFuelSufficient: boolean;

  // Autonomy & Stops
  fullTankAutonomyKm: number;
  safeTankAutonomyKm: number; // 85% of full tank (15% reserve)
  stopsNeeded: number;
  stops: RefuelStopPlan[];

  // Trip Total with Tolls
  tollCost: number;
  grandTotalCost: number;
  costPerKm: number;
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'blocked';
export type SubscriptionPlan = 'free' | 'pro_monthly' | 'pro_annual' | 'lifetime';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  avatar?: string;
  dataCriacao: string;
  isGuest?: boolean;
  tourConcluido?: boolean;
  role: UserRole;
  status: UserStatus;
  plan: SubscriptionPlan;
  planExpiresAt?: string | null;
  lastLoginAt?: string;
}

export interface AdminUserSummary extends AuthUser {
  vehicleCount: number;
  fuelLogCount: number;
  maintenanceCount: number;
  expenseCount: number;
  calibrationCount: number;
  stationCount: number;
  totalLiters: number;
}

export type GlobalAnnouncementType = 'info' | 'news' | 'warning';

export interface GlobalAnnouncement {
  id: string;
  title: string;
  message: string;
  type: GlobalAnnouncementType;
  active: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface MaintenanceModeConfig {
  enabled: boolean;
  message: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface SystemConfig {
  announcement: GlobalAnnouncement;
  maintenance: MaintenanceModeConfig;
}

export interface SaasGlobalBackup {
  versao: string;
  data_exportacao: string;
  tipo: 'global' | 'usuario';
  usuario_alvo?: {
    id: string;
    nome: string;
    email: string;
  };
  usuarios: AuthUser[];
  registros: {
    veiculos: Array<Vehicle & { user_id: string }>;
    abastecimentos: Array<FuelLog & { user_id: string }>;
    postos: Array<GasStation & { user_id: string }>;
    manutencoes: Array<MaintenanceItem & { user_id: string }>;
    despesas_extras: Array<ExtraExpense & { user_id: string }>;
    calibragens: Array<TireCalibrationLog & { user_id: string }>;
  };
}

export interface AppSettings {
  distanceUnit: 'km';
  volumeUnit: 'L';
  consumptionUnit: 'km/L';
  currency: 'BRL';
  alertTireCalibration: boolean;
  alertLowFuel: boolean;
  alertPreventiveMaintenance: boolean;
  alertMechanicalAnomaly: boolean;
}

export interface AppNotification {
  id: string;
  type: 'tire' | 'fuel' | 'maintenance' | 'anomaly';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  date: string;
  read: boolean;
  targetTab?: 'dashboard' | 'road' | 'flex' | 'reports' | 'garage' | 'admin';
  targetAction?: string;
}
