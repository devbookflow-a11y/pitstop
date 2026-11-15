import {
  Vehicle,
  FuelLog,
  MaintenanceItem,
  ExtraExpense,
  BackupData,
  TireCalibrationLog,
  GasStation,
  AuthUser,
  AppSettings,
} from '../types';

const STORAGE_KEYS = {
  VEHICLES: 'pitstop_vehicles_v1',
  FUEL_LOGS: 'pitstop_fuel_logs_v1',
  MAINTENANCE: 'pitstop_maintenance_v1',
  EXTRA_EXPENSES: 'pitstop_extra_expenses_v1',
  TIRE_CALIBRATIONS: 'pitstop_tire_calibrations_v1',
  STATIONS: 'pitstop_stations_v1',
  ACTIVE_VEHICLE_ID: 'pitstop_active_vehicle_id_v1',
  THEME: 'pitstop_theme_v1',
  AUTH_USER: 'pitstop_auth_user_v1',
  REGISTERED_USERS: 'pitstop_registered_users_v1',
  SETTINGS: 'pitstop_settings_v1',
  READ_NOTIFICATIONS: 'pitstop_read_notifications_v1',
};

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh_civic_01',
    name: 'Honda Civic Touring',
    model: '1.5 Turbo VTEC',
    year: 2022,
    plate: 'BRA-2E19',
    initialOdometer: 42000,
    currentOdometer: 45860,
    tankCapacityLiters: 56,
    acceptedFuels: ['gasolina_comum', 'gasolina_aditivada', 'etanol'],
    color: '#3B82F6', // Blue
    isDefault: true,
    frontTirePsi: 32,
    rearTirePsi: 30,
    tireCalibrationDaysInterval: 15,
    tireCalibrationFillsInterval: 2,
  },
  {
    id: 'veh_mt07_02',
    name: 'Yamaha MT-07',
    model: 'ABS 689cc',
    year: 2023,
    plate: 'SPM-7007',
    initialOdometer: 11200,
    currentOdometer: 13450,
    tankCapacityLiters: 14,
    acceptedFuels: ['gasolina_comum', 'gasolina_aditivada'],
    color: '#10B981', // Emerald
    isDefault: false,
    frontTirePsi: 33,
    rearTirePsi: 36,
    tireCalibrationDaysInterval: 15,
    tireCalibrationFillsInterval: 2,
  },
];

export const INITIAL_FUEL_LOGS: FuelLog[] = [
  {
    id: 'log_01',
    vehicleId: 'veh_civic_01',
    date: '2026-08-05',
    odometer: 42000,
    liters: 50.0,
    pricePerLiter: 5.79,
    totalCost: 289.50,
    fuelType: 'gasolina_comum',
    isFullTank: true,
    drivingProfile: 'misto',
    stationName: 'Posto Estrela da Rodovia',
    stationBrand: 'Petrobras',
    latitude: -23.5615,
    longitude: -46.6559,
    notes: 'Primeiro abastecimento completo para calibrar o sistema.',
  },
  {
    id: 'log_02',
    vehicleId: 'veh_civic_01',
    date: '2026-08-18',
    odometer: 42590,
    liters: 49.5,
    pricePerLiter: 5.89,
    totalCost: 291.56,
    fuelType: 'gasolina_aditivada',
    isFullTank: true,
    drivingProfile: 'estrada',
    stationName: 'Posto Shell Graal Sul',
    stationBrand: 'Shell',
    latitude: -23.6012,
    longitude: -46.6872,
    notes: 'Viagem serra / litoral. Pista fluida.',
  },
  {
    id: 'log_03',
    vehicleId: 'veh_civic_01',
    date: '2026-09-02',
    odometer: 42890,
    liters: 20.0,
    pricePerLiter: 5.69,
    totalCost: 113.80,
    fuelType: 'gasolina_comum',
    isFullTank: false,
    drivingProfile: 'cidade',
    stationName: 'Posto Ipiranga Centro',
    stationBrand: 'Ipiranga',
    latitude: -23.5505,
    longitude: -46.6333,
    notes: 'Abastecimento rápido antes da reunião.',
  },
  {
    id: 'log_04',
    vehicleId: 'veh_civic_01',
    date: '2026-09-14',
    odometer: 43380,
    liters: 32.5,
    pricePerLiter: 5.75,
    totalCost: 186.88,
    fuelType: 'gasolina_comum',
    isFullTank: true,
    drivingProfile: 'cidade',
    stationName: 'Posto Shell Graal Sul',
    stationBrand: 'Shell',
    latitude: -23.6012,
    longitude: -46.6872,
    notes: 'Fechou ciclo do abastecimento parcial anterior.',
  },
  {
    id: 'log_05',
    vehicleId: 'veh_civic_01',
    date: '2026-09-28',
    odometer: 43860,
    liters: 51.0,
    pricePerLiter: 3.79,
    totalCost: 193.29,
    fuelType: 'etanol',
    isFullTank: true,
    drivingProfile: 'misto',
    stationName: 'Posto BR Autódromo',
    stationBrand: 'Petrobras',
    notes: 'Teste com Etanol para comparar rendimento.',
  },
  {
    id: 'log_06',
    vehicleId: 'veh_civic_01',
    date: '2026-10-12',
    odometer: 44340,
    liters: 50.8,
    pricePerLiter: 3.85,
    totalCost: 195.58,
    fuelType: 'etanol',
    isFullTank: true,
    drivingProfile: 'cidade',
    stationName: 'Posto Ipiranga Jardins',
    stationBrand: 'Ipiranga',
    notes: 'Segundo tanque consecutivo de Etanol.',
  },
  {
    id: 'log_07',
    vehicleId: 'veh_civic_01',
    date: '2026-10-25',
    odometer: 44920,
    liters: 48.5,
    pricePerLiter: 5.92,
    totalCost: 287.12,
    fuelType: 'gasolina_aditivada',
    isFullTank: true,
    drivingProfile: 'estrada',
    stationName: 'Posto Shell Graal Sul',
    stationBrand: 'Shell',
    notes: 'Volta para Gasolina Aditivada.',
  },
  {
    id: 'log_08',
    vehicleId: 'veh_civic_01',
    date: '2026-11-04',
    odometer: 45430,
    liters: 47.0,
    pricePerLiter: 5.84,
    totalCost: 274.48,
    fuelType: 'gasolina_comum',
    isFullTank: true,
    drivingProfile: 'cidade',
    stationName: 'Posto Estrela da Rodovia',
    stationBrand: 'Petrobras',
    notes: 'Rotina urbana pesada com ar condicionado direto.',
  },
  {
    id: 'log_09',
    vehicleId: 'veh_civic_01',
    date: '2026-11-08',
    odometer: 45860,
    liters: 41.5,
    pricePerLiter: 5.89,
    totalCost: 244.44,
    fuelType: 'gasolina_comum',
    isFullTank: true,
    drivingProfile: 'misto',
    stationName: 'Posto Shell Graal Sul',
    stationBrand: 'Shell',
    notes: 'Último abastecimento registrado.',
  },
  // Moto logs
  {
    id: 'log_moto_01',
    vehicleId: 'veh_mt07_02',
    date: '2026-09-10',
    odometer: 11200,
    liters: 12.0,
    pricePerLiter: 5.89,
    totalCost: 70.68,
    fuelType: 'gasolina_aditivada',
    isFullTank: true,
    drivingProfile: 'estrada',
    stationName: 'Posto Shell Graal Sul',
    stationBrand: 'Shell',
  },
  {
    id: 'log_moto_02',
    vehicleId: 'veh_mt07_02',
    date: '2026-10-05',
    odometer: 11460,
    liters: 12.2,
    pricePerLiter: 5.95,
    totalCost: 72.59,
    fuelType: 'gasolina_aditivada',
    isFullTank: true,
    drivingProfile: 'misto',
    stationName: 'Posto Ipiranga Centro',
    stationBrand: 'Ipiranga',
  },
  {
    id: 'log_moto_03',
    vehicleId: 'veh_mt07_02',
    date: '2026-11-01',
    odometer: 13450,
    liters: 12.5,
    pricePerLiter: 5.92,
    totalCost: 74.00,
    fuelType: 'gasolina_aditivada',
    isFullTank: true,
    drivingProfile: 'estrada',
    stationName: 'Posto Shell Graal Sul',
    stationBrand: 'Shell',
  },
];

export const INITIAL_MAINTENANCE: MaintenanceItem[] = [
  {
    id: 'maint_01',
    vehicleId: 'veh_civic_01',
    title: 'Troca de Óleo 0W-20 Sintético e Filtro',
    intervalKm: 10000,
    lastDoneOdometer: 40000,
    lastDoneDate: '2026-06-15',
    cost: 380.00,
    category: 'oleo',
    notes: 'Usar especificação API SP / ILSAC GF-6.',
  },
  {
    id: 'maint_02',
    vehicleId: 'veh_civic_01',
    title: 'Filtro de Ar do Motor e Cabine',
    intervalKm: 15000,
    lastDoneOdometer: 35000,
    lastDoneDate: '2026-03-20',
    cost: 160.00,
    category: 'filtros',
    notes: 'Trocar elemento filtrante e higienizar A/C.',
  },
  {
    id: 'maint_03',
    vehicleId: 'veh_civic_01',
    title: 'Calibragem a Frio e Rodízio de Pneus',
    intervalKm: 5000,
    lastDoneOdometer: 41000,
    lastDoneDate: '2026-07-10',
    cost: 120.00,
    category: 'pneus',
    notes: '32 PSI dianteira / 30 PSI traseira.',
  },
  {
    id: 'maint_04',
    vehicleId: 'veh_civic_01',
    title: 'Fluído de Freio DOT 4',
    intervalKm: 20000,
    lastDoneOdometer: 30000,
    lastDoneDate: '2025-11-15',
    cost: 250.00,
    category: 'freios',
    notes: 'Substituição completa do fluido.',
  },
  {
    id: 'maint_05',
    vehicleId: 'veh_civic_01',
    title: 'Velas de Ignição Iridium',
    intervalKm: 40000,
    lastDoneOdometer: 40000,
    lastDoneDate: '2026-06-15',
    cost: 480.00,
    category: 'ignicao',
    notes: 'Velas originais NGK Laser Iridium.',
  },
  // Moto maintenance
  {
    id: 'maint_moto_01',
    vehicleId: 'veh_mt07_02',
    title: 'Troca de Óleo Yamalube 10W-40 e Filtro',
    intervalKm: 5000,
    lastDoneOdometer: 10000,
    lastDoneDate: '2026-05-10',
    cost: 190.00,
    category: 'oleo',
  },
  {
    id: 'maint_moto_02',
    vehicleId: 'veh_mt07_02',
    title: 'Tensão e Lubrificação da Corrente',
    intervalKm: 1000,
    lastDoneOdometer: 13000,
    lastDoneDate: '2026-10-20',
    cost: 60.00,
    category: 'correias',
  },
];

// Helper to safely read from localStorage
function getStoredItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
  }
  return defaultValue;
}

// Helper to write to localStorage
function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

export function loadVehicles(): Vehicle[] {
  return getStoredItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
}

export function saveVehicles(vehicles: Vehicle[]): void {
  setStoredItem(STORAGE_KEYS.VEHICLES, vehicles);
}

export function loadFuelLogs(): FuelLog[] {
  return getStoredItem<FuelLog[]>(STORAGE_KEYS.FUEL_LOGS, []);
}

export function saveFuelLogs(logs: FuelLog[]): void {
  setStoredItem(STORAGE_KEYS.FUEL_LOGS, logs);
}

export function loadMaintenanceItems(): MaintenanceItem[] {
  return getStoredItem<MaintenanceItem[]>(STORAGE_KEYS.MAINTENANCE, []);
}

export const INITIAL_EXTRA_EXPENSES: ExtraExpense[] = [
  {
    id: 'exp_01',
    vehicleId: 'veh_civic_01',
    date: '2026-08-10',
    category: 'ipva_impostos',
    description: 'IPVA 2026 - Cota Única (com desconto)',
    amount: 2850.0,
    odometer: 42100,
    recurrence: 'anual',
    notes: 'Pagamento à vista com desconto oficial de 3%.',
  },
  {
    id: 'exp_02',
    vehicleId: 'veh_civic_01',
    date: '2026-08-22',
    category: 'seguro',
    description: 'Renovação Seguro Auto Porto Seguro (Franquia Reduzida)',
    amount: 3200.0,
    odometer: 42650,
    recurrence: 'anual',
    notes: 'Cobertura 100% FIPE + terceiros R$ 200k + guincho ilimitado.',
  },
  {
    id: 'exp_03',
    vehicleId: 'veh_civic_01',
    date: '2026-09-08',
    category: 'estacionamento_pedagio',
    description: 'Sem Parar - Fatura Mensal / Pedágios Rodovias SP',
    amount: 145.8,
    odometer: 43100,
    recurrence: 'mensal',
    notes: 'Passagens nas praças de pedágio do Sistema Anchieta-Imigrantes.',
  },
  {
    id: 'exp_04',
    vehicleId: 'veh_civic_01',
    date: '2026-09-20',
    category: 'lavagem_estetica',
    description: 'Lavagem técnica detalhada + cristalização de para-brisa',
    amount: 120.0,
    odometer: 43600,
    recurrence: 'unica',
    notes: 'Higienização e proteção pós-viagem.',
  },
  {
    id: 'exp_05',
    vehicleId: 'veh_civic_01',
    date: '2026-10-15',
    category: 'licenciamento_taxas',
    description: 'Taxa de Licenciamento Anual DETRAN-SP 2026',
    amount: 160.22,
    odometer: 44450,
    recurrence: 'anual',
    notes: 'Emissão eletrônica do CRLV-e.',
  },
  {
    id: 'exp_06',
    vehicleId: 'veh_civic_01',
    date: '2026-10-30',
    category: 'estacionamento_pedagio',
    description: 'Estacionamento Aeroporto Congonhas (3 diárias)',
    amount: 180.0,
    odometer: 45100,
    recurrence: 'unica',
    notes: 'Estacionamento coberto para viagem a trabalho.',
  },
  {
    id: 'exp_07',
    vehicleId: 'veh_mt07_02',
    date: '2026-08-15',
    category: 'seguro',
    description: 'Seguro Moto Suhai Roubo e Furto',
    amount: 1100.0,
    odometer: 11400,
    recurrence: 'anual',
    notes: 'Cobertura anual com rastreador incluso.',
  },
  {
    id: 'exp_08',
    vehicleId: 'veh_mt07_02',
    date: '2026-09-25',
    category: 'lavagem_estetica',
    description: 'Lavagem detalhada de moto + lubrificação de corrente Motul',
    amount: 80.0,
    odometer: 12200,
    recurrence: 'unica',
    notes: 'Cuidado estético e desengraxe.',
  },
];

export function loadExtraExpenses(): ExtraExpense[] {
  return getStoredItem<ExtraExpense[]>(STORAGE_KEYS.EXTRA_EXPENSES, []);
}

export function saveExtraExpenses(expenses: ExtraExpense[]): void {
  setStoredItem(STORAGE_KEYS.EXTRA_EXPENSES, expenses);
}

export const INITIAL_TIRE_CALIBRATIONS: TireCalibrationLog[] = [
  {
    id: 'calib_civic_01',
    vehicleId: 'veh_civic_01',
    date: '2026-10-25',
    odometer: 44920,
    frontPsi: 32,
    rearPsi: 30,
    notes: 'Calibragem preventiva a frio realizada no posto.',
  },
  {
    id: 'calib_mt07_01',
    vehicleId: 'veh_mt07_02',
    date: '2026-10-20',
    odometer: 13000,
    frontPsi: 33,
    rearPsi: 36,
    notes: 'Calibragem com manômetro digital certificado.',
  },
];

export function loadTireCalibrations(): TireCalibrationLog[] {
  return getStoredItem<TireCalibrationLog[]>(STORAGE_KEYS.TIRE_CALIBRATIONS, []);
}

export function saveTireCalibrations(calibrations: TireCalibrationLog[]): void {
  setStoredItem(STORAGE_KEYS.TIRE_CALIBRATIONS, calibrations);
}

export const INITIAL_STATIONS: GasStation[] = [
  {
    id: 'st_01',
    name: 'Posto Estrela da Rodovia',
    brand: 'Petrobras',
    latitude: -23.5615,
    longitude: -46.6559,
    address: 'Av. Paulista, 1200 - Bela Vista, São Paulo - SP',
    notes: 'Excelente combustível aditivado Grid e calibrador digital calibrado.',
  },
  {
    id: 'st_02',
    name: 'Posto Shell Graal Sul',
    brand: 'Shell',
    latitude: -23.6012,
    longitude: -46.6872,
    address: 'Rod. dos Imigrantes, km 28 - São Paulo - SP',
    notes: 'Parada clássica de viagem com V-Power Racing e ampla conveniência.',
  },
  {
    id: 'st_03',
    name: 'Posto Ipiranga Centro',
    brand: 'Ipiranga',
    latitude: -23.5505,
    longitude: -46.6333,
    address: 'Av. da Liberdade, 450 - Liberdade, São Paulo - SP',
    notes: 'Km de Vantagens, troca de óleo rápida e ducha.',
  },
  {
    id: 'st_04',
    name: 'Posto Shell Premium Norte',
    brand: 'Shell',
    latitude: -23.5120,
    longitude: -46.6250,
    address: 'Av. Braz Leme, 1850 - Santana, São Paulo - SP',
    notes: 'Pista rápida, calibrador gratuito e lavagem completa.',
  },
  {
    id: 'st_05',
    name: 'Auto Posto Petrobras Aeroporto',
    brand: 'Petrobras',
    latitude: -23.6273,
    longitude: -46.6565,
    address: 'Av. Washington Luís, 6200 - Campo Belo, São Paulo - SP',
    notes: 'Aberto 24 horas perto de Congonhas com ótimo preço de etanol.',
  },
  {
    id: 'st_06',
    name: 'Posto Ale Marginal',
    brand: 'Ale',
    latitude: -23.5280,
    longitude: -46.6710,
    address: 'Marginal Tietê, 4100 - Barra Funda, São Paulo - SP',
    notes: 'Preço competitivo de combustível e fácil acesso à rodovia.',
  },
];

export function loadGasStations(): GasStation[] {
  return getStoredItem<GasStation[]>(STORAGE_KEYS.STATIONS, []);
}

export function saveGasStations(stations: GasStation[]): void {
  setStoredItem(STORAGE_KEYS.STATIONS, stations);
}

export function saveMaintenanceItems(items: MaintenanceItem[]): void {
  setStoredItem(STORAGE_KEYS.MAINTENANCE, items);
}

export function loadActiveVehicleId(vehicles: Vehicle[]): string {
  const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_VEHICLE_ID);
  if (stored && vehicles.some(v => v.id === stored)) {
    return stored;
  }
  return vehicles[0]?.id || '';
}

export function saveActiveVehicleId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_VEHICLE_ID, id);
}

export function loadTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return 'dark'; // Default Dark Mode as requested
}

export function saveTheme(theme: 'dark' | 'light'): void {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Exports complete application backup as JSON
 */
export function exportBackupJSON(
  vehicles: Vehicle[],
  fuelLogs: FuelLog[],
  maintenanceItems: MaintenanceItem[],
  extraExpenses: ExtraExpense[] = [],
  tireCalibrations: TireCalibrationLog[] = [],
  stations: GasStation[] = []
): void {
  const backup: BackupData = {
    version: '1.3.0',
    exportDate: new Date().toISOString(),
    vehicles,
    fuelLogs,
    maintenanceItems,
    extraExpenses,
    tireCalibrations,
    stations,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `pitstop_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Validates and imports JSON backup data strictly from the selected file (no demo/seed injection)
 */
export function importBackupJSON(jsonString: string): BackupData {
  const raw = JSON.parse(jsonString) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Arquivo de backup inválido. Estrutura não reconhecida.');
  }

  const source =
    raw.registros && typeof raw.registros === 'object'
      ? (raw.registros as Record<string, unknown>)
      : raw;

  const rawVehicles = Array.isArray(source.vehicles)
    ? source.vehicles
    : Array.isArray(source.veiculos)
      ? source.veiculos
      : null;

  const rawFuelLogs = Array.isArray(source.fuelLogs)
    ? source.fuelLogs
    : Array.isArray(source.abastecimentos)
      ? source.abastecimentos
      : null;

  if (!rawVehicles || !rawFuelLogs) {
    throw new Error('Arquivo de backup inválido. Estrutura não reconhecida.');
  }

  const stripOwnerFields = <T>(items: unknown[]): T[] =>
    items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map(item => {
        const clean = { ...item };
        delete clean.user_id;
        delete clean.userId;
        return clean as unknown as T;
      });

  const rawMaintenance = Array.isArray(source.maintenanceItems)
    ? source.maintenanceItems
    : Array.isArray(source.manutencoes)
      ? source.manutencoes
      : [];

  const rawExpenses = Array.isArray(source.extraExpenses)
    ? source.extraExpenses
    : Array.isArray(source.despesas_extras)
      ? source.despesas_extras
      : [];

  const rawCalibrations = Array.isArray(source.tireCalibrations)
    ? source.tireCalibrations
    : Array.isArray(source.calibragens)
      ? source.calibragens
      : [];

  const rawStations = Array.isArray(source.stations)
    ? source.stations
    : Array.isArray(source.postos)
      ? source.postos
      : [];

  return {
    version: typeof raw.version === 'string' ? raw.version : typeof raw.versao === 'string' ? raw.versao : '1.5.0',
    exportDate:
      typeof raw.exportDate === 'string'
        ? raw.exportDate
        : typeof raw.data_exportacao === 'string'
          ? raw.data_exportacao
          : new Date().toISOString(),
    vehicles: stripOwnerFields<Vehicle>(rawVehicles),
    fuelLogs: stripOwnerFields<FuelLog>(rawFuelLogs),
    maintenanceItems: stripOwnerFields<MaintenanceItem>(rawMaintenance),
    extraExpenses: stripOwnerFields<ExtraExpense>(rawExpenses),
    tireCalibrations: stripOwnerFields<TireCalibrationLog>(rawCalibrations),
    stations: stripOwnerFields<GasStation>(rawStations),
  };
}

/**
 * Exports fuel logs and calculations as CSV with UTF-8 BOM
 */
export function exportLogsCSV(logs: FuelLog[], vehicle: Vehicle): void {
  const headers = [
    'Data',
    'Veículo',
    'Hodômetro (km)',
    'Litros (L)',
    'Preço/Litro (R$)',
    'Valor Total (R$)',
    'Combustível',
    'Tanque Cheio',
    'Perfil de Uso',
    'Posto',
    'Bandeira',
    'Km Rodados (Trecho)',
    'Consumo Real (km/L)',
    'Custo por Km (R$/km)',
    'Observações',
  ];

  const fuelNames: Record<string, string> = {
    gasolina_comum: 'Gasolina Comum',
    gasolina_aditivada: 'Gasolina Aditivada',
    etanol: 'Etanol',
    diesel_s10: 'Diesel S10',
    gnv: 'GNV',
  };

  const profileNames: Record<string, string> = {
    cidade: 'Cidade',
    estrada: 'Estrada',
    misto: 'Misto',
  };

  const rows = logs.map(l => [
    l.date,
    `"${vehicle.name} (${vehicle.plate})"`,
    l.odometer,
    l.liters.toFixed(2),
    l.pricePerLiter.toFixed(2),
    l.totalCost.toFixed(2),
    `"${fuelNames[l.fuelType] || l.fuelType}"`,
    l.isFullTank ? 'Sim' : 'Não (Parcial)',
    `"${profileNames[l.drivingProfile] || l.drivingProfile}"`,
    `"${(l.stationName || '').replace(/"/g, '""')}"`,
    `"${l.stationBrand || ''}"`,
    l.distanceTraveled ?? '',
    l.calculatedKmPerLiter ? l.calculatedKmPerLiter.toFixed(2) : '',
    l.calculatedCostPerKm ? l.calculatedCostPerKm.toFixed(2) : '',
    `"${(l.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [
    headers.join(';'),
    ...rows.map(row => row.join(';')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `pitstop_relatorio_${vehicle.plate}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

export const DEFAULT_SETTINGS: AppSettings = {
  distanceUnit: 'km',
  volumeUnit: 'L',
  consumptionUnit: 'km/L',
  currency: 'BRL',
  alertTireCalibration: true,
  alertLowFuel: true,
  alertPreventiveMaintenance: true,
  alertMechanicalAnomaly: true,
};

export function loadAuthUser(): AuthUser | null {
  const stored = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

export function saveAuthUser(user: AuthUser | null): void {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  } else {
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  }
}

export interface RegisteredAccount extends AuthUser {
  senhaHash: string;
}

export function loadRegisteredAccounts(): RegisteredAccount[] {
  const stored = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as RegisteredAccount[];
  } catch {
    return [];
  }
}

export function saveRegisteredAccounts(accounts: RegisteredAccount[]): void {
  localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(accounts));
}

export function loadSettings(): AppSettings {
  const loaded = getStoredItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...loaded };
}

export function saveSettings(settings: AppSettings): void {
  setStoredItem(STORAGE_KEYS.SETTINGS, settings);
}

export function loadReadNotificationIds(): string[] {
  const stored = localStorage.getItem(STORAGE_KEYS.READ_NOTIFICATIONS);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export function saveReadNotificationIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEYS.READ_NOTIFICATIONS, JSON.stringify(ids));
}

export function resetAllStorageData(): void {
  const domainKeys = [
    STORAGE_KEYS.VEHICLES,
    STORAGE_KEYS.FUEL_LOGS,
    STORAGE_KEYS.MAINTENANCE,
    STORAGE_KEYS.EXTRA_EXPENSES,
    STORAGE_KEYS.TIRE_CALIBRATIONS,
    STORAGE_KEYS.STATIONS,
    STORAGE_KEYS.ACTIVE_VEHICLE_ID,
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.READ_NOTIFICATIONS,
  ];
  domainKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing ${key} from localStorage:`, e);
    }
  });
}
