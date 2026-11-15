import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  Vehicle,
  FuelLog,
  MaintenanceItem,
  ExtraExpense,
  TireCalibrationLog,
  GasStation,
  BackupData,
  AuthUser,
} from '../types';

// ==============================================================================
// CLIENTE SUPABASE OFICIAL (PRODUÇÃO VERCEL)
// ==============================================================================

function normalizeSupabaseProjectUrl(raw: string): string {
  const cleaned = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned) return '';
  try {
    const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    return new URL(withProtocol).origin;
  } catch {
    return cleaned
      .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+\/?.*$/i, '')
      .replace(/\/+$/, '');
  }
}

const supabaseUrl = normalizeSupabaseProjectUrl(import.meta.env?.VITE_SUPABASE_URL || '');
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '')
  .trim()
  .replace(/^['"]|['"]$/g, '');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = (
  isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
) as unknown as SupabaseClient;

// ==============================================================================
// HELPERS DE SANITIZAÇÃO (NULL PARA CAMPOS OPCIONAIS VAZIOS) & UUID
// ==============================================================================

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUUID(str: unknown): str is string {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

export function ensureUUID(id?: string): string {
  if (id && isValidUUID(id)) return id.trim();
  return generateUUID();
}

function requireValidUUID(val: unknown, fieldName: string): string {
  if (!isValidUUID(val)) {
    throw new Error(`Identificador "${fieldName}" inválido.`);
  }
  return val.trim();
}

function toNullableUUID(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    return isValidUUID(trimmed) ? trimmed : null;
  }
  return null;
}

function isValidIsoDateString(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const parsed = new Date(`${val}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === val;
}

function toRequiredDate(val: unknown): string {
  if (typeof val === 'string') {
    const sliced = val.trim().slice(0, 10);
    if (sliced && isValidIsoDateString(sliced)) {
      return sliced;
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function toNullableDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const sliced = val.trim().slice(0, 10);
    if (!sliced) return null;
    return isValidIsoDateString(sliced) ? sliced : null;
  }
  return null;
}

function toRequiredNumber(val: unknown, fallback = 0): number {
  if (val === '' || val === null || val === undefined) return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function toNullableNumber(val: unknown): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function toNullableText(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed ? trimmed : null;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map(item => [item.id, item])).values());
}

// ==============================================================================
// PERFIL & AVATAR DO USUÁRIO AUTENTICADO
// ==============================================================================

const LOCAL_AVATAR_PREFIX = 'pitstop_local_avatar_v1_';

export function getLocalUserAvatar(userId: string): string | null {
  try {
    return localStorage.getItem(`${LOCAL_AVATAR_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function saveLocalUserAvatar(userId: string, avatar: string): void {
  try {
    const key = `${LOCAL_AVATAR_PREFIX}${userId}`;
    if (!avatar || !avatar.trim()) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, avatar);
    }
  } catch {
    // Ignore storage errors
  }
}

export const MASTER_ADMIN_EMAILS = [
  'diegomarques.mat@gmail.com',
  'admin@pitstop.app',
  'admin@itspitstop.com',
];

export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return MASTER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function mapSupabaseUserToAuthUser(sbUser: User): AuthUser {
  const localAvatar = getLocalUserAvatar(sbUser.id);
  const metadataAvatar =
    sbUser.user_metadata?.avatar_url !== undefined
      ? sbUser.user_metadata.avatar_url
      : sbUser.user_metadata?.avatar;

  const resolvedAvatar =
    localAvatar !== null
      ? localAvatar
      : metadataAvatar !== undefined
      ? String(metadataAvatar)
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sbUser.id)}`;

  const rawRole = sbUser.app_metadata?.role || sbUser.user_metadata?.role;
  const role: AuthUser['role'] =
    rawRole === 'admin' || isMasterAdminEmail(sbUser.email) ? 'admin' : 'user';

  const rawStatus = sbUser.app_metadata?.status || sbUser.user_metadata?.status;
  const status: AuthUser['status'] = rawStatus === 'blocked' ? 'blocked' : 'active';

  const rawPlan = sbUser.user_metadata?.plan;
  const plan: AuthUser['plan'] =
    rawPlan === 'pro_monthly' || rawPlan === 'pro_annual' || rawPlan === 'lifetime'
      ? rawPlan
      : 'free';

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    nome: sbUser.user_metadata?.nome || sbUser.email?.split('@')[0] || 'Piloto PitStop',
    avatar: resolvedAvatar,
    dataCriacao: sbUser.created_at || new Date().toISOString(),
    isGuest: false,
    tourConcluido: Boolean(sbUser.user_metadata?.tour_concluido),
    role,
    status,
    plan,
    planExpiresAt: sbUser.user_metadata?.plan_expires_at ?? null,
    lastLoginAt: sbUser.last_sign_in_at || sbUser.created_at || new Date().toISOString(),
  };
}

// ==============================================================================
// MENSAGENS DE ERRO LIMPAS
// ==============================================================================

export function translateAuthError(
  err: (Error & { code?: string; status?: number }) | string
): string {
  const msg = typeof err === 'string' ? err : err.message;
  if (msg.includes('Invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam.';
  }
  if (msg.includes('User already registered')) {
    return 'Este e-mail já está cadastrado. Alterne para a aba "Entrar".';
  }
  if (msg.includes('Password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
  }
  return msg;
}

export function formatFriendlyNetworkError(
  err: unknown,
  fallback = 'Erro ao comunicar com o Supabase.'
): string {
  if (typeof err === 'string') return err || fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message?: unknown }).message ?? fallback);
  }
  return fallback;
}

// ==============================================================================
// MAPEAMENTO EXATO FRONT-END <-> POSTGRES (snake_case)
// ==============================================================================

function normalizeDbDate(val: unknown): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function parseAcceptedFuels(val: unknown): Vehicle['acceptedFuels'] {
  if (Array.isArray(val) && val.length > 0) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fallback below
    }
  }
  return ['gasolina_comum'];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbVehicle(v: Record<string, any>): Vehicle {
  return {
    id: v.id,
    name: v.name || '',
    model: v.model || '',
    year: Number(v.year) || 2024,
    plate: v.plate || '',
    initialOdometer: Number(v.initial_odometer) || 0,
    currentOdometer: Number(v.current_odometer) || 0,
    tankCapacityLiters: Number(v.tank_capacity_liters) || 50,
    acceptedFuels: parseAcceptedFuels(v.accepted_fuels),
    color: v.color || '#3B82F6',
    isDefault: Boolean(v.is_default),
    frontTirePsi: Number(v.front_tire_psi) || 32,
    rearTirePsi: Number(v.rear_tire_psi) || 30,
    tireCalibrationDaysInterval: Number(v.tire_calibration_days_interval) || 15,
    tireCalibrationFillsInterval: Number(v.tire_calibration_fills_interval) || 2,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbStation(s: Record<string, any>): GasStation {
  return {
    id: s.id,
    name: s.name || '',
    brand: s.brand || 'Outro',
    address: s.address || '',
    latitude: s.latitude != null ? Number(s.latitude) : undefined,
    longitude: s.longitude != null ? Number(s.longitude) : undefined,
    notes: s.notes || '',
    createdAt: s.created_at ?? undefined,
    updatedAt: s.updated_at ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbFuelLog(l: Record<string, any>): FuelLog {
  return {
    id: l.id,
    vehicleId: l.veiculo_id,
    stationId: l.posto_id ?? undefined,
    date: normalizeDbDate(l.date),
    odometer: Number(l.odometer) || 0,
    fuelType: l.fuel_type,
    liters: Number(l.liters) || 0,
    pricePerLiter: Number(l.price_per_liter) || 0,
    totalCost: Number(l.total_cost) || 0,
    isFullTank: Boolean(l.is_full_tank),
    drivingProfile: l.driving_profile || 'misto',
    stationName: l.station_name || '',
    stationBrand: l.station_brand || '',
    latitude: l.latitude != null ? Number(l.latitude) : undefined,
    longitude: l.longitude != null ? Number(l.longitude) : undefined,
    notes: l.notes || '',
    calculatedKmPerLiter:
      l.calculated_km_per_liter != null ? Number(l.calculated_km_per_liter) : undefined,
    calculatedCostPerKm:
      l.calculated_cost_per_km != null ? Number(l.calculated_cost_per_km) : undefined,
    distanceTraveled: l.distance_traveled != null ? Number(l.distance_traveled) : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbMaintenance(m: Record<string, any>): MaintenanceItem {
  return {
    id: m.id,
    vehicleId: m.veiculo_id,
    title: m.title || '',
    category: m.category || 'geral',
    intervalKm: Number(m.interval_km) || 0,
    lastDoneOdometer: Number(m.last_done_odometer) || 0,
    lastDoneDate: normalizeDbDate(m.last_done_date),
    cost: m.cost != null ? Number(m.cost) : 0,
    notes: m.notes || '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbExpense(e: Record<string, any>): ExtraExpense {
  return {
    id: e.id,
    vehicleId: e.veiculo_id,
    date: normalizeDbDate(e.date),
    category: e.category,
    description: e.description || '',
    amount: Number(e.amount) || 0,
    odometer: e.odometer != null ? Number(e.odometer) : undefined,
    recurrence: e.recurrence || 'unica',
    notes: e.notes || '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbTireCalibration(c: Record<string, any>): TireCalibrationLog {
  return {
    id: c.id,
    vehicleId: c.veiculo_id,
    date: normalizeDbDate(c.date),
    odometer: Number(c.odometer) || 0,
    frontPsi: c.front_psi != null ? Number(c.front_psi) : undefined,
    rearPsi: c.rear_psi != null ? Number(c.rear_psi) : undefined,
    notes: c.notes || '',
  };
}

function buildVehiclePayload(userId: string, vehicle: Omit<Vehicle, 'id'> | Vehicle) {
  return {
    user_id: requireValidUUID(userId, 'user_id'),
    name: (vehicle.name || 'Veículo').trim(),
    model: (vehicle.model || '').trim(),
    year: Math.round(toRequiredNumber(vehicle.year, 2024)),
    plate: (vehicle.plate || '').trim(),
    initial_odometer: toRequiredNumber(vehicle.initialOdometer, 0),
    current_odometer: toRequiredNumber(vehicle.currentOdometer, 0),
    tank_capacity_liters: toRequiredNumber(vehicle.tankCapacityLiters, 50),
    accepted_fuels:
      Array.isArray(vehicle.acceptedFuels) && vehicle.acceptedFuels.length > 0
        ? vehicle.acceptedFuels
        : ['gasolina_comum'],
    color: (vehicle.color || '#3B82F6').trim(),
    is_default: Boolean(vehicle.isDefault),
    front_tire_psi: toRequiredNumber(vehicle.frontTirePsi, 32),
    rear_tire_psi: toRequiredNumber(vehicle.rearTirePsi, 30),
    tire_calibration_days_interval: Math.round(
      toRequiredNumber(vehicle.tireCalibrationDaysInterval, 15)
    ),
    tire_calibration_fills_interval: Math.round(
      toRequiredNumber(vehicle.tireCalibrationFillsInterval, 2)
    ),
    updated_at: new Date().toISOString(),
  };
}

function buildStationPayload(userId: string, station: Omit<GasStation, 'id'> | GasStation) {
  return {
    user_id: requireValidUUID(userId, 'user_id'),
    name: (station.name || 'Posto').trim(),
    brand: (station.brand || 'Outro').trim(),
    address: toNullableText(station.address),
    latitude: toNullableNumber(station.latitude),
    longitude: toNullableNumber(station.longitude),
    notes: toNullableText(station.notes),
    updated_at: new Date().toISOString(),
  };
}

function buildFuelLogPayload(userId: string, log: Omit<FuelLog, 'id'> | FuelLog) {
  return {
    user_id: requireValidUUID(userId, 'user_id'),
    veiculo_id: requireValidUUID(log.vehicleId, 'veiculo_id'),
    posto_id: toNullableUUID(log.stationId),
    date: toRequiredDate(log.date),
    odometer: toRequiredNumber(log.odometer, 0),
    fuel_type: log.fuelType || 'gasolina_comum',
    liters: toRequiredNumber(log.liters, 0),
    price_per_liter: toRequiredNumber(log.pricePerLiter, 0),
    total_cost: toRequiredNumber(log.totalCost, 0),
    is_full_tank: Boolean(log.isFullTank),
    driving_profile: log.drivingProfile || 'misto',
    station_name: toNullableText(log.stationName),
    station_brand: toNullableText(log.stationBrand),
    latitude: toNullableNumber(log.latitude),
    longitude: toNullableNumber(log.longitude),
    notes: toNullableText(log.notes),
    calculated_km_per_liter: toNullableNumber(log.calculatedKmPerLiter),
    calculated_cost_per_km: toNullableNumber(log.calculatedCostPerKm),
    distance_traveled: toNullableNumber(log.distanceTraveled),
  };
}

function buildMaintenancePayload(userId: string, item: Omit<MaintenanceItem, 'id'> | MaintenanceItem) {
  const intervalKm = toRequiredNumber(item.intervalKm, 10000);
  const lastDoneOdometer = toRequiredNumber(item.lastDoneOdometer, 0);
  return {
    user_id: requireValidUUID(userId, 'user_id'),
    veiculo_id: requireValidUUID(item.vehicleId, 'veiculo_id'),
    title: (item.title || 'Manutenção').trim(),
    category: item.category || 'geral',
    interval_km: intervalKm,
    last_done_odometer: lastDoneOdometer,
    last_done_date: toRequiredDate(item.lastDoneDate),
    next_due_odometer: lastDoneOdometer + intervalKm,
    cost: toNullableNumber(item.cost),
    notes: toNullableText(item.notes),
  };
}

function buildExpensePayload(userId: string, expense: Omit<ExtraExpense, 'id'> | ExtraExpense) {
  return {
    user_id: requireValidUUID(userId, 'user_id'),
    veiculo_id: requireValidUUID(expense.vehicleId, 'veiculo_id'),
    date: toRequiredDate(expense.date),
    category: expense.category || 'outros',
    description: (expense.description || 'Despesa').trim(),
    amount: toRequiredNumber(expense.amount, 0),
    odometer: toNullableNumber(expense.odometer),
    recurrence: expense.recurrence || 'unica',
    notes: toNullableText(expense.notes),
  };
}

function buildTireCalibrationPayload(
  userId: string,
  calib: Omit<TireCalibrationLog, 'id'> | TireCalibrationLog
) {
  return {
    user_id: requireValidUUID(userId, 'user_id'),
    veiculo_id: requireValidUUID(calib.vehicleId, 'veiculo_id'),
    date: toRequiredDate(calib.date),
    odometer: toRequiredNumber(calib.odometer, 0),
    front_psi: toNullableNumber(calib.frontPsi),
    rear_psi: toNullableNumber(calib.rearPsi),
    notes: toNullableText(calib.notes),
  };
}

// Keep unused-export lint clean while providing optional date sanitizer
export { toNullableDate };

// ==============================================================================
// LEITURA DIRETA DO USUÁRIO AUTENTICADO (SELECT FILTRADO POR user_id)
// ==============================================================================

export interface FetchUserDataResult {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceItems: MaintenanceItem[];
  extraExpenses: ExtraExpense[];
  tireCalibrations: TireCalibrationLog[];
  stations: GasStation[];
}

export async function fetchUserDataFromSupabase(userId: string): Promise<FetchUserDataResult> {
  const validUserId = requireValidUUID(userId, 'user_id');

  const [vehiclesRes, fuelRes, maintRes, expensesRes, calibsRes, stationsRes] = await Promise.all([
    supabase
      .from('veiculos')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: true }),
    supabase
      .from('abastecimentos')
      .select('*')
      .eq('user_id', validUserId)
      .order('date', { ascending: true })
      .order('odometer', { ascending: true }),
    supabase
      .from('manutencoes')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: true }),
    supabase
      .from('despesas_extras')
      .select('*')
      .eq('user_id', validUserId)
      .order('date', { ascending: false }),
    supabase
      .from('calibragens')
      .select('*')
      .eq('user_id', validUserId)
      .order('date', { ascending: false }),
    supabase
      .from('postos')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: true }),
  ]);

  const firstError =
    vehiclesRes.error ||
    fuelRes.error ||
    maintRes.error ||
    expensesRes.error ||
    calibsRes.error ||
    stationsRes.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    vehicles: dedupeById((vehiclesRes.data || []).map(mapDbVehicle)),
    fuelLogs: dedupeById((fuelRes.data || []).map(mapDbFuelLog)),
    maintenanceItems: dedupeById((maintRes.data || []).map(mapDbMaintenance)),
    extraExpenses: dedupeById((expensesRes.data || []).map(mapDbExpense)),
    tireCalibrations: dedupeById((calibsRes.data || []).map(mapDbTireCalibration)),
    stations: dedupeById((stationsRes.data || []).map(mapDbStation)),
  };
}

export interface OwnedPlatformRecord<T> {
  item: T;
  userId: string;
}

export interface FetchPlatformDataResult {
  vehicles: (Vehicle & { userId: string })[];
  fuelLogs: (FuelLog & { userId: string })[];
  maintenanceItems: (MaintenanceItem & { userId: string })[];
  extraExpenses: (ExtraExpense & { userId: string })[];
  tireCalibrations: (TireCalibrationLog & { userId: string })[];
  stations: (GasStation & { userId: string })[];
}

export async function fetchAllPlatformDataFromSupabase(): Promise<FetchPlatformDataResult> {
  const [vehiclesRes, fuelRes, maintRes, expensesRes, calibsRes, stationsRes] = await Promise.all([
    supabase.from('veiculos').select('*').order('created_at', { ascending: true }),
    supabase
      .from('abastecimentos')
      .select('*')
      .order('date', { ascending: true })
      .order('odometer', { ascending: true }),
    supabase.from('manutencoes').select('*').order('created_at', { ascending: true }),
    supabase.from('despesas_extras').select('*').order('date', { ascending: false }),
    supabase.from('calibragens').select('*').order('date', { ascending: false }),
    supabase.from('postos').select('*').order('created_at', { ascending: true }),
  ]);

  const firstError =
    vehiclesRes.error ||
    fuelRes.error ||
    maintRes.error ||
    expensesRes.error ||
    calibsRes.error ||
    stationsRes.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    vehicles: dedupeById(
      (vehiclesRes.data || []).map(row => ({ ...mapDbVehicle(row), userId: String(row.user_id || '') }))
    ),
    fuelLogs: dedupeById(
      (fuelRes.data || []).map(row => ({ ...mapDbFuelLog(row), userId: String(row.user_id || '') }))
    ),
    maintenanceItems: dedupeById(
      (maintRes.data || []).map(row => ({ ...mapDbMaintenance(row), userId: String(row.user_id || '') }))
    ),
    extraExpenses: dedupeById(
      (expensesRes.data || []).map(row => ({ ...mapDbExpense(row), userId: String(row.user_id || '') }))
    ),
    tireCalibrations: dedupeById(
      (calibsRes.data || []).map(row => ({ ...mapDbTireCalibration(row), userId: String(row.user_id || '') }))
    ),
    stations: dedupeById(
      (stationsRes.data || []).map(row => ({ ...mapDbStation(row), userId: String(row.user_id || '') }))
    ),
  };
}

// ==============================================================================
// OPERAÇÕES DIRETAS DE ESCRITA (INSERT / UPDATE / DELETE) COM .select().single()
// ==============================================================================

// --- VEÍCULOS ---
export async function insertVehicleToSupabase(
  userId: string,
  vehicle: Omit<Vehicle, 'id'>
): Promise<Vehicle> {
  const row = buildVehiclePayload(userId, vehicle);
  const { data, error } = await supabase.from('veiculos').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDbVehicle(data);
}

export async function updateVehicleInSupabase(
  userId: string,
  vehicle: Vehicle
): Promise<Vehicle> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(vehicle.id, 'id');
  const row = buildVehiclePayload(validUserId, vehicle);
  const { data, error } = await supabase
    .from('veiculos')
    .update(row)
    .eq('id', validId)
    .eq('user_id', validUserId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbVehicle(data);
}

export async function deleteVehicleFromSupabase(userId: string, vehicleId: string): Promise<void> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(vehicleId, 'id');
  const { error } = await supabase
    .from('veiculos')
    .delete()
    .eq('id', validId)
    .eq('user_id', validUserId);
  if (error) throw new Error(error.message);
}

// --- POSTOS ---
export async function insertStationToSupabase(
  userId: string,
  station: Omit<GasStation, 'id'>
): Promise<GasStation> {
  const row = buildStationPayload(userId, station);
  const { data, error } = await supabase.from('postos').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDbStation(data);
}

export async function updateStationInSupabase(
  userId: string,
  station: GasStation
): Promise<GasStation> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(station.id, 'id');
  const row = buildStationPayload(validUserId, station);
  const { data, error } = await supabase
    .from('postos')
    .update(row)
    .eq('id', validId)
    .eq('user_id', validUserId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbStation(data);
}

// --- ABASTECIMENTOS ---
export async function insertFuelLogToSupabase(
  userId: string,
  log: Omit<FuelLog, 'id'>
): Promise<FuelLog> {
  const row = buildFuelLogPayload(userId, log);
  const { data, error } = await supabase.from('abastecimentos').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDbFuelLog(data);
}

export async function updateFuelLogInSupabase(userId: string, log: FuelLog): Promise<FuelLog> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(log.id, 'id');
  const row = buildFuelLogPayload(validUserId, log);
  const { data, error } = await supabase
    .from('abastecimentos')
    .update(row)
    .eq('id', validId)
    .eq('user_id', validUserId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbFuelLog(data);
}

export async function deleteFuelLogFromSupabase(userId: string, logId: string): Promise<void> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(logId, 'id');
  const { error } = await supabase
    .from('abastecimentos')
    .delete()
    .eq('id', validId)
    .eq('user_id', validUserId);
  if (error) throw new Error(error.message);
}

// --- MANUTENÇÕES ---
export async function insertMaintenanceToSupabase(
  userId: string,
  item: Omit<MaintenanceItem, 'id'>
): Promise<MaintenanceItem> {
  const row = buildMaintenancePayload(userId, item);
  const { data, error } = await supabase.from('manutencoes').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDbMaintenance(data);
}

export async function updateMaintenanceInSupabase(
  userId: string,
  item: MaintenanceItem
): Promise<MaintenanceItem> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(item.id, 'id');
  const row = buildMaintenancePayload(validUserId, item);
  const { data, error } = await supabase
    .from('manutencoes')
    .update(row)
    .eq('id', validId)
    .eq('user_id', validUserId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbMaintenance(data);
}

export async function deleteMaintenanceFromSupabase(userId: string, itemId: string): Promise<void> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(itemId, 'id');
  const { error } = await supabase
    .from('manutencoes')
    .delete()
    .eq('id', validId)
    .eq('user_id', validUserId);
  if (error) throw new Error(error.message);
}

// --- DESPESAS EXTRAS ---
export async function insertExpenseToSupabase(
  userId: string,
  expense: Omit<ExtraExpense, 'id'>
): Promise<ExtraExpense> {
  const row = buildExpensePayload(userId, expense);
  const { data, error } = await supabase.from('despesas_extras').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDbExpense(data);
}

export async function updateExpenseInSupabase(
  userId: string,
  expense: ExtraExpense
): Promise<ExtraExpense> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(expense.id, 'id');
  const row = buildExpensePayload(validUserId, expense);
  const { data, error } = await supabase
    .from('despesas_extras')
    .update(row)
    .eq('id', validId)
    .eq('user_id', validUserId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbExpense(data);
}

export async function deleteExpenseFromSupabase(userId: string, expenseId: string): Promise<void> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(expenseId, 'id');
  const { error } = await supabase
    .from('despesas_extras')
    .delete()
    .eq('id', validId)
    .eq('user_id', validUserId);
  if (error) throw new Error(error.message);
}

// --- CALIBRAGENS DE PNEUS ---
export async function insertTireCalibrationToSupabase(
  userId: string,
  calib: Omit<TireCalibrationLog, 'id'>
): Promise<TireCalibrationLog> {
  const row = buildTireCalibrationPayload(userId, calib);
  const { data, error } = await supabase.from('calibragens').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDbTireCalibration(data);
}

export async function deleteTireCalibrationFromSupabase(
  userId: string,
  calibrationId: string
): Promise<void> {
  const validUserId = requireValidUUID(userId, 'user_id');
  const validId = requireValidUUID(calibrationId, 'id');
  const { error } = await supabase
    .from('calibragens')
    .delete()
    .eq('id', validId)
    .eq('user_id', validUserId);
  if (error) throw new Error(error.message);
}

// ==============================================================================
// IMPORTAÇÃO DE BACKUP JSON PARA O SUPABASE
// ==============================================================================

export async function importBackupIntoSupabase(
  userId: string,
  backup: BackupData
): Promise<{ count: number; data: BackupData }> {
  const validUserId = requireValidUUID(userId, 'user_id');

  const vehicleIdMap: Record<string, string> = {};
  const vehicleRows = dedupeById(
    (backup.vehicles || []).map(v => {
      const validId = ensureUUID(v.id);
      if (v.id) vehicleIdMap[v.id] = validId;
      return {
        id: validId,
        ...buildVehiclePayload(validUserId, v),
      };
    })
  );

  const stationIdMap: Record<string, string> = {};
  const stationRows = dedupeById(
    (backup.stations || []).map(s => {
      const validId = ensureUUID(s.id);
      if (s.id) stationIdMap[s.id] = validId;
      return {
        id: validId,
        ...buildStationPayload(validUserId, s),
      };
    })
  );

  const validPlannedVehicleIds = new Set(vehicleRows.map(v => v.id));
  const resolveVehicleId = (legacyOrUuid: string): string | null => {
    if (legacyOrUuid && vehicleIdMap[legacyOrUuid]) return vehicleIdMap[legacyOrUuid];
    if (legacyOrUuid && validPlannedVehicleIds.has(legacyOrUuid)) return legacyOrUuid;
    return vehicleRows[0]?.id || null;
  };

  const resolveStationId = (log: FuelLog): string | undefined => {
    if (log.stationId && stationIdMap[log.stationId]) return stationIdMap[log.stationId];
    const match = stationRows.find(
      s => s.name.trim().toLowerCase() === (log.stationName || '').trim().toLowerCase()
    );
    return match?.id;
  };

  const fuelRows = dedupeById(
    (backup.fuelLogs || [])
      .map(l => {
        const targetVehId = resolveVehicleId(l.vehicleId);
        if (!targetVehId) return null;
        return {
          id: ensureUUID(l.id),
          ...buildFuelLogPayload(validUserId, {
            ...l,
            vehicleId: targetVehId,
            stationId: resolveStationId(l),
          }),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  );

  const maintenanceRows = dedupeById(
    (backup.maintenanceItems || [])
      .map(m => {
        const targetVehId = resolveVehicleId(m.vehicleId);
        if (!targetVehId) return null;
        return {
          id: ensureUUID(m.id),
          ...buildMaintenancePayload(validUserId, { ...m, vehicleId: targetVehId }),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  );

  const expenseRows = dedupeById(
    (backup.extraExpenses || [])
      .map(e => {
        const targetVehId = resolveVehicleId(e.vehicleId);
        if (!targetVehId) return null;
        return {
          id: ensureUUID(e.id),
          ...buildExpensePayload(validUserId, { ...e, vehicleId: targetVehId }),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  );

  const calibrationRows = dedupeById(
    (backup.tireCalibrations || [])
      .map(c => {
        const targetVehId = resolveVehicleId(c.vehicleId);
        if (!targetVehId) return null;
        return {
          id: ensureUUID(c.id),
          ...buildTireCalibrationPayload(validUserId, { ...c, vehicleId: targetVehId }),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  );

  // Remove todos os registros anteriores do usuário em ordem de dependência antes de importar o backup real
  const clearTables = [
    'calibragens',
    'despesas_extras',
    'manutencoes',
    'abastecimentos',
    'postos',
    'veiculos',
  ] as const;

  for (const table of clearTables) {
    const { error: delError } = await supabase.from(table).delete().eq('user_id', validUserId);
    if (delError) throw new Error(delError.message);
  }

  let count = 0;
  let savedVehicles: Vehicle[] = [];
  if (vehicleRows.length > 0) {
    const { data, error } = await supabase
      .from('veiculos')
      .upsert(vehicleRows, { onConflict: 'id' })
      .select();
    if (error) throw new Error(error.message);
    savedVehicles = dedupeById((data || []).map(mapDbVehicle));
    count += savedVehicles.length;
  }

  let savedStations: GasStation[] = [];
  if (stationRows.length > 0) {
    const { data, error } = await supabase
      .from('postos')
      .upsert(stationRows, { onConflict: 'id' })
      .select();
    if (error) throw new Error(error.message);
    savedStations = dedupeById((data || []).map(mapDbStation));
    count += savedStations.length;
  }

  let savedFuelLogs: FuelLog[] = [];
  if (fuelRows.length > 0) {
    const { data, error } = await supabase
      .from('abastecimentos')
      .upsert(fuelRows, { onConflict: 'id' })
      .select();
    if (error) throw new Error(error.message);
    savedFuelLogs = dedupeById((data || []).map(mapDbFuelLog));
    count += savedFuelLogs.length;
  }

  let savedMaintenance: MaintenanceItem[] = [];
  if (maintenanceRows.length > 0) {
    const { data, error } = await supabase
      .from('manutencoes')
      .upsert(maintenanceRows, { onConflict: 'id' })
      .select();
    if (error) throw new Error(error.message);
    savedMaintenance = dedupeById((data || []).map(mapDbMaintenance));
    count += savedMaintenance.length;
  }

  let savedExpenses: ExtraExpense[] = [];
  if (expenseRows.length > 0) {
    const { data, error } = await supabase
      .from('despesas_extras')
      .upsert(expenseRows, { onConflict: 'id' })
      .select();
    if (error) throw new Error(error.message);
    savedExpenses = dedupeById((data || []).map(mapDbExpense));
    count += savedExpenses.length;
  }

  let savedCalibrations: TireCalibrationLog[] = [];
  if (calibrationRows.length > 0) {
    const { data, error } = await supabase
      .from('calibragens')
      .upsert(calibrationRows, { onConflict: 'id' })
      .select();
    if (error) throw new Error(error.message);
    savedCalibrations = dedupeById((data || []).map(mapDbTireCalibration));
    count += savedCalibrations.length;
  }

  return {
    count,
    data: {
      version: backup.version || '1.5.0',
      exportDate: new Date().toISOString(),
      vehicles: savedVehicles,
      fuelLogs: savedFuelLogs,
      maintenanceItems: savedMaintenance,
      extraExpenses: savedExpenses,
      tireCalibrations: savedCalibrations,
      stations: savedStations,
    },
  };
}
