export {
  supabase,
  isSupabaseConfigured,
  generateUUID,
  isValidUUID,
  ensureUUID,
  fetchUserDataFromSupabase,
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
  mapSupabaseUserToAuthUser,
  translateAuthError,
  formatFriendlyNetworkError,
  getLocalUserAvatar,
  saveLocalUserAvatar,
} from '../lib/supabase';

import { isValidUUID, formatFriendlyNetworkError } from '../lib/supabase';
import {
  adapterGetSession,
  adapterFetchUserData,
  adapterImportBackup,
  getPersistenceMode,
} from '../lib/storageAdapter';
import {
  Vehicle,
  FuelLog,
  MaintenanceItem,
  ExtraExpense,
  TireCalibrationLog,
  GasStation,
  BackupData,
} from '../types';

/**
 * Script SQL limpo e completo para criar todas as tabelas do PitStop
 * em um banco Supabase totalmente zerado, com RLS ativo e políticas individuais.
 */
export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- PITSTOP - SCRIPT SQL COMPLETO (BANCO ZERADO + RLS INDIVIDUAL + ÍNDICES)
-- ==============================================================================

-- 1. TABELA DE VEÍCULOS
CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL DEFAULT 2024,
  plate TEXT NOT NULL DEFAULT '',
  initial_odometer NUMERIC NOT NULL DEFAULT 0,
  current_odometer NUMERIC NOT NULL DEFAULT 0,
  tank_capacity_liters NUMERIC NOT NULL DEFAULT 50,
  accepted_fuels JSONB NOT NULL DEFAULT '["gasolina_comum"]'::jsonb,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_default BOOLEAN NOT NULL DEFAULT false,
  front_tire_psi NUMERIC NOT NULL DEFAULT 32,
  rear_tire_psi NUMERIC NOT NULL DEFAULT 30,
  tire_calibration_days_interval INTEGER NOT NULL DEFAULT 15,
  tire_calibration_fills_interval INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA DE POSTOS DE COMBUSTÍVEL
CREATE TABLE public.postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Outro',
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA DE ABASTECIMENTOS
CREATE TABLE public.abastecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  posto_id UUID REFERENCES public.postos(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  odometer NUMERIC NOT NULL,
  fuel_type TEXT NOT NULL,
  liters NUMERIC NOT NULL,
  price_per_liter NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  is_full_tank BOOLEAN NOT NULL DEFAULT true,
  driving_profile TEXT NOT NULL DEFAULT 'misto',
  station_name TEXT,
  station_brand TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  notes TEXT,
  calculated_km_per_liter NUMERIC,
  calculated_cost_per_km NUMERIC,
  distance_traveled NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA DE MANUTENÇÕES PREVENTIVAS
CREATE TABLE public.manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  interval_km NUMERIC NOT NULL DEFAULT 10000,
  last_done_odometer NUMERIC NOT NULL DEFAULT 0,
  last_done_date DATE NOT NULL,
  next_due_odometer NUMERIC,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA DE DESPESAS EXTRAS
CREATE TABLE public.despesas_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  odometer NUMERIC,
  recurrence TEXT NOT NULL DEFAULT 'unica',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABELA DE CALIBRAGENS DE PNEUS
CREATE TABLE public.calibragens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  odometer NUMERIC NOT NULL,
  front_psi NUMERIC,
  rear_psi NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX idx_veiculos_user_id ON public.veiculos(user_id);

CREATE INDEX idx_postos_user_id ON public.postos(user_id);

CREATE INDEX idx_abastecimentos_user_id ON public.abastecimentos(user_id);
CREATE INDEX idx_abastecimentos_veiculo_id ON public.abastecimentos(veiculo_id);
CREATE INDEX idx_abastecimentos_posto_id ON public.abastecimentos(posto_id);
CREATE INDEX idx_abastecimentos_veiculo_date ON public.abastecimentos(veiculo_id, date DESC, odometer DESC);

CREATE INDEX idx_manutencoes_user_id ON public.manutencoes(user_id);
CREATE INDEX idx_manutencoes_veiculo_id ON public.manutencoes(veiculo_id);

CREATE INDEX idx_despesas_extras_user_id ON public.despesas_extras(user_id);
CREATE INDEX idx_despesas_extras_veiculo_id ON public.despesas_extras(veiculo_id);

CREATE INDEX idx_calibragens_user_id ON public.calibragens(user_id);
CREATE INDEX idx_calibragens_veiculo_id ON public.calibragens(veiculo_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) ATIVO EM 100% DAS TABELAS
-- ==============================================================================
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abastecimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibragens ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: public.veiculos
CREATE POLICY "veiculos_select_own" ON public.veiculos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "veiculos_insert_own" ON public.veiculos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "veiculos_update_own" ON public.veiculos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "veiculos_delete_own" ON public.veiculos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLÍTICAS: public.postos
CREATE POLICY "postos_select_own" ON public.postos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "postos_insert_own" ON public.postos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "postos_update_own" ON public.postos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "postos_delete_own" ON public.postos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLÍTICAS: public.abastecimentos
CREATE POLICY "abastecimentos_select_own" ON public.abastecimentos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "abastecimentos_insert_own" ON public.abastecimentos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "abastecimentos_update_own" ON public.abastecimentos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "abastecimentos_delete_own" ON public.abastecimentos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLÍTICAS: public.manutencoes
CREATE POLICY "manutencoes_select_own" ON public.manutencoes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "manutencoes_insert_own" ON public.manutencoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "manutencoes_update_own" ON public.manutencoes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "manutencoes_delete_own" ON public.manutencoes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLÍTICAS: public.despesas_extras
CREATE POLICY "despesas_extras_select_own" ON public.despesas_extras
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "despesas_extras_insert_own" ON public.despesas_extras
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "despesas_extras_update_own" ON public.despesas_extras
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "despesas_extras_delete_own" ON public.despesas_extras
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLÍTICAS: public.calibragens
CREATE POLICY "calibragens_select_own" ON public.calibragens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "calibragens_insert_own" ON public.calibragens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calibragens_update_own" ON public.calibragens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calibragens_delete_own" ON public.calibragens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. TABELA DE PERFIS & ASSINATURAS SAAS (BACKOFFICE ADMIN)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro_monthly', 'pro_annual', 'lifetime')),
  plan_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 8. FUNÇÃO AUXILIAR NÃO-RECURSIVA PARA ADMIN NO RLS
CREATE OR REPLACE FUNCTION public.is_pitstop_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'diegomarques.mat@gmail.com',
      'admin@pitstop.app',
      'admin@itspitstop.com'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    );
$$;

DROP POLICY IF EXISTS "user_profiles_select_own_or_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own_or_admin" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "user_profiles_insert_own_or_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own_or_admin" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pitstop_admin()
    OR (auth.uid() = id AND role = 'user' AND status = 'active' AND plan = 'free')
  );

DROP POLICY IF EXISTS "user_profiles_update_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own_or_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_update_admin" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (public.is_pitstop_admin())
  WITH CHECK (public.is_pitstop_admin());

CREATE OR REPLACE FUNCTION public.handle_pitstop_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, nome, role, status, plan, created_at, updated_at)
  VALUES (
    NEW.id,
    coalesce(NEW.email, ''),
    coalesce(NEW.raw_user_meta_data ->> 'nome', split_part(coalesce(NEW.email, ''), '@', 1), 'Piloto PitStop'),
    CASE
      WHEN lower(coalesce(NEW.email, '')) IN ('diegomarques.mat@gmail.com', 'admin@pitstop.app', 'admin@itspitstop.com') THEN 'admin'
      ELSE 'user'
    END,
    'active',
    'free',
    coalesce(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_pitstop_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_pitstop_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_pitstop_new_user_profile();

INSERT INTO public.user_profiles (id, email, nome, role, status, plan, last_login_at, created_at, updated_at)
SELECT
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'nome', split_part(coalesce(u.email, ''), '@', 1), 'Piloto PitStop'),
  CASE
    WHEN lower(coalesce(u.email, '')) IN ('diegomarques.mat@gmail.com', 'admin@pitstop.app', 'admin@itspitstop.com') THEN 'admin'
    ELSE 'user'
  END,
  'active',
  'free',
  coalesce(u.last_sign_in_at, u.created_at, now()),
  coalesce(u.created_at, now()),
  now()
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 9. CONFIGURAÇÃO GLOBAL DO SISTEMA (MENSAGEM GLOBAL & MODO MANUTENÇÃO)
CREATE TABLE IF NOT EXISTS public.system_config (
  id TEXT PRIMARY KEY DEFAULT 'global',
  announcement JSONB NOT NULL DEFAULT '{}'::jsonb,
  maintenance JSONB NOT NULL DEFAULT '{"enabled": false, "message": ""}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_read_all" ON public.system_config;
CREATE POLICY "system_config_read_all" ON public.system_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "system_config_write_admin" ON public.system_config;
CREATE POLICY "system_config_write_admin" ON public.system_config
  FOR ALL TO authenticated
  USING (public.is_pitstop_admin())
  WITH CHECK (public.is_pitstop_admin());

-- 10. LEITURA GLOBAL DO ADMIN NAS TABELAS DA PLATAFORMA (MÉTRICAS SAAS & BACKUPS)
DROP POLICY IF EXISTS "veiculos_select_own" ON public.veiculos;
CREATE POLICY "veiculos_select_own" ON public.veiculos
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "postos_select_own" ON public.postos;
CREATE POLICY "postos_select_own" ON public.postos
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "abastecimentos_select_own" ON public.abastecimentos;
CREATE POLICY "abastecimentos_select_own" ON public.abastecimentos
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "manutencoes_select_own" ON public.manutencoes;
CREATE POLICY "manutencoes_select_own" ON public.manutencoes
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "despesas_extras_select_own" ON public.despesas_extras;
CREATE POLICY "despesas_extras_select_own" ON public.despesas_extras
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "calibragens_select_own" ON public.calibragens;
CREATE POLICY "calibragens_select_own" ON public.calibragens
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

NOTIFY pgrst, 'reload schema';
`;

/**
 * Script SQL incremental exclusivo para criar as tabelas do Backoffice Admin
 * (user_profiles e system_config) em projetos que já possuem as tabelas principais.
 */
export const SUPABASE_ADMIN_SCHEMA_SQL = `-- ==============================================================================
-- PITSTOP - MIGRAÇÃO ADMIN SAAS (public.user_profiles & public.system_config)
-- Execute no SQL Editor do Supabase quando as tabelas principais já existirem.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro_monthly', 'pro_annual', 'lifetime')),
  plan_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_pitstop_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'diegomarques.mat@gmail.com',
      'admin@pitstop.app',
      'admin@itspitstop.com'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    );
$$;

DROP POLICY IF EXISTS "user_profiles_select_own_or_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own_or_admin" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "user_profiles_insert_own_or_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own_or_admin" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pitstop_admin()
    OR (auth.uid() = id AND role = 'user' AND status = 'active' AND plan = 'free')
  );

DROP POLICY IF EXISTS "user_profiles_update_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own_or_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_update_admin" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (public.is_pitstop_admin())
  WITH CHECK (public.is_pitstop_admin());

CREATE OR REPLACE FUNCTION public.handle_pitstop_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, nome, role, status, plan, created_at, updated_at)
  VALUES (
    NEW.id,
    coalesce(NEW.email, ''),
    coalesce(NEW.raw_user_meta_data ->> 'nome', split_part(coalesce(NEW.email, ''), '@', 1), 'Piloto PitStop'),
    CASE
      WHEN lower(coalesce(NEW.email, '')) IN ('diegomarques.mat@gmail.com', 'admin@pitstop.app', 'admin@itspitstop.com') THEN 'admin'
      ELSE 'user'
    END,
    'active',
    'free',
    coalesce(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_pitstop_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_pitstop_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_pitstop_new_user_profile();

INSERT INTO public.user_profiles (id, email, nome, role, status, plan, last_login_at, created_at, updated_at)
SELECT
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'nome', split_part(coalesce(u.email, ''), '@', 1), 'Piloto PitStop'),
  CASE
    WHEN lower(coalesce(u.email, '')) IN ('diegomarques.mat@gmail.com', 'admin@pitstop.app', 'admin@itspitstop.com') THEN 'admin'
    ELSE 'user'
  END,
  'active',
  'free',
  coalesce(u.last_sign_in_at, u.created_at, now()),
  coalesce(u.created_at, now()),
  now()
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.system_config (
  id TEXT PRIMARY KEY DEFAULT 'global',
  announcement JSONB NOT NULL DEFAULT '{}'::jsonb,
  maintenance JSONB NOT NULL DEFAULT '{"enabled": false, "message": ""}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_read_all" ON public.system_config;
CREATE POLICY "system_config_read_all" ON public.system_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "system_config_write_admin" ON public.system_config;
CREATE POLICY "system_config_write_admin" ON public.system_config
  FOR ALL TO authenticated
  USING (public.is_pitstop_admin())
  WITH CHECK (public.is_pitstop_admin());

DROP POLICY IF EXISTS "veiculos_select_own" ON public.veiculos;
CREATE POLICY "veiculos_select_own" ON public.veiculos
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "postos_select_own" ON public.postos;
CREATE POLICY "postos_select_own" ON public.postos
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "abastecimentos_select_own" ON public.abastecimentos;
CREATE POLICY "abastecimentos_select_own" ON public.abastecimentos
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "manutencoes_select_own" ON public.manutencoes;
CREATE POLICY "manutencoes_select_own" ON public.manutencoes
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "despesas_extras_select_own" ON public.despesas_extras;
CREATE POLICY "despesas_extras_select_own" ON public.despesas_extras
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

DROP POLICY IF EXISTS "calibragens_select_own" ON public.calibragens;
CREATE POLICY "calibragens_select_own" ON public.calibragens
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_pitstop_admin());

NOTIFY pgrst, 'reload schema';
`;

export async function uploadAllToSupabase(payload: {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceItems: MaintenanceItem[];
  extraExpenses: ExtraExpense[];
  tireCalibrations: TireCalibrationLog[];
  stations: GasStation[];
  userEmail?: string;
  userId?: string;
}): Promise<{ ok: boolean; message: string; count: number; data?: BackupData }> {
  try {
    let effectiveUserId = payload.userId && isValidUUID(payload.userId) ? payload.userId : undefined;

    if (!effectiveUserId) {
      const sessionRes = await adapterGetSession();
      if (sessionRes.error) {
        return { ok: false, count: 0, message: sessionRes.error };
      }
      effectiveUserId = sessionRes.user?.id;
    }

    if (!effectiveUserId || !isValidUUID(effectiveUserId)) {
      return {
        ok: false,
        count: 0,
        message: 'É necessário estar autenticado para sincronizar.',
      };
    }

    const result = await adapterImportBackup(effectiveUserId, {
      version: '1.5.0',
      exportDate: new Date().toISOString(),
      vehicles: payload.vehicles,
      fuelLogs: payload.fuelLogs,
      maintenanceItems: payload.maintenanceItems,
      extraExpenses: payload.extraExpenses,
      tireCalibrations: payload.tireCalibrations,
      stations: payload.stations,
    });

    const isLocal = getPersistenceMode() === 'local';
    return {
      ok: true,
      count: result.count,
      data: result.data,
      message: isLocal
        ? `${result.count} registro(s) salvos no armazenamento local de preview.`
        : `${result.count} registro(s) sincronizados com sucesso no Supabase!`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      count: 0,
      message: formatFriendlyNetworkError(err),
    };
  }
}

export async function downloadAllFromSupabase(userId?: string): Promise<{
  ok: boolean;
  data?: BackupData;
  message: string;
}> {
  try {
    let effectiveUserId = userId && isValidUUID(userId) ? userId : undefined;

    if (!effectiveUserId) {
      const sessionRes = await adapterGetSession();
      if (sessionRes.error) {
        return { ok: false, message: sessionRes.error };
      }
      effectiveUserId = sessionRes.user?.id;
    }

    if (!effectiveUserId || !isValidUUID(effectiveUserId)) {
      return {
        ok: false,
        message: 'É necessário estar autenticado para buscar os registros.',
      };
    }

    const userData = await adapterFetchUserData(effectiveUserId);
    const isLocal = getPersistenceMode() === 'local';

    if (userData.vehicles.length === 0) {
      return {
        ok: false,
        message: isLocal
          ? 'Nenhum veículo encontrado no armazenamento local para este usuário.'
          : 'Nenhum veículo encontrado no Supabase para este usuário.',
      };
    }

    const backupData: BackupData = {
      version: '1.5.0',
      exportDate: new Date().toISOString(),
      vehicles: userData.vehicles,
      fuelLogs: userData.fuelLogs,
      maintenanceItems: userData.maintenanceItems,
      extraExpenses: userData.extraExpenses,
      tireCalibrations: userData.tireCalibrations,
      stations: userData.stations,
    };

    return {
      ok: true,
      data: backupData,
      message: isLocal
        ? 'Dados carregados do armazenamento local com sucesso!'
        : 'Dados recuperados da nuvem Supabase com sucesso!',
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message: formatFriendlyNetworkError(err),
    };
  }
}
