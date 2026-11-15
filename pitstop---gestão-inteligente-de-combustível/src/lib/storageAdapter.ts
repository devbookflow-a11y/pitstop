import {
  Vehicle,
  FuelLog,
  MaintenanceItem,
  ExtraExpense,
  TireCalibrationLog,
  GasStation,
  BackupData,
  AuthUser,
  AdminUserSummary,
  SystemConfig,
  SaasGlobalBackup,
  UserRole,
  UserStatus,
  SubscriptionPlan,
} from '../types';
import {
  supabase,
  isSupabaseConfigured,
  generateUUID,
  ensureUUID,
  isMasterAdminEmail,
  getLocalUserAvatar,
  saveLocalUserAvatar,
  mapSupabaseUserToAuthUser,
  translateAuthError,
  fetchUserDataFromSupabase,
  fetchAllPlatformDataFromSupabase,
  insertVehicleToSupabase,
  updateVehicleInSupabase,
  deleteVehicleFromSupabase,
  insertStationToSupabase,
  updateStationInSupabase,
  insertFuelLogToSupabase,
  updateFuelLogInSupabase,
  deleteFuelLogFromSupabase,
  insertMaintenanceToSupabase,
  updateMaintenanceInSupabase,
  deleteMaintenanceFromSupabase,
  insertExpenseToSupabase,
  updateExpenseInSupabase,
  deleteExpenseFromSupabase,
  insertTireCalibrationToSupabase,
  deleteTireCalibrationFromSupabase,
  importBackupIntoSupabase,
  FetchUserDataResult,
} from './supabase';

// ==============================================================================
// ADAPTADOR UNIFICADO DE PERSISTÊNCIA (NUVEM SUPABASE + FALLBACK LOCAL PREVIEW)
// ==============================================================================

export type PersistenceMode = 'cloud' | 'local';

const LOCAL_USERS_KEY = 'pitstop_local_users';
const LOCAL_SESSION_KEY = 'pitstop_local_session';
const SYSTEM_CONFIG_KEY = 'pitstop_system_config_v1';

const LOCAL_DB_KEYS = {
  VEHICLES: 'pitstop_local_db_veiculos_v1',
  STATIONS: 'pitstop_local_db_postos_v1',
  FUEL_LOGS: 'pitstop_local_db_abastecimentos_v1',
  MAINTENANCE: 'pitstop_local_db_manutencoes_v1',
  EXPENSES: 'pitstop_local_db_despesas_extras_v1',
  CALIBRATIONS: 'pitstop_local_db_calibragens_v1',
};

interface LocalUserRecord {
  id: string;
  email: string;
  password: string;
  nome: string;
  avatar: string;
  tour_concluido: boolean;
  created_at: string;
  role?: UserRole;
  status?: UserStatus;
  plan?: SubscriptionPlan;
  plan_expires_at?: string | null;
  last_login_at?: string;
}

type OwnedRecord<T> = T & {
  userId: string;
  createdAt?: string;
};

let currentMode: PersistenceMode = isSupabaseConfigured ? 'cloud' : 'local';
const modeListeners = new Set<(mode: PersistenceMode) => void>();

export function getPersistenceMode(): PersistenceMode {
  return currentMode;
}

export function setPersistenceMode(nextMode: PersistenceMode): void {
  if (currentMode === nextMode) return;
  currentMode = nextMode;
  modeListeners.forEach(listener => {
    try {
      listener(nextMode);
    } catch {
      // Ignore listener error
    }
  });
}

export function subscribePersistenceMode(listener: (mode: PersistenceMode) => void): () => void {
  modeListeners.add(listener);
  return () => {
    modeListeners.delete(listener);
  };
}

/**
 * Identifica falhas de rede / bloqueio de fetch do sandbox de preview (ex: TypeError: Failed to fetch).
 * Erros reais de autenticação ou regras Postgres/RLS NÃO retornam true.
 */
export function isNetworkFetchError(err: unknown): boolean {
  if (!err) return false;
  const rawMessage =
    typeof err === 'string'
      ? err
      : err instanceof Error
      ? `${err.name} ${err.message}`
      : typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : String(err);

  return /failed to fetch|load failed|networkerror|fetch failed|network request failed|err_name_not_resolved|err_connection|connection refused|the internet connection appears to be offline/i.test(
    rawMessage
  );
}

/**
 * Identifica erro de tabela ainda não criada no Supabase (ex: PGRST205 / 42P01).
 */
export function isMissingTableError(err: unknown): boolean {
  if (!err) return false;
  const code =
    typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  if (code === 'PGRST205' || code === '42P01') return true;
  const rawMessage =
    typeof err === 'string'
      ? err
      : err instanceof Error
      ? err.message
      : typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : String(err);
  return /could not find the table .* in the schema cache|relation .* does not exist/i.test(
    rawMessage
  );
}

// ==============================================================================
// HELPERS DE ARMAZENAMENTO LOCAL (ISOLADO POR userId)
// ==============================================================================

function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map(item => [item.id, item])).values());
}

function readLocalUsers(): LocalUserRecord[] {
  const users = readStorageJson<LocalUserRecord[]>(LOCAL_USERS_KEY, []);
  if (!Array.isArray(users)) return [];
  return users.map((u, idx) => ({
    ...u,
    role: u.role || (idx === 0 || isMasterAdminEmail(u.email) ? 'admin' : 'user'),
    status: u.status || 'active',
    plan: u.plan || 'free',
    plan_expires_at: u.plan_expires_at ?? null,
    last_login_at: u.last_login_at || u.created_at || new Date().toISOString(),
  }));
}

function writeLocalUsers(users: LocalUserRecord[]): void {
  writeStorageJson(LOCAL_USERS_KEY, users);
}

export function isBlockedStatus(raw: {
  status?: unknown;
  bloqueado?: unknown;
  email?: unknown;
}): boolean {
  if (typeof raw.email === 'string' && isMasterAdminEmail(raw.email)) {
    return false;
  }
  return (
    raw.status === 'blocked' ||
    raw.status === 'bloqueado' ||
    raw.bloqueado === true
  );
}

function readLocalSession(): LocalUserRecord | null {
  const session = readStorageJson<LocalUserRecord | null>(LOCAL_SESSION_KEY, null);
  if (!session || !session.id || !session.email) return null;
  const users = readLocalUsers();
  const latest =
    users.find(u => u.id === session.id) ||
    users.find(u => u.email.toLowerCase() === session.email.toLowerCase());
  return latest || session;
}

function writeLocalSession(user: LocalUserRecord | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      window.localStorage?.removeItem(LOCAL_SESSION_KEY);
    } else {
      window.localStorage?.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    }
  } catch {
    // Ignore storage errors
  }
}

function mapLocalUserToAuthUser(record: LocalUserRecord, index = 0): AuthUser {
  const localAvatar = getLocalUserAvatar(record.id);
  const resolvedAvatar =
    localAvatar !== null
      ? localAvatar
      : record.avatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(record.id)}`;

  const resolvedRole: UserRole =
    record.role || (index === 0 || isMasterAdminEmail(record.email) ? 'admin' : 'user');
  const resolvedStatus: UserStatus = isBlockedStatus(record) ? 'blocked' : 'active';

  return {
    id: record.id,
    email: record.email,
    nome: record.nome || record.email.split('@')[0] || 'Piloto PitStop',
    avatar: resolvedAvatar,
    dataCriacao: record.created_at || new Date().toISOString(),
    isGuest: false,
    tourConcluido: Boolean(record.tour_concluido),
    role: resolvedRole,
    status: resolvedStatus,
    plan: record.plan || 'free',
    planExpiresAt: record.plan_expires_at ?? null,
    lastLoginAt: record.last_login_at || record.created_at || new Date().toISOString(),
  };
}

function stripOwnership<T extends { userId?: string; createdAt?: string }>(
  record: T,
  keepCreatedAt = false
): Omit<T, 'userId'> {
  const copy = { ...record };
  delete copy.userId;
  if (!keepCreatedAt) {
    delete copy.createdAt;
  }
  return copy;
}

function readCollection<T extends { id: string }>(key: string): OwnedRecord<T>[] {
  const list = readStorageJson<OwnedRecord<T>[]>(key, []);
  return Array.isArray(list) ? list : [];
}

function writeCollection<T extends { id: string }>(key: string, items: OwnedRecord<T>[]): void {
  writeStorageJson(key, items);
}

// ==============================================================================
// AUTENTICAÇÃO UNIFICADA (SUPABASE AUTH + FALLBACK LOCAL)
// ==============================================================================

export interface AdapterSessionResult {
  user: AuthUser | null;
  mode: PersistenceMode;
  error?: string;
}

export const BLOCKED_AUTH_SESSION_STORAGE_KEY = 'pitstop_auth_blocked_msg';
export const BLOCKED_LOGIN_ERROR_MESSAGE =
  'Seu acesso está suspenso pelo administrador. Entre em contato com o suporte.';

export function persistBlockedAuthMessage(msg = BLOCKED_LOGIN_ERROR_MESSAGE): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(BLOCKED_AUTH_SESSION_STORAGE_KEY, msg);
    }
  } catch {
    // Ignore sessionStorage errors
  }
}

export function readBlockedAuthMessage(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(BLOCKED_AUTH_SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore sessionStorage errors
  }
  return null;
}

export function clearBlockedAuthMessage(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(BLOCKED_AUTH_SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore sessionStorage errors
  }
}

function findLocalUserByIdOrEmail(userId: string, email?: string): LocalUserRecord | undefined {
  const users = readLocalUsers();
  const cleanEmail = email?.trim().toLowerCase();
  return (
    users.find(u => u.id === userId) ||
    (cleanEmail ? users.find(u => u.email.toLowerCase() === cleanEmail) : undefined)
  );
}

export async function adapterHydrateAuthUserProfile(baseUser: AuthUser): Promise<AuthUser> {
  // Administrador principal nunca é bloqueado
  if (isMasterAdminEmail(baseUser.email)) {
    return { ...baseUser, role: 'admin', status: 'active' };
  }

  // Verifica status local como fallback/cache
  const localMatch = findLocalUserByIdOrEmail(baseUser.id, baseUser.email);
  let resolvedStatus: UserStatus =
    isBlockedStatus({ status: baseUser.status, email: baseUser.email }) ||
    (localMatch ? isBlockedStatus(localMatch) : false)
      ? 'blocked'
      : 'active';
  let resolvedRole: UserRole = localMatch?.role || baseUser.role;
  let resolvedPlan: SubscriptionPlan = localMatch?.plan || baseUser.plan;
  let resolvedPlanExpiresAt =
    localMatch?.plan_expires_at !== undefined
      ? localMatch.plan_expires_at
      : baseUser.planExpiresAt ?? null;

  if (currentMode === 'cloud' && isSupabaseConfigured) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, status, plan, plan_expires_at')
        .eq('id', baseUser.id)
        .maybeSingle();

      if (!error && profile) {
        resolvedStatus = isBlockedStatus({
          status: profile.status,
          email: baseUser.email,
        })
          ? 'blocked'
          : 'active';
        if (profile.role === 'admin' || profile.role === 'user') {
          resolvedRole = profile.role;
        }
        if (
          profile.plan === 'free' ||
          profile.plan === 'pro_monthly' ||
          profile.plan === 'pro_annual' ||
          profile.plan === 'lifetime'
        ) {
          resolvedPlan = profile.plan;
        }
        resolvedPlanExpiresAt = profile.plan_expires_at ?? null;

        // Mantém registro local sincronizado com o status real do Supabase
        if (localMatch) {
          writeLocalUsers(
            readLocalUsers().map(u =>
              u.id === localMatch.id
                ? {
                    ...u,
                    status: resolvedStatus,
                    role: resolvedRole,
                    plan: resolvedPlan,
                    plan_expires_at: resolvedPlanExpiresAt,
                  }
                : u
            )
          );
        }
      } else if (error && isNetworkFetchError(error)) {
        setPersistenceMode('local');
      }
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setPersistenceMode('local');
      }
    }
  }

  return {
    ...baseUser,
    role: resolvedRole,
    status: resolvedStatus,
    plan: resolvedPlan,
    planExpiresAt: resolvedPlanExpiresAt,
  };
}

export async function adapterRefreshAuthUserStatus(currentUser: AuthUser): Promise<AuthUser> {
  if (currentMode === 'local' || !isSupabaseConfigured) {
    const users = readLocalUsers();
    const idx = users.findIndex(
      u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (idx >= 0) {
      return mapLocalUserToAuthUser(users[idx], idx);
    }
    return isMasterAdminEmail(currentUser.email)
      ? { ...currentUser, role: 'admin', status: 'active' }
      : currentUser;
  }

  return adapterHydrateAuthUserProfile(currentUser);
}

export async function adapterGetSession(): Promise<AdapterSessionResult> {
  if (currentMode === 'local' || !isSupabaseConfigured) {
    setPersistenceMode('local');
    const localSession = readLocalSession();
    const users = readLocalUsers();
    const idx = localSession ? users.findIndex(u => u.id === localSession.id) : -1;
    return {
      user: localSession ? mapLocalUserToAuthUser(localSession, idx >= 0 ? idx : 0) : null,
      mode: 'local',
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (isNetworkFetchError(error)) {
        setPersistenceMode('local');
        const localSession = readLocalSession();
        const users = readLocalUsers();
        const idx = localSession ? users.findIndex(u => u.id === localSession.id) : -1;
        return {
          user: localSession ? mapLocalUserToAuthUser(localSession, idx >= 0 ? idx : 0) : null,
          mode: 'local',
        };
      }
      return { user: null, mode: 'cloud', error: error.message };
    }

    if (!data.session?.user) {
      return { user: null, mode: 'cloud' };
    }

    const hydratedUser = await adapterHydrateAuthUserProfile(
      mapSupabaseUserToAuthUser(data.session.user)
    );
    return {
      user: hydratedUser,
      mode: getPersistenceMode(),
    };
  } catch (err) {
    if (isNetworkFetchError(err)) {
      setPersistenceMode('local');
      const localSession = readLocalSession();
      const users = readLocalUsers();
      const idx = localSession ? users.findIndex(u => u.id === localSession.id) : -1;
      return {
        user: localSession ? mapLocalUserToAuthUser(localSession, idx >= 0 ? idx : 0) : null,
        mode: 'local',
      };
    }
    return {
      user: null,
      mode: 'cloud',
      error: err instanceof Error ? err.message : 'Erro ao verificar sessão.',
    };
  }
}

function performLocalSignIn(
  email: string,
  password: string
): { user: AuthUser | null; error: string | null } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  const users = readLocalUsers();
  const foundIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
  const found = foundIndex >= 0 ? users[foundIndex] : undefined;

  if (!found || found.password !== cleanPass) {
    return { user: null, error: 'E-mail ou senha incorretos.' };
  }

  if (isBlockedStatus(found)) {
    persistBlockedAuthMessage(BLOCKED_LOGIN_ERROR_MESSAGE);
    writeLocalSession(null);
    return {
      user: null,
      error: BLOCKED_LOGIN_ERROR_MESSAGE,
    };
  }

  const now = new Date().toISOString();
  const updatedRecord: LocalUserRecord = {
    ...found,
    last_login_at: now,
  };
  writeLocalUsers(users.map(u => (u.id === found.id ? updatedRecord : u)));
  writeLocalSession(updatedRecord);
  return { user: mapLocalUserToAuthUser(updatedRecord, foundIndex), error: null };
}

export async function adapterSignIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (currentMode === 'local' || !isSupabaseConfigured) {
    setPersistenceMode('local');
    return performLocalSignIn(cleanEmail, cleanPass);
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error) {
      if (isNetworkFetchError(error)) {
        setPersistenceMode('local');
        return performLocalSignIn(cleanEmail, cleanPass);
      }
      return { user: null, error: translateAuthError(error) };
    }

    if (data?.user) {
      const hydratedUser = await adapterHydrateAuthUserProfile(
        mapSupabaseUserToAuthUser(data.user)
      );

      if (isBlockedStatus({ status: hydratedUser.status, email: hydratedUser.email })) {
        persistBlockedAuthMessage(BLOCKED_LOGIN_ERROR_MESSAGE);
        writeLocalSession(null);
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore signOut cleanup errors
        }
        return {
          user: null,
          error: BLOCKED_LOGIN_ERROR_MESSAGE,
        };
      }

      return { user: hydratedUser, error: null };
    }

    return {
      user: null,
      error: 'Não foi possível obter a sessão do usuário. Tente novamente.',
    };
  } catch (err) {
    if (isNetworkFetchError(err)) {
      setPersistenceMode('local');
      return performLocalSignIn(cleanEmail, cleanPass);
    }
    const msg = err instanceof Error ? err.message : 'Erro ao conectar ao servidor.';
    return { user: null, error: translateAuthError(msg) };
  }
}

function performLocalSignUp(
  email: string,
  password: string,
  metadata: { nome: string; avatar?: string }
): { user: AuthUser | null; hasSession: boolean; error: string | null } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  const users = readLocalUsers();

  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return {
      user: null,
      hasSession: false,
      error: 'Este e-mail já está cadastrado. Alterne para a aba "Entrar".',
    };
  }

  const newId = generateUUID();
  const now = new Date().toISOString();
  const assignedRole: UserRole =
    users.length === 0 || isMasterAdminEmail(cleanEmail) ? 'admin' : 'user';

  const newRecord: LocalUserRecord = {
    id: newId,
    email: cleanEmail,
    password: cleanPass,
    nome: metadata.nome.trim() || cleanEmail.split('@')[0] || 'Piloto PitStop',
    avatar:
      metadata.avatar ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(metadata.nome || newId)}`,
    tour_concluido: false,
    created_at: now,
    role: assignedRole,
    status: 'active',
    plan: 'free',
    plan_expires_at: null,
    last_login_at: now,
  };

  writeLocalUsers([...users, newRecord]);
  writeLocalSession(newRecord);

  return {
    user: mapLocalUserToAuthUser(newRecord, users.length),
    hasSession: true,
    error: null,
  };
}

export async function adapterSignUp(
  email: string,
  password: string,
  metadata: { nome: string; avatar?: string }
): Promise<{ user: AuthUser | null; hasSession: boolean; error: string | null }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (currentMode === 'local' || !isSupabaseConfigured) {
    setPersistenceMode('local');
    return performLocalSignUp(cleanEmail, cleanPass, metadata);
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPass,
      options: {
        data: {
          nome: metadata.nome,
          avatar: metadata.avatar,
        },
      },
    });

    if (error) {
      if (isNetworkFetchError(error)) {
        setPersistenceMode('local');
        return performLocalSignUp(cleanEmail, cleanPass, metadata);
      }
      return { user: null, hasSession: false, error: translateAuthError(error) };
    }

    if (data?.session && data?.user) {
      return {
        user: mapSupabaseUserToAuthUser(data.user),
        hasSession: true,
        error: null,
      };
    }

    if (data?.user) {
      return {
        user: mapSupabaseUserToAuthUser(data.user),
        hasSession: false,
        error: null,
      };
    }

    return { user: null, hasSession: false, error: null };
  } catch (err) {
    if (isNetworkFetchError(err)) {
      setPersistenceMode('local');
      return performLocalSignUp(cleanEmail, cleanPass, metadata);
    }
    const msg = err instanceof Error ? err.message : 'Erro ao registrar conta.';
    return { user: null, hasSession: false, error: translateAuthError(msg) };
  }
}

export async function adapterSignOut(): Promise<void> {
  writeLocalSession(null);

  if (currentMode === 'cloud' && isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error && isNetworkFetchError(error)) {
        setPersistenceMode('local');
      } else if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setPersistenceMode('local');
        return;
      }
      throw err;
    }
  }
}

function updateLocalUserMetadata(
  userId: string,
  updates: { nome?: string; avatar?: string; avatar_url?: string; tour_concluido?: boolean }
): void {
  const users = readLocalUsers();
  const nextAvatar =
    updates.avatar !== undefined
      ? updates.avatar
      : updates.avatar_url !== undefined
      ? updates.avatar_url
      : undefined;

  const updatedUsers = users.map(u => {
    if (u.id !== userId) return u;
    return {
      ...u,
      ...(updates.nome !== undefined ? { nome: updates.nome } : {}),
      ...(nextAvatar !== undefined ? { avatar: nextAvatar } : {}),
      ...(updates.tour_concluido !== undefined ? { tour_concluido: updates.tour_concluido } : {}),
    };
  });
  writeLocalUsers(updatedUsers);

  const session = readLocalSession();
  if (session && session.id === userId) {
    writeLocalSession({
      ...session,
      ...(updates.nome !== undefined ? { nome: updates.nome } : {}),
      ...(nextAvatar !== undefined ? { avatar: nextAvatar } : {}),
      ...(updates.tour_concluido !== undefined ? { tour_concluido: updates.tour_concluido } : {}),
    });
  }
}

export async function adapterUpdateUser(
  userId: string,
  updates: { nome?: string; avatar?: string; avatar_url?: string; tour_concluido?: boolean }
): Promise<void> {
  updateLocalUserMetadata(userId, updates);

  if (currentMode === 'local' || !isSupabaseConfigured) {
    setPersistenceMode('local');
    return;
  }

  try {
    const { error } = await supabase.auth.updateUser({
      data: updates,
    });
    if (error) {
      if (isNetworkFetchError(error)) {
        setPersistenceMode('local');
        return;
      }
      throw new Error(error.message);
    }
  } catch (err) {
    if (isNetworkFetchError(err)) {
      setPersistenceMode('local');
      return;
    }
    throw err;
  }
}

// ==============================================================================
// OPERAÇÕES LOCAIS DE CRUD PARA TODAS AS 6 ENTIDADES
// ==============================================================================

function fetchLocalUserData(userId: string): FetchUserDataResult {
  const vehicles = dedupeById(
    readCollection<Vehicle>(LOCAL_DB_KEYS.VEHICLES)
      .filter(r => r.userId === userId)
      .map(r => stripOwnership(r) as Vehicle)
  );

  const fuelLogs = dedupeById(
    readCollection<FuelLog>(LOCAL_DB_KEYS.FUEL_LOGS)
      .filter(r => r.userId === userId)
      .map(r => stripOwnership(r) as FuelLog)
  ).sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    return dateDiff !== 0 ? dateDiff : a.odometer - b.odometer;
  });

  const maintenanceItems = dedupeById(
    readCollection<MaintenanceItem>(LOCAL_DB_KEYS.MAINTENANCE)
      .filter(r => r.userId === userId)
      .map(r => stripOwnership(r) as MaintenanceItem)
  );

  const extraExpenses = dedupeById(
    readCollection<ExtraExpense>(LOCAL_DB_KEYS.EXPENSES)
      .filter(r => r.userId === userId)
      .map(r => stripOwnership(r) as ExtraExpense)
  ).sort((a, b) => b.date.localeCompare(a.date));

  const tireCalibrations = dedupeById(
    readCollection<TireCalibrationLog>(LOCAL_DB_KEYS.CALIBRATIONS)
      .filter(r => r.userId === userId)
      .map(r => stripOwnership(r) as TireCalibrationLog)
  ).sort((a, b) => b.date.localeCompare(a.date));

  const stations = dedupeById(
    readCollection<GasStation>(LOCAL_DB_KEYS.STATIONS)
      .filter(r => r.userId === userId)
      .map(r => stripOwnership(r, true) as GasStation)
  );

  return {
    vehicles,
    fuelLogs,
    maintenanceItems,
    extraExpenses,
    tireCalibrations,
    stations,
  };
}

function insertLocalVehicle(userId: string, vehicle: Omit<Vehicle, 'id'>): Vehicle {
  const created: Vehicle = {
    ...vehicle,
    id: generateUUID(),
  };
  const all = readCollection<Vehicle>(LOCAL_DB_KEYS.VEHICLES);
  writeCollection(LOCAL_DB_KEYS.VEHICLES, [...all, { ...created, userId }]);
  return created;
}

function updateLocalVehicle(userId: string, vehicle: Vehicle): Vehicle {
  const all = readCollection<Vehicle>(LOCAL_DB_KEYS.VEHICLES);
  const exists = all.some(r => r.id === vehicle.id && r.userId === userId);
  const next = exists
    ? all.map(r => (r.id === vehicle.id && r.userId === userId ? { ...vehicle, userId } : r))
    : [...all, { ...vehicle, userId }];
  writeCollection(LOCAL_DB_KEYS.VEHICLES, next);
  return vehicle;
}

function deleteLocalVehicle(userId: string, vehicleId: string): void {
  writeCollection(
    LOCAL_DB_KEYS.VEHICLES,
    readCollection<Vehicle>(LOCAL_DB_KEYS.VEHICLES).filter(
      r => !(r.id === vehicleId && r.userId === userId)
    )
  );
  // Cascade delete identically to ON DELETE CASCADE in Postgres
  writeCollection(
    LOCAL_DB_KEYS.FUEL_LOGS,
    readCollection<FuelLog>(LOCAL_DB_KEYS.FUEL_LOGS).filter(
      r => !(r.vehicleId === vehicleId && r.userId === userId)
    )
  );
  writeCollection(
    LOCAL_DB_KEYS.MAINTENANCE,
    readCollection<MaintenanceItem>(LOCAL_DB_KEYS.MAINTENANCE).filter(
      r => !(r.vehicleId === vehicleId && r.userId === userId)
    )
  );
  writeCollection(
    LOCAL_DB_KEYS.EXPENSES,
    readCollection<ExtraExpense>(LOCAL_DB_KEYS.EXPENSES).filter(
      r => !(r.vehicleId === vehicleId && r.userId === userId)
    )
  );
  writeCollection(
    LOCAL_DB_KEYS.CALIBRATIONS,
    readCollection<TireCalibrationLog>(LOCAL_DB_KEYS.CALIBRATIONS).filter(
      r => !(r.vehicleId === vehicleId && r.userId === userId)
    )
  );
}

function insertLocalStation(userId: string, station: Omit<GasStation, 'id'>): GasStation {
  const now = new Date().toISOString();
  const created: GasStation = {
    ...station,
    id: generateUUID(),
    createdAt: station.createdAt || now,
    updatedAt: station.updatedAt || now,
  };
  const all = readCollection<GasStation>(LOCAL_DB_KEYS.STATIONS);
  writeCollection(LOCAL_DB_KEYS.STATIONS, [...all, { ...created, userId }]);
  return created;
}

function updateLocalStation(userId: string, station: GasStation): GasStation {
  const updated: GasStation = {
    ...station,
    updatedAt: new Date().toISOString(),
  };
  const all = readCollection<GasStation>(LOCAL_DB_KEYS.STATIONS);
  const exists = all.some(r => r.id === station.id && r.userId === userId);
  const next = exists
    ? all.map(r => (r.id === station.id && r.userId === userId ? { ...updated, userId } : r))
    : [...all, { ...updated, userId }];
  writeCollection(LOCAL_DB_KEYS.STATIONS, next);
  return updated;
}

function insertLocalFuelLog(userId: string, log: Omit<FuelLog, 'id'>): FuelLog {
  const created: FuelLog = {
    ...log,
    id: generateUUID(),
  };
  const all = readCollection<FuelLog>(LOCAL_DB_KEYS.FUEL_LOGS);
  writeCollection(LOCAL_DB_KEYS.FUEL_LOGS, [...all, { ...created, userId }]);
  return created;
}

function updateLocalFuelLog(userId: string, log: FuelLog): FuelLog {
  const all = readCollection<FuelLog>(LOCAL_DB_KEYS.FUEL_LOGS);
  const exists = all.some(r => r.id === log.id && r.userId === userId);
  const next = exists
    ? all.map(r => (r.id === log.id && r.userId === userId ? { ...log, userId } : r))
    : [...all, { ...log, userId }];
  writeCollection(LOCAL_DB_KEYS.FUEL_LOGS, next);
  return log;
}

function deleteLocalFuelLog(userId: string, logId: string): void {
  writeCollection(
    LOCAL_DB_KEYS.FUEL_LOGS,
    readCollection<FuelLog>(LOCAL_DB_KEYS.FUEL_LOGS).filter(
      r => !(r.id === logId && r.userId === userId)
    )
  );
}

function insertLocalMaintenance(userId: string, item: Omit<MaintenanceItem, 'id'>): MaintenanceItem {
  const created: MaintenanceItem = {
    ...item,
    id: generateUUID(),
  };
  const all = readCollection<MaintenanceItem>(LOCAL_DB_KEYS.MAINTENANCE);
  writeCollection(LOCAL_DB_KEYS.MAINTENANCE, [...all, { ...created, userId }]);
  return created;
}

function updateLocalMaintenance(userId: string, item: MaintenanceItem): MaintenanceItem {
  const all = readCollection<MaintenanceItem>(LOCAL_DB_KEYS.MAINTENANCE);
  const exists = all.some(r => r.id === item.id && r.userId === userId);
  const next = exists
    ? all.map(r => (r.id === item.id && r.userId === userId ? { ...item, userId } : r))
    : [...all, { ...item, userId }];
  writeCollection(LOCAL_DB_KEYS.MAINTENANCE, next);
  return item;
}

function deleteLocalMaintenance(userId: string, itemId: string): void {
  writeCollection(
    LOCAL_DB_KEYS.MAINTENANCE,
    readCollection<MaintenanceItem>(LOCAL_DB_KEYS.MAINTENANCE).filter(
      r => !(r.id === itemId && r.userId === userId)
    )
  );
}

function insertLocalExpense(userId: string, expense: Omit<ExtraExpense, 'id'>): ExtraExpense {
  const created: ExtraExpense = {
    ...expense,
    id: generateUUID(),
  };
  const all = readCollection<ExtraExpense>(LOCAL_DB_KEYS.EXPENSES);
  writeCollection(LOCAL_DB_KEYS.EXPENSES, [...all, { ...created, userId }]);
  return created;
}

function updateLocalExpense(userId: string, expense: ExtraExpense): ExtraExpense {
  const all = readCollection<ExtraExpense>(LOCAL_DB_KEYS.EXPENSES);
  const exists = all.some(r => r.id === expense.id && r.userId === userId);
  const next = exists
    ? all.map(r => (r.id === expense.id && r.userId === userId ? { ...expense, userId } : r))
    : [...all, { ...expense, userId }];
  writeCollection(LOCAL_DB_KEYS.EXPENSES, next);
  return expense;
}

function deleteLocalExpense(userId: string, expenseId: string): void {
  writeCollection(
    LOCAL_DB_KEYS.EXPENSES,
    readCollection<ExtraExpense>(LOCAL_DB_KEYS.EXPENSES).filter(
      r => !(r.id === expenseId && r.userId === userId)
    )
  );
}

function insertLocalTireCalibration(
  userId: string,
  calib: Omit<TireCalibrationLog, 'id'>
): TireCalibrationLog {
  const created: TireCalibrationLog = {
    ...calib,
    id: generateUUID(),
  };
  const all = readCollection<TireCalibrationLog>(LOCAL_DB_KEYS.CALIBRATIONS);
  writeCollection(LOCAL_DB_KEYS.CALIBRATIONS, [...all, { ...created, userId }]);
  return created;
}

function deleteLocalTireCalibration(userId: string, calibrationId: string): void {
  writeCollection(
    LOCAL_DB_KEYS.CALIBRATIONS,
    readCollection<TireCalibrationLog>(LOCAL_DB_KEYS.CALIBRATIONS).filter(
      r => !(r.id === calibrationId && r.userId === userId)
    )
  );
}

function importLocalBackup(
  userId: string,
  backup: BackupData
): { count: number; data: BackupData } {
  const vehicleIdMap: Record<string, string> = {};
  const savedVehicles: Vehicle[] = dedupeById(
    (backup.vehicles || []).map(v => {
      const validId = ensureUUID(v.id);
      vehicleIdMap[v.id] = validId;
      return { ...v, id: validId };
    })
  );

  const stationIdMap: Record<string, string> = {};
  const savedStations: GasStation[] = dedupeById(
    (backup.stations || []).map(s => {
      const validId = ensureUUID(s.id);
      stationIdMap[s.id] = validId;
      return { ...s, id: validId };
    })
  );

  const validSavedVehicleIds = new Set(savedVehicles.map(v => v.id));
  const resolveVehicleId = (legacyOrUuid: string): string | null => {
    if (legacyOrUuid && vehicleIdMap[legacyOrUuid]) return vehicleIdMap[legacyOrUuid];
    if (legacyOrUuid && validSavedVehicleIds.has(legacyOrUuid)) return legacyOrUuid;
    return savedVehicles[0]?.id || null;
  };

  const resolveStationId = (log: FuelLog): string | undefined => {
    if (log.stationId && stationIdMap[log.stationId]) return stationIdMap[log.stationId];
    const match = savedStations.find(
      s => s.name.trim().toLowerCase() === (log.stationName || '').trim().toLowerCase()
    );
    return match?.id;
  };

  const savedFuelLogs: FuelLog[] = dedupeById(
    (backup.fuelLogs || [])
      .map((l): FuelLog | null => {
        const targetVehId = resolveVehicleId(l.vehicleId);
        if (!targetVehId) return null;
        return {
          ...l,
          id: ensureUUID(l.id),
          vehicleId: targetVehId,
          stationId: resolveStationId(l),
        };
      })
      .filter((item): item is FuelLog => item !== null)
  );

  const savedMaintenance: MaintenanceItem[] = dedupeById(
    (backup.maintenanceItems || [])
      .map((m): MaintenanceItem | null => {
        const targetVehId = resolveVehicleId(m.vehicleId);
        if (!targetVehId) return null;
        return {
          ...m,
          id: ensureUUID(m.id),
          vehicleId: targetVehId,
        };
      })
      .filter((item): item is MaintenanceItem => item !== null)
  );

  const savedExpenses: ExtraExpense[] = dedupeById(
    (backup.extraExpenses || [])
      .map((e): ExtraExpense | null => {
        const targetVehId = resolveVehicleId(e.vehicleId);
        if (!targetVehId) return null;
        return {
          ...e,
          id: ensureUUID(e.id),
          vehicleId: targetVehId,
        };
      })
      .filter((item): item is ExtraExpense => item !== null)
  );

  const savedCalibrations: TireCalibrationLog[] = dedupeById(
    (backup.tireCalibrations || [])
      .map((c): TireCalibrationLog | null => {
        const targetVehId = resolveVehicleId(c.vehicleId);
        if (!targetVehId) return null;
        return {
          ...c,
          id: ensureUUID(c.id),
          vehicleId: targetVehId,
        };
      })
      .filter((item): item is TireCalibrationLog => item !== null)
  );

  // Merge replacing only current user's collections while preserving other local accounts
  const mergeForUser = <T extends { id: string }>(key: string, nextItems: T[]) => {
    const others = readCollection<T>(key).filter(r => r.userId !== userId);
    writeCollection(key, [...others, ...nextItems.map(item => ({ ...item, userId }))]);
  };

  mergeForUser(LOCAL_DB_KEYS.VEHICLES, savedVehicles);
  mergeForUser(LOCAL_DB_KEYS.STATIONS, savedStations);
  mergeForUser(LOCAL_DB_KEYS.FUEL_LOGS, savedFuelLogs);
  mergeForUser(LOCAL_DB_KEYS.MAINTENANCE, savedMaintenance);
  mergeForUser(LOCAL_DB_KEYS.EXPENSES, savedExpenses);
  mergeForUser(LOCAL_DB_KEYS.CALIBRATIONS, savedCalibrations);

  const count =
    savedVehicles.length +
    savedStations.length +
    savedFuelLogs.length +
    savedMaintenance.length +
    savedExpenses.length +
    savedCalibrations.length;

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

// ==============================================================================
// ORQUESTRADOR AUTOMÁTICO (TENTA NUVEM, FALLBACK SILENCIOSO PARA LOCAL)
// ==============================================================================

async function withAutoFallback<T>(cloudOp: () => Promise<T>, localOp: () => T): Promise<T> {
  if (currentMode === 'local' || !isSupabaseConfigured) {
    setPersistenceMode('local');
    return localOp();
  }

  try {
    return await cloudOp();
  } catch (err) {
    if (isNetworkFetchError(err)) {
      setPersistenceMode('local');
      return localOp();
    }
    throw err;
  }
}

export async function adapterFetchUserData(userId: string): Promise<FetchUserDataResult> {
  return withAutoFallback(
    () => fetchUserDataFromSupabase(userId),
    () => fetchLocalUserData(userId)
  );
}

export async function adapterInsertVehicle(
  userId: string,
  vehicle: Omit<Vehicle, 'id'>
): Promise<Vehicle> {
  return withAutoFallback(
    () => insertVehicleToSupabase(userId, vehicle),
    () => insertLocalVehicle(userId, vehicle)
  );
}

export async function adapterUpdateVehicle(userId: string, vehicle: Vehicle): Promise<Vehicle> {
  return withAutoFallback(
    () => updateVehicleInSupabase(userId, vehicle),
    () => updateLocalVehicle(userId, vehicle)
  );
}

export async function adapterDeleteVehicle(userId: string, vehicleId: string): Promise<void> {
  return withAutoFallback(
    () => deleteVehicleFromSupabase(userId, vehicleId),
    () => deleteLocalVehicle(userId, vehicleId)
  );
}

export async function adapterInsertStation(
  userId: string,
  station: Omit<GasStation, 'id'>
): Promise<GasStation> {
  return withAutoFallback(
    () => insertStationToSupabase(userId, station),
    () => insertLocalStation(userId, station)
  );
}

export async function adapterUpdateStation(userId: string, station: GasStation): Promise<GasStation> {
  return withAutoFallback(
    () => updateStationInSupabase(userId, station),
    () => updateLocalStation(userId, station)
  );
}

export async function adapterInsertFuelLog(
  userId: string,
  log: Omit<FuelLog, 'id'>
): Promise<FuelLog> {
  return withAutoFallback(
    () => insertFuelLogToSupabase(userId, log),
    () => insertLocalFuelLog(userId, log)
  );
}

export async function adapterUpdateFuelLog(userId: string, log: FuelLog): Promise<FuelLog> {
  return withAutoFallback(
    () => updateFuelLogInSupabase(userId, log),
    () => updateLocalFuelLog(userId, log)
  );
}

export async function adapterDeleteFuelLog(userId: string, logId: string): Promise<void> {
  return withAutoFallback(
    () => deleteFuelLogFromSupabase(userId, logId),
    () => deleteLocalFuelLog(userId, logId)
  );
}

export async function adapterInsertMaintenance(
  userId: string,
  item: Omit<MaintenanceItem, 'id'>
): Promise<MaintenanceItem> {
  return withAutoFallback(
    () => insertMaintenanceToSupabase(userId, item),
    () => insertLocalMaintenance(userId, item)
  );
}

export async function adapterUpdateMaintenance(
  userId: string,
  item: MaintenanceItem
): Promise<MaintenanceItem> {
  return withAutoFallback(
    () => updateMaintenanceInSupabase(userId, item),
    () => updateLocalMaintenance(userId, item)
  );
}

export async function adapterDeleteMaintenance(userId: string, itemId: string): Promise<void> {
  return withAutoFallback(
    () => deleteMaintenanceFromSupabase(userId, itemId),
    () => deleteLocalMaintenance(userId, itemId)
  );
}

export async function adapterInsertExpense(
  userId: string,
  expense: Omit<ExtraExpense, 'id'>
): Promise<ExtraExpense> {
  return withAutoFallback(
    () => insertExpenseToSupabase(userId, expense),
    () => insertLocalExpense(userId, expense)
  );
}

export async function adapterUpdateExpense(
  userId: string,
  expense: ExtraExpense
): Promise<ExtraExpense> {
  return withAutoFallback(
    () => updateExpenseInSupabase(userId, expense),
    () => updateLocalExpense(userId, expense)
  );
}

export async function adapterDeleteExpense(userId: string, expenseId: string): Promise<void> {
  return withAutoFallback(
    () => deleteExpenseFromSupabase(userId, expenseId),
    () => deleteLocalExpense(userId, expenseId)
  );
}

export async function adapterInsertTireCalibration(
  userId: string,
  calib: Omit<TireCalibrationLog, 'id'>
): Promise<TireCalibrationLog> {
  return withAutoFallback(
    () => insertTireCalibrationToSupabase(userId, calib),
    () => insertLocalTireCalibration(userId, calib)
  );
}

export async function adapterDeleteTireCalibration(
  userId: string,
  calibrationId: string
): Promise<void> {
  return withAutoFallback(
    () => deleteTireCalibrationFromSupabase(userId, calibrationId),
    () => deleteLocalTireCalibration(userId, calibrationId)
  );
}

export async function adapterImportBackup(
  userId: string,
  backup: BackupData
): Promise<{ count: number; data: BackupData }> {
  return withAutoFallback(
    () => importBackupIntoSupabase(userId, backup),
    () => importLocalBackup(userId, backup)
  );
}

// ==============================================================================
// MÓDULO ADMINISTRATIVO SAAS (ANALYTICS, USUÁRIOS, BACKUP GLOBAL & SISTEMA)
// ==============================================================================

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  announcement: {
    id: 'pitstop_global_msg_default',
    title: '',
    message: '',
    type: 'info',
    active: false,
    updatedAt: new Date().toISOString(),
  },
  maintenance: {
    enabled: false,
    message: 'Estamos realizando melhorias programadas no banco de dados. Voltamos em alguns minutos.',
    updatedAt: new Date().toISOString(),
  },
};

const systemConfigListeners = new Set<(config: SystemConfig) => void>();

export function subscribeSystemConfig(listener: (config: SystemConfig) => void): () => void {
  systemConfigListeners.add(listener);
  return () => {
    systemConfigListeners.delete(listener);
  };
}

function notifySystemConfigListeners(config: SystemConfig): void {
  systemConfigListeners.forEach(listener => {
    try {
      listener(config);
    } catch {
      // Ignore listener error
    }
  });
}

export function getLocalSystemConfig(): SystemConfig {
  const stored = readStorageJson<Partial<SystemConfig> | null>(SYSTEM_CONFIG_KEY, null);
  if (!stored) return DEFAULT_SYSTEM_CONFIG;
  return {
    announcement: {
      ...DEFAULT_SYSTEM_CONFIG.announcement,
      ...(stored.announcement || {}),
    },
    maintenance: {
      ...DEFAULT_SYSTEM_CONFIG.maintenance,
      ...(stored.maintenance || {}),
    },
  };
}

export async function adapterGetSystemConfig(): Promise<SystemConfig> {
  const localCfg = getLocalSystemConfig();

  if (currentMode === 'local' || !isSupabaseConfigured) {
    return localCfg;
  }

  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('announcement, maintenance')
      .eq('id', 'global')
      .maybeSingle();

    if (error) {
      if (isNetworkFetchError(error)) {
        setPersistenceMode('local');
      }
      return localCfg;
    }

    if (!data) return localCfg;

    const merged: SystemConfig = {
      announcement: {
        ...DEFAULT_SYSTEM_CONFIG.announcement,
        ...(data.announcement || {}),
      },
      maintenance: {
        ...DEFAULT_SYSTEM_CONFIG.maintenance,
        ...(data.maintenance || {}),
      },
    };
    writeStorageJson(SYSTEM_CONFIG_KEY, merged);
    return merged;
  } catch (err) {
    if (isNetworkFetchError(err)) {
      setPersistenceMode('local');
    }
    return localCfg;
  }
}

export async function adapterSaveSystemConfig(nextConfig: SystemConfig): Promise<SystemConfig> {
  writeStorageJson(SYSTEM_CONFIG_KEY, nextConfig);
  notifySystemConfigListeners(nextConfig);

  if (currentMode === 'cloud' && isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('system_config').upsert(
        {
          id: 'global',
          announcement: nextConfig.announcement,
          maintenance: nextConfig.maintenance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error && isNetworkFetchError(error)) {
        setPersistenceMode('local');
      }
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setPersistenceMode('local');
      }
    }
  }

  return nextConfig;
}

export interface AdminDashboardSnapshot {
  users: AdminUserSummary[];
  rawVehicles: OwnedRecord<Vehicle>[];
  rawFuelLogs: OwnedRecord<FuelLog>[];
  rawMaintenance: OwnedRecord<MaintenanceItem>[];
  rawExpenses: OwnedRecord<ExtraExpense>[];
  rawCalibrations: OwnedRecord<TireCalibrationLog>[];
  rawStations: OwnedRecord<GasStation>[];
  missingAdminTables?: boolean;
}

export async function adapterGetAdminDashboardData(currentUser?: AuthUser | null): Promise<AdminDashboardSnapshot> {
  let localUsers = readLocalUsers();
  let missingAdminTables = false;

  // Ensure current logged-in user appears in snapshot if running in cloud mode
  if (currentUser && !localUsers.some(u => u.id === currentUser.id)) {
    localUsers = [
      ...localUsers,
      {
        id: currentUser.id,
        email: currentUser.email,
        password: '',
        nome: currentUser.nome,
        avatar: currentUser.avatar || '',
        tour_concluido: Boolean(currentUser.tourConcluido),
        created_at: currentUser.dataCriacao,
        role: currentUser.role,
        status: currentUser.status,
        plan: currentUser.plan,
        plan_expires_at: currentUser.planExpiresAt ?? null,
        last_login_at: currentUser.lastLoginAt || currentUser.dataCriacao,
      },
    ];
  }

  // Try fetching user_profiles from Supabase if in cloud mode
  if (currentMode === 'cloud' && isSupabaseConfigured) {
    try {
      const { data: profileRows, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(profileRows) && profileRows.length > 0) {
        const mergedMap = new Map<string, LocalUserRecord>();
        localUsers.forEach(u => mergedMap.set(u.id, u));
        profileRows.forEach(p => {
          mergedMap.set(p.id, {
            id: p.id,
            email: p.email || '',
            password: '',
            nome: p.nome || p.email?.split('@')[0] || 'Piloto PitStop',
            avatar: '',
            tour_concluido: true,
            created_at: p.created_at || new Date().toISOString(),
            role: p.role === 'admin' || isMasterAdminEmail(p.email) ? 'admin' : 'user',
            status: isBlockedStatus(p) ? 'blocked' : 'active',
            plan: p.plan || 'free',
            plan_expires_at: p.plan_expires_at ?? null,
            last_login_at: p.last_login_at || p.created_at || new Date().toISOString(),
          });
        });
        localUsers = Array.from(mergedMap.values());
      } else if (error) {
        if (isNetworkFetchError(error)) {
          setPersistenceMode('local');
        } else if (isMissingTableError(error)) {
          missingAdminTables = true;
        }
      }
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setPersistenceMode('local');
      } else if (isMissingTableError(err)) {
        missingAdminTables = true;
      }
    }
  }

  const rawVehicles = readCollection<Vehicle>(LOCAL_DB_KEYS.VEHICLES);
  const rawFuelLogs = readCollection<FuelLog>(LOCAL_DB_KEYS.FUEL_LOGS);
  const rawMaintenance = readCollection<MaintenanceItem>(LOCAL_DB_KEYS.MAINTENANCE);
  const rawExpenses = readCollection<ExtraExpense>(LOCAL_DB_KEYS.EXPENSES);
  const rawCalibrations = readCollection<TireCalibrationLog>(LOCAL_DB_KEYS.CALIBRATIONS);
  const rawStations = readCollection<GasStation>(LOCAL_DB_KEYS.STATIONS);

  // If in cloud mode, fetch platform-wide records across all users from Supabase
  if (currentMode === 'cloud' && isSupabaseConfigured && currentUser) {
    try {
      const remoteData = await fetchAllPlatformDataFromSupabase();
      const cloudUserIds = new Set<string>([
        currentUser.id,
        ...localUsers.filter(u => !u.password).map(u => u.id),
      ]);
      const mergeRemote = <T extends { id: string }>(
        localList: OwnedRecord<T>[],
        remoteItems: (T & { userId: string })[]
      ): OwnedRecord<T>[] => {
        const authoritativeUsers = new Set<string>(cloudUserIds);
        remoteItems.forEach(item => {
          if (item.userId) authoritativeUsers.add(item.userId);
        });
        const localOnly = localList.filter(r => !authoritativeUsers.has(r.userId));
        return dedupeById([...remoteItems, ...localOnly]);
      };
      const mergedVeh = mergeRemote(rawVehicles, remoteData.vehicles);
      const mergedFuel = mergeRemote(rawFuelLogs, remoteData.fuelLogs);
      const mergedMaint = mergeRemote(rawMaintenance, remoteData.maintenanceItems);
      const mergedExp = mergeRemote(rawExpenses, remoteData.extraExpenses);
      const mergedCal = mergeRemote(rawCalibrations, remoteData.tireCalibrations);
      const mergedSta = mergeRemote(rawStations, remoteData.stations);

      return {
        ...buildSnapshot(
          localUsers,
          mergedVeh,
          mergedFuel,
          mergedMaint,
          mergedExp,
          mergedCal,
          mergedSta
        ),
        missingAdminTables,
      };
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setPersistenceMode('local');
      }
    }
  }

  return {
    ...buildSnapshot(
      localUsers,
      rawVehicles,
      rawFuelLogs,
      rawMaintenance,
      rawExpenses,
      rawCalibrations,
      rawStations
    ),
    missingAdminTables,
  };
}

function buildSnapshot(
  localUsers: LocalUserRecord[],
  rawVehicles: OwnedRecord<Vehicle>[],
  rawFuelLogs: OwnedRecord<FuelLog>[],
  rawMaintenance: OwnedRecord<MaintenanceItem>[],
  rawExpenses: OwnedRecord<ExtraExpense>[],
  rawCalibrations: OwnedRecord<TireCalibrationLog>[],
  rawStations: OwnedRecord<GasStation>[]
): AdminDashboardSnapshot {
  const users: AdminUserSummary[] = localUsers.map((record, idx) => {
    const authUser = mapLocalUserToAuthUser(record, idx);
    const userVehicles = rawVehicles.filter(v => v.userId === authUser.id);
    const userLogs = rawFuelLogs.filter(l => l.userId === authUser.id);
    const userMaint = rawMaintenance.filter(m => m.userId === authUser.id);
    const userExp = rawExpenses.filter(e => e.userId === authUser.id);
    const userCal = rawCalibrations.filter(c => c.userId === authUser.id);
    const userSta = rawStations.filter(s => s.userId === authUser.id);

    return {
      ...authUser,
      vehicleCount: userVehicles.length,
      fuelLogCount: userLogs.length,
      maintenanceCount: userMaint.length,
      expenseCount: userExp.length,
      calibrationCount: userCal.length,
      stationCount: userSta.length,
      totalLiters: Number(userLogs.reduce((acc, l) => acc + (Number(l.liters) || 0), 0).toFixed(1)),
    };
  });

  return {
    users,
    rawVehicles,
    rawFuelLogs,
    rawMaintenance,
    rawExpenses,
    rawCalibrations,
    rawStations,
  };
}

export interface AdminUserUpdateResult {
  persistedInCloud: boolean;
  schemaMissing: boolean;
  localOnlyUser?: boolean;
}

export async function adapterUpdateUserAdmin(
  targetUserId: string,
  patch: {
    status?: UserStatus;
    plan?: SubscriptionPlan;
    planExpiresAt?: string | null;
    role?: UserRole;
  },
  targetMeta?: {
    currentUserId?: string;
    email?: string;
    nome?: string;
  }
): Promise<AdminUserUpdateResult> {
  if (patch.status === 'blocked') {
    if (targetMeta?.currentUserId && targetUserId === targetMeta.currentUserId) {
      throw new Error('Você não pode bloquear sua própria conta ativa.');
    }
    if (isMasterAdminEmail(targetMeta?.email)) {
      throw new Error('Não é possível bloquear a conta do administrador principal.');
    }
  }

  const persistLocalUserPatch = () => {
    const users = readLocalUsers();
    const cleanEmail = targetMeta?.email?.trim().toLowerCase();
    const existingIndex = users.findIndex(
      u => u.id === targetUserId || (cleanEmail ? u.email.toLowerCase() === cleanEmail : false)
    );

    let updatedUsers: LocalUserRecord[];
    if (existingIndex >= 0) {
      updatedUsers = users.map((u, idx) => {
        if (idx !== existingIndex) return u;
        return {
          ...u,
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.plan !== undefined ? { plan: patch.plan } : {}),
          ...(patch.planExpiresAt !== undefined ? { plan_expires_at: patch.planExpiresAt } : {}),
          ...(patch.role !== undefined ? { role: patch.role } : {}),
        };
      });
    } else {
      const now = new Date().toISOString();
      const fallbackRecord: LocalUserRecord = {
        id: targetUserId,
        email: targetMeta?.email || '',
        password: '',
        nome: targetMeta?.nome || targetMeta?.email?.split('@')[0] || 'Piloto PitStop',
        avatar: '',
        tour_concluido: true,
        created_at: now,
        role: patch.role || (isMasterAdminEmail(targetMeta?.email) ? 'admin' : 'user'),
        status: patch.status || 'active',
        plan: patch.plan || 'free',
        plan_expires_at: patch.planExpiresAt ?? null,
        last_login_at: now,
      };
      updatedUsers = [...users, fallbackRecord];
    }

    writeLocalUsers(updatedUsers);

    const session = readLocalSession();
    if (
      session &&
      (session.id === targetUserId ||
        (cleanEmail && session.email.toLowerCase() === cleanEmail))
    ) {
      const refreshed = updatedUsers.find(
        u => u.id === session.id || u.email.toLowerCase() === session.email.toLowerCase()
      );
      if (refreshed) writeLocalSession(refreshed);
    }
  };

  if (currentMode === 'local' || !isSupabaseConfigured) {
    persistLocalUserPatch();
    return { persistedInCloud: false, schemaMissing: false };
  }

  const updatePayload: Record<string, unknown> = {
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.plan !== undefined ? { plan: patch.plan } : {}),
    ...(patch.planExpiresAt !== undefined ? { plan_expires_at: patch.planExpiresAt } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: updatedRows, error } = await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', targetUserId)
      .select('id, status');

    if (error) {
      if (isNetworkFetchError(error)) {
        setPersistenceMode('local');
        persistLocalUserPatch();
        return { persistedInCloud: false, schemaMissing: false };
      }
      if (isMissingTableError(error)) {
        persistLocalUserPatch();
        return { persistedInCloud: false, schemaMissing: true };
      }
      throw new Error(
        `Erro ao atualizar usuário no Supabase (${error.code || 'RLS'}): ${error.message}`
      );
    }

    // Caso o usuário ainda não possua linha em user_profiles, tenta criar/sincronizar
    if (!updatedRows || updatedRows.length === 0) {
      const { data: upsertedRows, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: targetUserId,
            email: targetMeta?.email || '',
            nome: targetMeta?.nome || targetMeta?.email?.split('@')[0] || 'Piloto PitStop',
            role: patch.role || (isMasterAdminEmail(targetMeta?.email) ? 'admin' : 'user'),
            status: patch.status || 'active',
            plan: patch.plan || 'free',
            plan_expires_at: patch.planExpiresAt ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('id, status');

      if (upsertError) {
        if (isNetworkFetchError(upsertError)) {
          setPersistenceMode('local');
          persistLocalUserPatch();
          return { persistedInCloud: false, schemaMissing: false };
        }
        if (isMissingTableError(upsertError)) {
          persistLocalUserPatch();
          return { persistedInCloud: false, schemaMissing: true };
        }
        if (upsertError.code === '23503') {
          persistLocalUserPatch();
          return { persistedInCloud: false, schemaMissing: false, localOnlyUser: true };
        }
        throw new Error(
          `Erro de permissão/RLS ao salvar perfil no Supabase (${upsertError.code || 'RLS'}): ${upsertError.message}`
        );
      }

      if (!upsertedRows || upsertedRows.length === 0) {
        throw new Error(
          'Nenhuma linha foi alterada no Supabase. Verifique as políticas de RLS da tabela user_profiles.'
        );
      }
    }

    // Atualiza também o cache local para consistência imediata
    persistLocalUserPatch();
    return { persistedInCloud: true, schemaMissing: false };
  } catch (err) {
    if (isNetworkFetchError(err)) {
      setPersistenceMode('local');
      persistLocalUserPatch();
      return { persistedInCloud: false, schemaMissing: false };
    }
    if (isMissingTableError(err)) {
      persistLocalUserPatch();
      return { persistedInCloud: false, schemaMissing: true };
    }
    throw err;
  }
}

export async function adapterDeleteUserAccount(
  targetUser: {
    id: string;
    email?: string;
    role?: UserRole;
  },
  currentUser?: AuthUser | null
): Promise<void> {
  const targetUserId = (targetUser?.id || '').trim();
  const cleanEmail = (targetUser?.email || '').trim().toLowerCase();

  if (!targetUserId) {
    throw new Error('Usuário alvo inválido para exclusão.');
  }

  if (currentUser && targetUserId === currentUser.id) {
    throw new Error('Você não pode excluir sua própria conta ativa.');
  }

  if (targetUser.role === 'admin' || isMasterAdminEmail(cleanEmail)) {
    throw new Error('Contas de administrador não podem ser excluídas.');
  }

  const existingLocal = findLocalUserByIdOrEmail(targetUserId, cleanEmail);
  if (
    existingLocal &&
    (existingLocal.role === 'admin' || isMasterAdminEmail(existingLocal.email))
  ) {
    throw new Error('Contas de administrador não podem ser excluídas.');
  }

  const purgeLocalUserAndData = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const matchedKeys = new Set<string>(
        Object.keys(window.localStorage).filter(k => k.includes(targetUserId))
      );
      if (typeof window.localStorage.length === 'number' && typeof window.localStorage.key === 'function') {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.includes(targetUserId)) {
            matchedKeys.add(key);
          }
        }
      }
      matchedKeys.forEach(key => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Ignore storage removal errors
        }
      });
    }

    const filterCollection = <T extends { id: string }>(key: string) => {
      const list = readCollection<T>(key);
      const next = list.filter(item => {
        const rec = item as OwnedRecord<T> & { user_id?: string };
        return rec.userId !== targetUserId && rec.user_id !== targetUserId;
      });
      writeCollection(key, next);
    };

    filterCollection<TireCalibrationLog>(LOCAL_DB_KEYS.CALIBRATIONS);
    filterCollection<ExtraExpense>(LOCAL_DB_KEYS.EXPENSES);
    filterCollection<MaintenanceItem>(LOCAL_DB_KEYS.MAINTENANCE);
    filterCollection<FuelLog>(LOCAL_DB_KEYS.FUEL_LOGS);
    filterCollection<GasStation>(LOCAL_DB_KEYS.STATIONS);
    filterCollection<Vehicle>(LOCAL_DB_KEYS.VEHICLES);

    const remainingUsers = readLocalUsers().filter(
      u => u.id !== targetUserId && (!cleanEmail || u.email.toLowerCase() !== cleanEmail)
    );
    writeLocalUsers(remainingUsers);

    const activeLocalSession = readLocalSession();
    if (
      activeLocalSession &&
      (activeLocalSession.id === targetUserId ||
        (cleanEmail && activeLocalSession.email.toLowerCase() === cleanEmail))
    ) {
      writeLocalSession(null);
    }
  };

  if (currentMode === 'local' || !isSupabaseConfigured) {
    purgeLocalUserAndData();
    return;
  }

  try {
    // 1. Limpa explicitamente todos os registros vinculados nas tabelas públicas
    const domainTables = [
      'calibragens',
      'despesas_extras',
      'manutencoes',
      'abastecimentos',
      'postos',
      'veiculos',
    ] as const;

    for (const table of domainTables) {
      const { error } = await supabase.from(table).delete().eq('user_id', targetUserId);
      if (error) {
        if (isNetworkFetchError(error)) {
          setPersistenceMode('local');
          purgeLocalUserAndData();
          return;
        }
        if (!isMissingTableError(error)) {
          throw new Error(
            `Erro ao remover dados de ${table} no Supabase (${error.code || 'RLS'}): ${error.message}`
          );
        }
      }
    }

    const { error: profileDeleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', targetUserId);

    if (profileDeleteError) {
      if (isNetworkFetchError(profileDeleteError)) {
        setPersistenceMode('local');
        purgeLocalUserAndData();
        return;
      }
      if (!isMissingTableError(profileDeleteError)) {
        throw new Error(
          `Erro ao remover perfil em user_profiles (${profileDeleteError.code || 'RLS'}): ${profileDeleteError.message}`
        );
      }
    }

    // 2. Invoca a RPC SECURITY DEFINER do banco para apagar a conta do auth.users
    const { error: rpcError } = await supabase.rpc('excluir_usuario_admin', {
      target_user_id: targetUserId,
    });

    if (rpcError) {
      if (isNetworkFetchError(rpcError)) {
        setPersistenceMode('local');
        purgeLocalUserAndData();
        return;
      }
      throw new Error(
        `Erro ao excluir usuário no Supabase (${rpcError.code || 'RPC'}): ${rpcError.message}`
      );
    }

    // 3. Limpa também qualquer resquício em cache/armazenamento local
    purgeLocalUserAndData();
  } catch (err) {
    if (isNetworkFetchError(err)) {
      setPersistenceMode('local');
      purgeLocalUserAndData();
      return;
    }
    throw err;
  }
}

export async function adapterResetUserPassword(targetUser: {
  id: string;
  email: string;
}): Promise<{
  mode: PersistenceMode;
  email: string;
  tempPassword?: string;
  resetLink?: string;
  message: string;
}> {
  const generateTempPass = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `PitStop-${code}`;
  };

  if (currentMode === 'cloud' && isSupabaseConfigured) {
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(targetUser.email, {
        redirectTo,
      });

      if (!error) {
        return {
          mode: 'cloud',
          email: targetUser.email,
          message: `E-mail oficial de redefinição enviado para ${targetUser.email} via Supabase Auth.`,
        };
      }

      if (!isNetworkFetchError(error)) {
        throw new Error(error.message);
      }
      setPersistenceMode('local');
    } catch (err) {
      if (!isNetworkFetchError(err)) {
        throw err;
      }
      setPersistenceMode('local');
    }
  }

  const tempPassword = generateTempPass();
  const users = readLocalUsers();
  writeLocalUsers(
    users.map(u =>
      u.id === targetUser.id || u.email.toLowerCase() === targetUser.email.toLowerCase()
        ? { ...u, password: tempPassword }
        : u
    )
  );

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pitstop.local';
  return {
    mode: 'local',
    email: targetUser.email,
    tempPassword,
    resetLink: `${origin}/?reset_email=${encodeURIComponent(targetUser.email)}`,
    message: `Senha temporária gerada no ambiente local para ${targetUser.email}.`,
  };
}

export async function adapterExportGlobalBackupJson(
  currentUser?: AuthUser | null
): Promise<SaasGlobalBackup> {
  const snap = await adapterGetAdminDashboardData(currentUser);

  const attachUserId = <T extends object>(items: OwnedRecord<T>[]) =>
    items.map(item => {
      const { userId, ...rest } = item as OwnedRecord<T>;
      return { ...(rest as T), user_id: userId };
    });

  return {
    versao: '1.5.0',
    data_exportacao: new Date().toISOString(),
    tipo: 'global',
    usuarios: snap.users.map(u => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      avatar: u.avatar,
      dataCriacao: u.dataCriacao,
      tourConcluido: u.tourConcluido,
      role: u.role,
      status: u.status,
      plan: u.plan,
      planExpiresAt: u.planExpiresAt,
      lastLoginAt: u.lastLoginAt,
    })),
    registros: {
      veiculos: attachUserId(snap.rawVehicles),
      abastecimentos: attachUserId(snap.rawFuelLogs),
      postos: attachUserId(snap.rawStations),
      manutencoes: attachUserId(snap.rawMaintenance),
      despesas_extras: attachUserId(snap.rawExpenses),
      calibragens: attachUserId(snap.rawCalibrations),
    },
  };
}

export async function adapterExportUserBackupJson(
  targetUserId: string,
  currentUser?: AuthUser | null
): Promise<SaasGlobalBackup> {
  const snap = await adapterGetAdminDashboardData(currentUser);
  const targetUser = snap.users.find(u => u.id === targetUserId);

  const filterAndMap = <T extends object>(items: OwnedRecord<T>[]) =>
    items
      .filter(i => i.userId === targetUserId)
      .map(item => {
        const { userId, ...rest } = item as OwnedRecord<T>;
        return { ...(rest as T), user_id: userId };
      });

  return {
    versao: '1.5.0',
    data_exportacao: new Date().toISOString(),
    tipo: 'usuario',
    usuario_alvo: targetUser
      ? { id: targetUser.id, nome: targetUser.nome, email: targetUser.email }
      : { id: targetUserId, nome: 'Usuário PitStop', email: '' },
    usuarios: targetUser ? [targetUser] : [],
    registros: {
      veiculos: filterAndMap(snap.rawVehicles),
      abastecimentos: filterAndMap(snap.rawFuelLogs),
      postos: filterAndMap(snap.rawStations),
      manutencoes: filterAndMap(snap.rawMaintenance),
      despesas_extras: filterAndMap(snap.rawExpenses),
      calibragens: filterAndMap(snap.rawCalibrations),
    },
  };
}

export interface ParsedAdminBackupPreview {
  format: 'global' | 'usuario' | 'classic';
  exportDate?: string;
  availableSourceUsers: Array<{ id: string; nome: string; email: string }>;
  detectedTargetUserId?: string;
  detectedTargetEmail?: string;
  extractForSourceUser: (sourceUserId?: string) => BackupData;
}

export function adapterParseAdminBackupJson(jsonText: string): ParsedAdminBackupPreview {
  const parsed = JSON.parse(jsonText);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Arquivo JSON inválido ou corrompido.');
  }

  // Format 1 & 2: SaasGlobalBackup
  if (parsed.registros && typeof parsed.registros === 'object') {
    const raw = parsed as SaasGlobalBackup;
    const usuarios = Array.isArray(raw.usuarios) ? raw.usuarios : [];
    const availableSourceUsers = usuarios.map(u => ({
      id: u.id,
      nome: u.nome || u.email || 'Usuário',
      email: u.email || '',
    }));

    const extractForSourceUser = (sourceUserId?: string): BackupData => {
      const filterByUser = <T extends { user_id?: string; userId?: string }>(arr: T[] = []) => {
        if (!sourceUserId) return arr;
        return arr.filter(item => (item.user_id || item.userId) === sourceUserId);
      };

      const stripOwner = <T extends { user_id?: string; userId?: string }>(item: T) => {
        const copy = { ...item };
        delete copy.user_id;
        delete copy.userId;
        return copy;
      };

      return {
        version: raw.versao || '1.5.0',
        exportDate: raw.data_exportacao || new Date().toISOString(),
        vehicles: filterByUser(raw.registros.veiculos || []).map(stripOwner) as Vehicle[],
        fuelLogs: filterByUser(raw.registros.abastecimentos || []).map(stripOwner) as FuelLog[],
        stations: filterByUser(raw.registros.postos || []).map(stripOwner) as GasStation[],
        maintenanceItems: filterByUser(raw.registros.manutencoes || []).map(
          stripOwner
        ) as MaintenanceItem[],
        extraExpenses: filterByUser(raw.registros.despesas_extras || []).map(
          stripOwner
        ) as ExtraExpense[],
        tireCalibrations: filterByUser(raw.registros.calibragens || []).map(
          stripOwner
        ) as TireCalibrationLog[],
      };
    };

    return {
      format: raw.tipo === 'global' ? 'global' : 'usuario',
      exportDate: raw.data_exportacao,
      availableSourceUsers,
      detectedTargetUserId: raw.usuario_alvo?.id || availableSourceUsers[0]?.id,
      detectedTargetEmail: raw.usuario_alvo?.email || availableSourceUsers[0]?.email,
      extractForSourceUser,
    };
  }

  // Format 3: Classic BackupData
  if (Array.isArray(parsed.vehicles) && Array.isArray(parsed.fuelLogs)) {
    const classic = parsed as BackupData;
    return {
      format: 'classic',
      exportDate: classic.exportDate,
      availableSourceUsers: [],
      extractForSourceUser: () => ({
        version: classic.version || '1.5.0',
        exportDate: classic.exportDate || new Date().toISOString(),
        vehicles: classic.vehicles || [],
        fuelLogs: classic.fuelLogs || [],
        maintenanceItems: classic.maintenanceItems || [],
        extraExpenses: classic.extraExpenses || [],
        tireCalibrations: classic.tireCalibrations || [],
        stations: classic.stations || [],
      }),
    };
  }

  throw new Error(
    'Estrutura JSON não reconhecida. Utilize um backup global, por usuário ou backup padrão do PitStop.'
  );
}

export async function adapterRestoreUserBackup(
  targetUserId: string,
  backup: BackupData,
  restoreMode: 'replace' | 'merge'
): Promise<{ count: number; data: BackupData }> {
  if (restoreMode === 'replace') {
    return adapterImportBackup(targetUserId, backup);
  }

  // Merge mode: combine existing user records with incoming records without duplicating IDs or natural fingerprints
  const existing = await adapterFetchUserData(targetUserId);

  const vehicleMap = new Map<string, Vehicle>();
  const vehicleSigMap = new Map<string, string>();
  existing.vehicles.forEach(v => {
    vehicleMap.set(v.id, v);
    vehicleSigMap.set(`${v.name.trim().toLowerCase()}|${v.plate.trim().toLowerCase()}`, v.id);
  });

  const remappedVehicleIds: Record<string, string> = {};
  (backup.vehicles || []).forEach(v => {
    const sig = `${(v.name || '').trim().toLowerCase()}|${(v.plate || '').trim().toLowerCase()}`;
    const existingById = vehicleMap.get(v.id);
    const existingIdBySig = vehicleSigMap.get(sig);
    if (existingById) {
      remappedVehicleIds[v.id] = existingById.id;
    } else if (existingIdBySig) {
      remappedVehicleIds[v.id] = existingIdBySig;
    } else {
      const validId = ensureUUID(v.id);
      remappedVehicleIds[v.id] = validId;
      vehicleMap.set(validId, { ...v, id: validId });
      vehicleSigMap.set(sig, validId);
    }
  });

  const stationMap = new Map<string, GasStation>();
  const stationSigMap = new Map<string, string>();
  existing.stations.forEach(s => {
    stationMap.set(s.id, s);
    stationSigMap.set(s.name.trim().toLowerCase(), s.id);
  });

  const remappedStationIds: Record<string, string> = {};
  (backup.stations || []).forEach(s => {
    const sig = (s.name || '').trim().toLowerCase();
    const existingById = stationMap.get(s.id);
    const existingIdBySig = stationSigMap.get(sig);
    if (existingById) {
      remappedStationIds[s.id] = existingById.id;
    } else if (existingIdBySig) {
      remappedStationIds[s.id] = existingIdBySig;
    } else {
      const validId = ensureUUID(s.id);
      remappedStationIds[s.id] = validId;
      stationMap.set(validId, { ...s, id: validId });
      stationSigMap.set(sig, validId);
    }
  });

  const mergedVehicles = Array.from(vehicleMap.values());
  const mergedStations = Array.from(stationMap.values());
  const resolveVehId = (rawId: string) =>
    remappedVehicleIds[rawId] ||
    (vehicleMap.has(rawId) ? rawId : mergedVehicles[0]?.id || '');

  // Fuel Logs merge
  const fuelMap = new Map<string, FuelLog>();
  const fuelSigs = new Set<string>();
  existing.fuelLogs.forEach(l => {
    fuelMap.set(l.id, l);
    fuelSigs.add(`${l.vehicleId}|${l.date}|${l.odometer}|${l.liters}`);
  });
  (backup.fuelLogs || []).forEach(l => {
    const targetVeh = resolveVehId(l.vehicleId);
    if (!targetVeh) return;
    const sig = `${targetVeh}|${l.date}|${l.odometer}|${l.liters}`;
    if (!fuelMap.has(l.id) && !fuelSigs.has(sig)) {
      const validId = ensureUUID(l.id);
      fuelMap.set(validId, {
        ...l,
        id: validId,
        vehicleId: targetVeh,
        stationId: l.stationId ? remappedStationIds[l.stationId] || l.stationId : undefined,
      });
      fuelSigs.add(sig);
    }
  });

  // Maintenance merge
  const maintMap = new Map<string, MaintenanceItem>();
  const maintSigs = new Set<string>();
  existing.maintenanceItems.forEach(m => {
    maintMap.set(m.id, m);
    maintSigs.add(`${m.vehicleId}|${m.title.trim().toLowerCase()}|${m.lastDoneDate}`);
  });
  (backup.maintenanceItems || []).forEach(m => {
    const targetVeh = resolveVehId(m.vehicleId);
    if (!targetVeh) return;
    const sig = `${targetVeh}|${(m.title || '').trim().toLowerCase()}|${m.lastDoneDate}`;
    if (!maintMap.has(m.id) && !maintSigs.has(sig)) {
      const validId = ensureUUID(m.id);
      maintMap.set(validId, { ...m, id: validId, vehicleId: targetVeh });
      maintSigs.add(sig);
    }
  });

  // Extra Expenses merge
  const expMap = new Map<string, ExtraExpense>();
  const expSigs = new Set<string>();
  existing.extraExpenses.forEach(e => {
    expMap.set(e.id, e);
    expSigs.add(`${e.vehicleId}|${e.date}|${e.description.trim().toLowerCase()}|${e.amount}`);
  });
  (backup.extraExpenses || []).forEach(e => {
    const targetVeh = resolveVehId(e.vehicleId);
    if (!targetVeh) return;
    const sig = `${targetVeh}|${e.date}|${(e.description || '').trim().toLowerCase()}|${e.amount}`;
    if (!expMap.has(e.id) && !expSigs.has(sig)) {
      const validId = ensureUUID(e.id);
      expMap.set(validId, { ...e, id: validId, vehicleId: targetVeh });
      expSigs.add(sig);
    }
  });

  // Tire Calibrations merge
  const calMap = new Map<string, TireCalibrationLog>();
  const calSigs = new Set<string>();
  existing.tireCalibrations.forEach(c => {
    calMap.set(c.id, c);
    calSigs.add(`${c.vehicleId}|${c.date}|${c.odometer}`);
  });
  (backup.tireCalibrations || []).forEach(c => {
    const targetVeh = resolveVehId(c.vehicleId);
    if (!targetVeh) return;
    const sig = `${targetVeh}|${c.date}|${c.odometer}`;
    if (!calMap.has(c.id) && !calSigs.has(sig)) {
      const validId = ensureUUID(c.id);
      calMap.set(validId, { ...c, id: validId, vehicleId: targetVeh });
      calSigs.add(sig);
    }
  });

  return adapterImportBackup(targetUserId, {
    version: backup.version || '1.5.0',
    exportDate: new Date().toISOString(),
    vehicles: mergedVehicles,
    stations: mergedStations,
    fuelLogs: Array.from(fuelMap.values()),
    maintenanceItems: Array.from(maintMap.values()),
    extraExpenses: Array.from(expMap.values()),
    tireCalibrations: Array.from(calMap.values()),
  });
}
