import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Vehicle,
  FuelLog,
  MaintenanceItem,
  ExtraExpense,
  TireCalibrationLog,
  GasStation,
  AuthUser,
  AppSettings,
  AppNotification,
  SystemConfig,
} from './types';
import {
  loadTheme,
  saveTheme,
  loadSettings,
  saveSettings,
  loadReadNotificationIds,
  saveReadNotificationIds,
  resetAllStorageData,
} from './utils/storage';
import {
  calculateFuelLogsMetrics,
  calculateTireCalibrationStatus,
  calculateRefuelProjection,
  checkRecentAnomaly,
} from './utils/calculations';
import { Navbar } from './components/Navbar';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { RoadHistoryView } from './components/RoadHistoryView';
import { FlexAndStationsView } from './components/FlexAndStationsView';
import { GarageView } from './components/GarageView';
import { ReportsView } from './components/ReportsView';
import { FuelModal } from './components/FuelModal';
import { VehicleModal } from './components/VehicleModal';
import { ExpenseModal } from './components/ExpenseModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AuthScreen } from './components/AuthScreen';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { Footer } from './components/Footer';
import { TermsModal } from './components/TermsModal';
import { PrivacyModal } from './components/PrivacyModal';
import { GuidedTourModal } from './components/GuidedTourModal';
import { AdminDashboardView, AdminSubTab } from './components/AdminDashboardView';
import {
  Car,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  X,
  ShieldAlert,
  Wrench,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  mapSupabaseUserToAuthUser,
  formatFriendlyNetworkError,
  isMasterAdminEmail,
} from './lib/supabase';
import {
  PersistenceMode,
  getPersistenceMode,
  subscribePersistenceMode,
  adapterGetSession,
  adapterSignOut,
  adapterUpdateUser,
  adapterFetchUserData,
  adapterInsertVehicle,
  adapterUpdateVehicle,
  adapterDeleteVehicle,
  adapterInsertStation,
  adapterUpdateStation,
  adapterInsertFuelLog,
  adapterUpdateFuelLog,
  adapterDeleteFuelLog,
  adapterInsertMaintenance,
  adapterUpdateMaintenance,
  adapterDeleteMaintenance,
  adapterInsertExpense,
  adapterUpdateExpense,
  adapterDeleteExpense,
  adapterInsertTireCalibration,
  adapterDeleteTireCalibration,
  adapterImportBackup,
  getLocalSystemConfig,
  adapterGetSystemConfig,
  subscribeSystemConfig,
  adapterHydrateAuthUserProfile,
  adapterRefreshAuthUserStatus,
  isBlockedStatus,
  persistBlockedAuthMessage,
} from './lib/storageAdapter';

export default function App() {
  const [persistenceMode, setPersistenceModeState] = useState<PersistenceMode>(() =>
    getPersistenceMode()
  );

  // Authentication state: managed via storageAdapter (Supabase Cloud + automatic LocalStorage preview fallback)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => getLocalSystemConfig());
  const [adminInitialSubTab, setAdminInitialSubTab] = useState<AdminSubTab>('analytics');
  const [adminSubTabTrigger, setAdminSubTabTrigger] = useState<number>(0);

  // Cloud Sync & Toast status state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ message, type });
      const duration = type === 'error' ? 10000 : 3800;
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, duration);
    },
    []
  );

  // Preferences & Settings state
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    loadReadNotificationIds()
  );

  // Domain states: 100% clean start, hydrated exclusively from Supabase
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string>('');
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>([]);
  const [tireCalibrations, setTireCalibrations] = useState<TireCalibrationLog[]>([]);
  const [stations, setStations] = useState<GasStation[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => loadTheme());

  // UI Navigation & Modals states
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [garageSection2Tab, setGarageSection2Tab] = useState<'maintenance' | 'expenses' | 'calibrations'>('maintenance');
  const [garageSection2Trigger, setGarageSection2Trigger] = useState(0);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExtraExpense | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Modals: Notifications, Profile, Settings, Legal
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<'geral' | 'alertas' | 'dados' | 'supabase'>('geral');
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Global Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Dedupe concurrent cloud sync calls & prevent stale request race conditions
  const inFlightSyncUserRef = useRef<string | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);
  const syncRequestIdRef = useRef<number>(0);
  const tourAutoCheckedUserRef = useRef<string | null>(null);
  const activeVehicleIdRef = useRef<string>(activeVehicleId);
  activeVehicleIdRef.current = activeVehicleId;

  const dedupeById = useCallback(<T extends { id: string }>(items: T[]): T[] => {
    return Array.from(new Map(items.map(item => [item.id, item])).values());
  }, []);

  const upsertById = useCallback(<T extends { id: string }>(items: T[], item: T, prepend = false): T[] => {
    const map = new Map<string, T>();
    if (prepend && !items.some(existing => existing.id === item.id)) {
      map.set(item.id, item);
    }
    items.forEach(existing => map.set(existing.id, existing));
    map.set(item.id, item);
    return Array.from(map.values());
  }, []);

  const clearDomainState = useCallback(() => {
    setVehicles([]);
    setFuelLogs([]);
    setMaintenanceItems([]);
    setExtraExpenses([]);
    setTireCalibrations([]);
    setStations([]);
    setActiveVehicleId('');
  }, []);

  // Sync theme changes with DOM & Storage
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  // Subscribe to reactive persistence mode transitions (cloud <-> local)
  useEffect(() => {
    return subscribePersistenceMode(nextMode => {
      setPersistenceModeState(nextMode);
    });
  }, []);

  // Load & subscribe to global SaaS SystemConfig (Announcement Banner & Maintenance Mode)
  useEffect(() => {
    let mounted = true;
    void adapterGetSystemConfig().then(cfg => {
      if (mounted) setSystemConfig(cfg);
    });
    const unsubscribe = subscribeSystemConfig(cfg => {
      if (mounted) setSystemConfig(cfg);
    });
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'pitstop_system_config_v1') {
        setSystemConfig(getLocalSystemConfig());
      }
    };
    window.addEventListener('storage', onStorageChange);
    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('storage', onStorageChange);
    };
  }, []);

  const authUserRef = useRef<AuthUser | null>(authUser);
  authUserRef.current = authUser;

  // Carrega todos os registros do usuário autenticado via storageAdapter (Nuvem ou Fallback Local)
  const carregarDadosDoUsuario = useCallback(
    async (userId: string, options?: { showSuccessToast?: boolean; force?: boolean }) => {
      if (!options?.force && inFlightSyncUserRef.current === userId) {
        return;
      }
      const reqId = ++syncRequestIdRef.current;
      inFlightSyncUserRef.current = userId;
      setIsLoadingData(true);
      setIsSyncing(true);

      try {
        // Verifica sempre o status atualizado antes de liberar/carregar dados
        const current = authUserRef.current;
        if (current && current.id === userId && !isMasterAdminEmail(current.email)) {
          const latestProfile = await adapterRefreshAuthUserStatus(current);
          if (syncRequestIdRef.current !== reqId) return;
          if (isBlockedStatus({ status: latestProfile.status, email: latestProfile.email })) {
            persistBlockedAuthMessage();
            setAuthUser(prev =>
              prev && prev.id === userId ? { ...prev, status: 'blocked' } : prev
            );
            clearDomainState();
            return;
          }
        }

        const data = await adapterFetchUserData(userId);
        if (syncRequestIdRef.current !== reqId) return;

        const uniqueVehicles = dedupeById(data.vehicles);
        setVehicles(uniqueVehicles);
        const currentActive = activeVehicleIdRef.current;
        if (currentActive && uniqueVehicles.some(v => v.id === currentActive)) {
          setActiveVehicleId(currentActive);
        } else {
          setActiveVehicleId(uniqueVehicles[0]?.id || '');
        }
        setFuelLogs(dedupeById(data.fuelLogs));
        setMaintenanceItems(dedupeById(data.maintenanceItems));
        setExtraExpenses(dedupeById(data.extraExpenses));
        setTireCalibrations(dedupeById(data.tireCalibrations));
        setStations(dedupeById(data.stations));

        if (options?.showSuccessToast) {
          showToast(
            getPersistenceMode() === 'local'
              ? 'Dados atualizados do armazenamento local!'
              : 'Dados sincronizados com a nuvem Supabase!',
            'success'
          );
        }
      } catch (err: unknown) {
        if (syncRequestIdRef.current !== reqId) return;
        showToast(formatFriendlyNetworkError(err, 'Erro ao carregar dados.'), 'error');
      } finally {
        if (inFlightSyncUserRef.current === userId) {
          inFlightSyncUserRef.current = null;
        }
        if (syncRequestIdRef.current === reqId) {
          setIsLoadingData(false);
          setIsSyncing(false);
        }
      }
    },
    [dedupeById, showToast]
  );

  // Manual Refresh button in Header
  const handleManualSync = useCallback(() => {
    if (!authUser) return;
    void carregarDadosDoUsuario(authUser.id, { showSuccessToast: true, force: true });
  }, [authUser, carregarDadosDoUsuario]);

  // Autenticação inicial via storageAdapter (probe automático Cloud -> fallback silencioso Local)
  useEffect(() => {
    let isMounted = true;
    setIsAuthChecking(true);

    adapterGetSession()
      .then(result => {
        if (!isMounted) return;
        setPersistenceModeState(result.mode);

        if (result.error) {
          showToast(result.error, 'error');
        }

        if (result.user) {
          setIsLoadingData(true);
          setAuthUser(result.user);
        } else {
          setAuthUser(null);
          clearDomainState();
          setIsLoadingData(false);
        }
        setIsAuthChecking(false);
      })
      .catch(err => {
        if (!isMounted) return;
        showToast(formatFriendlyNetworkError(err, 'Erro ao verificar sessão.'), 'error');
        setAuthUser(null);
        clearDomainState();
        setIsLoadingData(false);
        setIsAuthChecking(false);
      });

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        isMounted = false;
      };
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (getPersistenceMode() === 'local') return;

      if (session?.user) {
        const baseUser = mapSupabaseUserToAuthUser(session.user);
        void adapterHydrateAuthUserProfile(baseUser).then(hydratedUser => {
          if (!isMounted) return;
          const isBlocked = isBlockedStatus({
            status: hydratedUser.status,
            email: hydratedUser.email,
          });
          if (isBlocked) {
            persistBlockedAuthMessage();
          }
          setAuthUser(prev => {
            if (!prev || prev.id !== hydratedUser.id) {
              setIsLoadingData(!isBlocked);
            }
            if (isBlocked || (prev && prev.id !== hydratedUser.id)) {
              syncedUserIdRef.current = null;
              clearDomainState();
            }
            return hydratedUser;
          });
          setIsAuthChecking(false);
        });
      } else {
        syncRequestIdRef.current += 1;
        syncedUserIdRef.current = null;
        tourAutoCheckedUserRef.current = null;
        inFlightSyncUserRef.current = null;
        setAuthUser(null);
        clearDomainState();
        setIsTourOpen(false);
        setIsLoadingData(false);
        setIsAuthChecking(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [clearDomainState, showToast]);

  // Guarda de sessão ativa: verifica bloqueio ao navegar, voltar à aba ou atualizar localStorage
  useEffect(() => {
    const active = authUser;
    if (!active || isMasterAdminEmail(active.email)) return;

    let cancelled = false;
    const verifyActiveAccess = async () => {
      try {
        const refreshed = await adapterRefreshAuthUserStatus(active);
        if (cancelled) return;
        if (isBlockedStatus({ status: refreshed.status, email: refreshed.email })) {
          persistBlockedAuthMessage();
          clearDomainState();
          setAuthUser(prev =>
            prev && prev.id === active.id ? { ...prev, status: 'blocked' } : prev
          );
        } else if (refreshed.status !== active.status || refreshed.role !== active.role) {
          setAuthUser(prev =>
            prev && prev.id === active.id
              ? { ...prev, status: refreshed.status, role: refreshed.role, plan: refreshed.plan }
              : prev
          );
        }
      } catch {
        // Ignore transient checks
      }
    };

    void verifyActiveAccess();

    const onFocus = () => void verifyActiveAccess();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pitstop_local_users' || e.key === 'pitstop_local_session') {
        void verifyActiveAccess();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [authUser?.id, authUser?.email, currentTab, clearDomainState]);

  // Single coordinated trigger: calls carregarDadosDoUsuario ONLY after confirmed authUser.id (and not blocked)
  useEffect(() => {
    const userId = authUser?.id;
    if (!userId || isBlockedStatus({ status: authUser?.status, email: authUser?.email })) {
      syncedUserIdRef.current = null;
      tourAutoCheckedUserRef.current = null;
      if (authUser && isBlockedStatus({ status: authUser.status, email: authUser.email })) {
        clearDomainState();
      }
      setIsLoadingData(false);
      return;
    }
    if (syncedUserIdRef.current === userId) {
      return;
    }
    syncedUserIdRef.current = userId;
    void carregarDadosDoUsuario(userId);
  }, [authUser?.id, authUser?.status, authUser?.email, carregarDadosDoUsuario, clearDomainState]);

  // Auto-launch Guided Tour on first login once initial data sync completes
  useEffect(() => {
    if (!authUser || isAuthChecking || isLoadingData) return;
    if (tourAutoCheckedUserRef.current === authUser.id) return;
    tourAutoCheckedUserRef.current = authUser.id;

    let completedLocally = false;
    try {
      completedLocally =
        window.localStorage?.getItem(`pitstop_tour_concluido_v1_${authUser.id}`) === 'true';
    } catch {
      completedLocally = false;
    }

    if (!authUser.tourConcluido && !completedLocally) {
      setIsTourOpen(true);
    }
  }, [authUser, isAuthChecking, isLoadingData]);

  const handleCompleteGuidedTour = useCallback(() => {
    setIsTourOpen(false);
    if (!authUser) return;

    try {
      window.localStorage?.setItem(`pitstop_tour_concluido_v1_${authUser.id}`, 'true');
    } catch {
      // Ignore storage write errors in restricted contexts
    }

    const updatedUser: AuthUser = {
      ...authUser,
      tourConcluido: true,
    };
    setAuthUser(updatedUser);

    void adapterUpdateUser(authUser.id, {
      tour_concluido: true,
    }).catch(err => {
      console.warn('[PitStop] Não foi possível atualizar tour_concluido:', err);
    });
  }, [authUser]);

  // Active vehicle reference with safe fallback
  const activeVehicle = useMemo(() => {
    if (vehicles.length === 0) return null;
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0] || null;
  }, [vehicles, activeVehicleId]);

  // Calculated metrics for active vehicle's fuel logs (deduplicated by unique id)
  const activeVehicleLogs = useMemo(() => {
    if (!activeVehicle) return [];
    const rawLogs = dedupeById(fuelLogs.filter(l => l.vehicleId === activeVehicle.id));
    return calculateFuelLogsMetrics(rawLogs);
  }, [fuelLogs, activeVehicle, dedupeById]);

  // Dynamic Notifications Center calculation
  const notifications = useMemo<AppNotification[]>(() => {
    if (!activeVehicle) return [];
    const list: AppNotification[] = [];

    // 1. Tire Calibration Alert
    if (settings.alertTireCalibration) {
      const tireStatus = calculateTireCalibrationStatus(tireCalibrations, activeVehicleLogs, activeVehicle);
      if (tireStatus.status === 'urgent') {
        list.push({
          id: `tire_${activeVehicle.id}_urgent`,
          type: 'tire',
          title: 'Calibragem de Pneus Urgente',
          message: `${tireStatus.explanationText} (${tireStatus.frontPsi} PSI Diant. / ${tireStatus.rearPsi} PSI Tras.).`,
          severity: 'urgent',
          date: 'Hoje',
          read: readNotificationIds.includes(`tire_${activeVehicle.id}_urgent`),
          targetTab: 'dashboard',
        });
      } else if (tireStatus.status === 'warning') {
        list.push({
          id: `tire_${activeVehicle.id}_warn`,
          type: 'tire',
          title: 'Atenção à Calibragem dos Pneus',
          message: `${tireStatus.explanationText} (${tireStatus.frontPsi}/${tireStatus.rearPsi} PSI).`,
          severity: 'warning',
          date: 'Hoje',
          read: readNotificationIds.includes(`tire_${activeVehicle.id}_warn`),
          targetTab: 'dashboard',
        });
      }
    }

    // 2. Autonomy / Low Fuel Alert
    if (settings.alertLowFuel && activeVehicleLogs.length > 0) {
      const proj = calculateRefuelProjection(activeVehicleLogs, activeVehicle, undefined, undefined, 'habito_real');
      if (proj.progressLevel === 'urgent' || proj.isDue || proj.remainingKm <= 50) {
        list.push({
          id: `fuel_${activeVehicle.id}_urgent`,
          type: 'fuel',
          title: 'Reserva Próxima: Reabastecimento Necessário',
          message: `Restam apenas ~${Math.max(0, proj.remainingKm)} km de autonomia segura no tanque.`,
          severity: 'urgent',
          date: 'Hoje',
          read: readNotificationIds.includes(`fuel_${activeVehicle.id}_urgent`),
          targetTab: 'dashboard',
        });
      } else if (proj.progressLevel === 'warning') {
        list.push({
          id: `fuel_${activeVehicle.id}_warn`,
          type: 'fuel',
          title: 'Projeção de Parada para Abastecimento',
          message: `Autonomia estimada em ~${proj.remainingKm} km (${proj.daysRemaining} dias restantes).`,
          severity: 'warning',
          date: 'Hoje',
          read: readNotificationIds.includes(`fuel_${activeVehicle.id}_warn`),
          targetTab: 'dashboard',
        });
      }
    }

    // 3. Preventive Maintenance Alerts (within 500 km or overdue)
    if (settings.alertPreventiveMaintenance) {
      const vehMaints = maintenanceItems.filter(m => m.vehicleId === activeVehicle.id);
      vehMaints.forEach(item => {
        const dueOdo = item.lastDoneOdometer + item.intervalKm;
        const kmRemaining = dueOdo - activeVehicle.currentOdometer;
        if (kmRemaining <= 0) {
          list.push({
            id: `maint_${item.id}_overdue`,
            type: 'maintenance',
            title: `Manutenção Vencida: ${item.title}`,
            message: `Item ultrapassou o prazo recomendado em ${Math.abs(kmRemaining).toLocaleString('pt-BR')} km. Agende a revisão!`,
            severity: 'urgent',
            date: 'Hoje',
            read: readNotificationIds.includes(`maint_${item.id}_overdue`),
            targetTab: 'garage',
          });
        } else if (kmRemaining <= 500) {
          list.push({
            id: `maint_${item.id}_soon`,
            type: 'maintenance',
            title: `Revisão Preventiva: ${item.title}`,
            message: `Faltam apenas ${kmRemaining} km para a revisão recomendada deste item.`,
            severity: 'warning',
            date: 'Hoje',
            read: readNotificationIds.includes(`maint_${item.id}_soon`),
            targetTab: 'garage',
          });
        }
      });
    }

    // 4. Mechanical Anomaly Alert (> 15% drop)
    if (settings.alertMechanicalAnomaly && activeVehicleLogs.length >= 2) {
      const anomaly = checkRecentAnomaly(activeVehicleLogs);
      if (anomaly && anomaly.detected) {
        const lastLog = activeVehicleLogs[0];
        const notifId = `anomaly_${activeVehicle.id}_${lastLog?.id || 'recent'}`;
        list.push({
          id: notifId,
          type: 'anomaly',
          title: `Queda Anormal de Rendimento (${anomaly.dropPercentage}%)`,
          message: `O último abastecimento rendeu ${anomaly.recentConsumption} km/L vs. média de ${anomaly.historicalAverage} km/L. Verifique velas, filtros ou combustível adulterado.`,
          severity: 'urgent',
          date: 'Recente',
          read: readNotificationIds.includes(notifId),
          targetTab: 'dashboard',
        });
      }
    }

    return list;
  }, [activeVehicle, activeVehicleLogs, tireCalibrations, maintenanceItems, settings, readNotificationIds]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleMarkAllNotificationsAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...readNotificationIds, ...allIds]));
    setReadNotificationIds(updated);
    saveReadNotificationIds(updated);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!readNotificationIds.includes(notif.id)) {
      const updated = [...readNotificationIds, notif.id];
      setReadNotificationIds(updated);
      saveReadNotificationIds(updated);
    }
    if (notif.targetTab) {
      setCurrentTab(notif.targetTab);
    }
  };

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sair da Conta?',
      description:
        persistenceMode === 'local'
          ? 'Deseja encerrar sua sessão atual? Seus dados permanecem salvos localmente neste navegador.'
          : 'Deseja encerrar sua sessão atual? Seus dados na nuvem permanecem seguros e sincronizados no Supabase.',
      confirmLabel: 'Sim, Sair',
      cancelLabel: 'Cancelar',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await adapterSignOut();
          syncedUserIdRef.current = null;
          tourAutoCheckedUserRef.current = null;
          setIsTourOpen(false);
          setAuthUser(null);
          clearDomainState();
          showToast('Sessão encerrada com sucesso.', 'info');
        } catch (err: unknown) {
          showToast(formatFriendlyNetworkError(err, 'Erro ao encerrar sessão.'), 'error');
        }
      },
    });
  };

  const handleDirectLogout = async () => {
    try {
      await adapterSignOut();
      syncedUserIdRef.current = null;
      tourAutoCheckedUserRef.current = null;
      setIsTourOpen(false);
      setAuthUser(null);
      setCurrentTab('dashboard');
      clearDomainState();
      showToast('Sessão encerrada com sucesso.', 'info');
    } catch (err: unknown) {
      showToast(formatFriendlyNetworkError(err, 'Erro ao encerrar sessão.'), 'error');
    }
  };

  const handleUpdateUser = (updated: AuthUser) => {
    setAuthUser(updated);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleFactoryReset = () => {
    setConfirmModal({
      isOpen: true,
      title: '⚠️ Confirmar Reset de Fábrica?',
      description: (
        <div className="space-y-2">
          <p className="font-semibold text-red-600 dark:text-red-400">
            Atenção: Esta é uma ação destrutiva irreversível!
          </p>
          <p>
            Todos os veículos cadastrados, histórico de abastecimentos, manutenções, despesas extras, postos e calibrações de pneus serão excluídos permanentemente deste navegador.
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Caso deseje guardar seus dados, recomendamos fechar esta janela e utilizar a opção "Exportar Backup JSON" antes de prosseguir.
          </p>
        </div>
      ),
      confirmLabel: 'Sim, Apagar Tudo (Reset)',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: () => {
        resetAllStorageData();
        clearDomainState();
        setIsSettingsOpen(false);
        showToast('Dados locais resetados com sucesso.', 'info');
      },
    });
  };

  // Handle toggling dark/light theme
  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  };

  const handleOpenFuelModal = () => {
    if (!activeVehicle || vehicles.length === 0) {
      setEditingVehicle(null);
      setIsVehicleModalOpen(true);
      return;
    }
    setEditingLog(null);
    setIsFuelModalOpen(true);
  };

  // Quick tire calibration handler
  const handleQuickCalibrateTires = async (notes?: string) => {
    if (!activeVehicle || !authUser) return;
    const payload: Omit<TireCalibrationLog, 'id'> = {
      vehicleId: activeVehicle.id,
      date: new Date().toISOString().slice(0, 10),
      odometer: activeVehicle.currentOdometer,
      frontPsi: activeVehicle.frontTirePsi || 32,
      rearPsi: activeVehicle.rearTirePsi || 30,
      notes: notes || 'Calibragem rápida realizada e registrada',
    };

    setIsSyncing(true);
    try {
      const savedCalib = await adapterInsertTireCalibration(authUser.id, payload);
      setTireCalibrations(prev => upsertById(prev, savedCalib, true));
      showToast('Calibragem registrada com sucesso!', 'success');
    } catch (err: unknown) {
      showToast(formatFriendlyNetworkError(err, 'Erro ao salvar calibragem.'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete Tire Calibration Log with Global Confirmation Modal
  const handleDeleteTireCalibration = (id: string) => {
    const target = tireCalibrations.find(c => c.id === id);
    if (!target) return;

    const formattedDate = new Date(target.date + 'T12:00:00').toLocaleDateString('pt-BR');

    setConfirmModal({
      isOpen: true,
      title: 'Excluir registro de calibragem?',
      description: (
        <div className="space-y-2">
          <p>
            Deseja excluir a calibragem registrada em{' '}
            <strong className="text-slate-900 dark:text-neutral-100 font-mono-numbers">
              {formattedDate}
            </strong>{' '}
            aos{' '}
            <strong className="text-slate-900 dark:text-neutral-100 font-mono-numbers">
              {target.odometer.toLocaleString('pt-BR')} km
            </strong>?
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            O contador de dias e alertas de calibragem será recalculado automaticamente.
          </p>
        </div>
      ),
      confirmLabel: 'Excluir Calibragem',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        if (!authUser) return;
        setIsSyncing(true);
        try {
          await adapterDeleteTireCalibration(authUser.id, id);
          setTireCalibrations(prev => prev.filter(c => c.id !== id));
          showToast('Calibragem excluída.', 'success');
        } catch (err: unknown) {
          showToast(formatFriendlyNetworkError(err, 'Erro ao excluir calibragem.'), 'error');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Add or Edit Fuel Log
  const handleSaveFuelLog = async (
    logData: Omit<FuelLog, 'id' | 'calculatedKmPerLiter' | 'calculatedCostPerKm' | 'distanceTraveled' | 'isAnomaly'>,
    didCalibrateTires?: boolean,
    stationToSave?: { name: string; brand: string; latitude: number; longitude: number }
  ) => {
    if (!activeVehicle || !authUser) return;

    setIsSyncing(true);
    try {
      let resolvedStationId = logData.stationId;

      if (stationToSave) {
        const existingStation = stations.find(
          s => s.name.trim().toLowerCase() === stationToSave.name.trim().toLowerCase()
        );
        const savedStation = existingStation
          ? await adapterUpdateStation(authUser.id, {
              ...existingStation,
              brand: stationToSave.brand,
              latitude: stationToSave.latitude,
              longitude: stationToSave.longitude,
              updatedAt: new Date().toISOString(),
            })
          : await adapterInsertStation(authUser.id, {
              name: stationToSave.name,
              brand: stationToSave.brand,
              latitude: stationToSave.latitude,
              longitude: stationToSave.longitude,
            });
        resolvedStationId = savedStation.id;
        setStations(prev => upsertById(prev, savedStation, !existingStation));
      } else if (!resolvedStationId && logData.stationName) {
        const matchedStation = stations.find(
          s => s.name.trim().toLowerCase() === logData.stationName.trim().toLowerCase()
        );
        resolvedStationId = matchedStation?.id;
      }

      const payload: Omit<FuelLog, 'id'> = {
        ...logData,
        stationId: resolvedStationId,
      };

      const savedLog = editingLog
        ? await adapterUpdateFuelLog(authUser.id, { ...payload, id: editingLog.id })
        : await adapterInsertFuelLog(authUser.id, payload);

      setFuelLogs(prev => upsertById(prev, savedLog));
      showToast('Abastecimento salvo com sucesso!', 'success');

      if (didCalibrateTires) {
        const savedCalib = await adapterInsertTireCalibration(authUser.id, {
          vehicleId: activeVehicle.id,
          date: logData.date,
          odometer: logData.odometer,
          frontPsi: activeVehicle.frontTirePsi || 32,
          rearPsi: activeVehicle.rearTirePsi || 30,
          notes: `Calibrado durante abastecimento em ${logData.stationName || 'Posto'}`,
        });
        setTireCalibrations(prev => upsertById(prev, savedCalib, true));
      }

      if (logData.odometer > activeVehicle.currentOdometer) {
        const updatedVehicle = await adapterUpdateVehicle(authUser.id, {
          ...activeVehicle,
          currentOdometer: logData.odometer,
        });
        setVehicles(prev => prev.map(v => (v.id === activeVehicle.id ? updatedVehicle : v)));
      }

      setEditingLog(null);
    } catch (err: unknown) {
      showToast(formatFriendlyNetworkError(err, 'Erro ao salvar abastecimento.'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteFuelLog = (id: string) => {
    const log = fuelLogs.find(l => l.id === id);
    if (!log) return;

    setConfirmModal({
      isOpen: true,
      title: 'Excluir registro de abastecimento?',
      description: (
        <div className="space-y-2">
          <p>
            Deseja excluir permanentemente a parada de{' '}
            <strong className="text-slate-900 dark:text-neutral-100 font-mono-numbers">
              R$ {log.totalCost.toFixed(2)} ({log.liters.toFixed(2)} L)
            </strong>{' '}
            feita em {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR')} no posto{' '}
            <strong className="text-slate-900 dark:text-neutral-100">{log.stationName || 'Posto'}</strong>?
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            A média de consumo e o hodômetro acumulado serão recalculados automaticamente.
          </p>
        </div>
      ),
      confirmLabel: 'Excluir Abastecimento',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        if (!authUser) return;
        setIsSyncing(true);
        try {
          await adapterDeleteFuelLog(authUser.id, id);
          setFuelLogs(prev => prev.filter(l => l.id !== id));
          showToast('Abastecimento excluído.', 'success');
        } catch (err: unknown) {
          showToast(formatFriendlyNetworkError(err, 'Erro ao excluir abastecimento.'), 'error');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Vehicle CRUD
  const handleSaveVehicle = async (vehicleData: Omit<Vehicle, 'id'> | Vehicle) => {
    if (!authUser) return;
    setIsSyncing(true);
    try {
      const savedVehicle =
        'id' in vehicleData
          ? await adapterUpdateVehicle(authUser.id, vehicleData)
          : await adapterInsertVehicle(authUser.id, vehicleData);
      setVehicles(prev => upsertById(prev, savedVehicle));
      setActiveVehicleId(savedVehicle.id);
      showToast('Veículo salvo com sucesso!', 'success');
    } catch (err: unknown) {
      showToast(formatFriendlyNetworkError(err, 'Erro ao salvar veículo.'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateVehicleOdometer = (newOdometer: number) => {
    if (!activeVehicle) return;
    const updatedVehicle: Vehicle = {
      ...activeVehicle,
      currentOdometer: newOdometer,
    };
    void handleSaveVehicle(updatedVehicle);
  };

  const handleDeleteVehicle = (id: string) => {
    const targetVeh = vehicles.find(v => v.id === id);
    if (!targetVeh) return;

    const logsCount = fuelLogs.filter(l => l.vehicleId === id).length;
    const maintsCount = maintenanceItems.filter(m => m.vehicleId === id).length;
    const expensesCount = extraExpenses.filter(e => e.vehicleId === id).length;
    const calibsCount = tireCalibrations.filter(c => c.vehicleId === id).length;

    setConfirmModal({
      isOpen: true,
      title: `Excluir veículo ${targetVeh.name}?`,
      description: (
        <div className="space-y-2">
          <p>
            Deseja realmente excluir o veículo{' '}
            <strong className="text-slate-900 dark:text-neutral-100">
              {targetVeh.name} ({targetVeh.plate})
            </strong>?
          </p>
          {(logsCount > 0 || maintsCount > 0 || expensesCount > 0 || calibsCount > 0) && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
              ⚠️ Exclusão em cascata: Todos os <strong>{logsCount}</strong> abastecimento(s),{' '}
              <strong>{maintsCount}</strong> lembrete(s) de manutenção,{' '}
              <strong>{expensesCount}</strong> despesa(s) extra(s) e{' '}
              <strong>{calibsCount}</strong> calibragem(ns) vinculadas serão apagados permanentemente.
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-neutral-400">Esta ação não poderá ser desfeita.</p>
        </div>
      ),
      confirmLabel: 'Excluir Veículo',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        if (!authUser) return;
        setIsSyncing(true);
        try {
          await adapterDeleteVehicle(authUser.id, id);
          const remaining = vehicles.filter(v => v.id !== id);
          setVehicles(remaining);
          setFuelLogs(prev => prev.filter(l => l.vehicleId !== id));
          setMaintenanceItems(prev => prev.filter(m => m.vehicleId !== id));
          setExtraExpenses(prev => prev.filter(e => e.vehicleId !== id));
          setTireCalibrations(prev => prev.filter(c => c.vehicleId !== id));
          if (activeVehicleId === id) {
            setActiveVehicleId(remaining.length > 0 ? remaining[0].id : '');
          }
          showToast('Veículo excluído.', 'success');
        } catch (err: unknown) {
          showToast(formatFriendlyNetworkError(err, 'Erro ao excluir veículo.'), 'error');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Extra Expenses CRUD
  const handleSaveExpense = async (expenseData: Omit<ExtraExpense, 'id'> | ExtraExpense) => {
    if (!authUser) return;
    setIsSyncing(true);
    try {
      const savedExpense =
        'id' in expenseData
          ? await adapterUpdateExpense(authUser.id, expenseData)
          : await adapterInsertExpense(authUser.id, expenseData);
      setExtraExpenses(prev => upsertById(prev, savedExpense));
      showToast('Despesa salva com sucesso!', 'success');

      if (activeVehicle && expenseData.odometer && expenseData.odometer > activeVehicle.currentOdometer) {
        const updatedVehicle = await adapterUpdateVehicle(authUser.id, {
          ...activeVehicle,
          currentOdometer: expenseData.odometer,
        });
        setVehicles(prev => prev.map(v => (v.id === activeVehicle.id ? updatedVehicle : v)));
      }

      setEditingExpense(null);
    } catch (err: unknown) {
      showToast(formatFriendlyNetworkError(err, 'Erro ao salvar despesa.'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    const exp = extraExpenses.find(e => e.id === id);
    if (!exp) return;

    setConfirmModal({
      isOpen: true,
      title: 'Excluir despesa extra?',
      description: (
        <div className="space-y-2">
          <p>
            Deseja excluir a despesa de{' '}
            <strong className="text-slate-900 dark:text-neutral-100 font-mono-numbers">
              R$ {exp.amount.toFixed(2)}
            </strong>{' '}
            referente a <strong className="text-slate-900 dark:text-neutral-100">"{exp.description}"</strong>?
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            O cálculo do Custo Total de Propriedade (TCO) será recalculado automaticamente.
          </p>
        </div>
      ),
      confirmLabel: 'Excluir Despesa',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        if (!authUser) return;
        setIsSyncing(true);
        try {
          await adapterDeleteExpense(authUser.id, id);
          setExtraExpenses(prev => prev.filter(e => e.id !== id));
          showToast('Despesa excluída.', 'success');
        } catch (err: unknown) {
          showToast(formatFriendlyNetworkError(err, 'Erro ao excluir despesa.'), 'error');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handleOpenExpenseModal = () => {
    if (!activeVehicle || vehicles.length === 0) {
      setEditingVehicle(null);
      setIsVehicleModalOpen(true);
      return;
    }
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  // Maintenance CRUD
  const handleSaveMaintenance = async (itemData: Omit<MaintenanceItem, 'id'> | MaintenanceItem) => {
    if (!authUser) return;
    setIsSyncing(true);
    try {
      const savedItem =
        'id' in itemData
          ? await adapterUpdateMaintenance(authUser.id, itemData)
          : await adapterInsertMaintenance(authUser.id, itemData);
      setMaintenanceItems(prev => upsertById(prev, savedItem));
      showToast('Lembrete de manutenção salvo!', 'success');
    } catch (err: unknown) {
      showToast(formatFriendlyNetworkError(err, 'Erro ao salvar manutenção.'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteMaintenance = (id: string) => {
    const item = maintenanceItems.find(m => m.id === id);
    if (!item) return;

    setConfirmModal({
      isOpen: true,
      title: 'Excluir lembrete de manutenção?',
      description: (
        <div className="space-y-2">
          <p>
            Deseja excluir o lembrete de{' '}
            <strong className="text-slate-900 dark:text-neutral-100">"{item.title}"</strong> (a cada{' '}
            {item.intervalKm.toLocaleString('pt-BR')} km)?
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Esta ação cancelará o monitoramento preventivo deste item.
          </p>
        </div>
      ),
      confirmLabel: 'Excluir Lembrete',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        if (!authUser) return;
        setIsSyncing(true);
        try {
          await adapterDeleteMaintenance(authUser.id, id);
          setMaintenanceItems(prev => prev.filter(m => m.id !== id));
          showToast('Lembrete de manutenção excluído.', 'success');
        } catch (err: unknown) {
          showToast(formatFriendlyNetworkError(err, 'Erro ao excluir manutenção.'), 'error');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handleCompleteMaintenance = async (id: string) => {
    if (!activeVehicle || !authUser) return;
    const target = maintenanceItems.find(m => m.id === id);
    if (!target) return;

    setIsSyncing(true);
    try {
      const updatedItem = await adapterUpdateMaintenance(authUser.id, {
        ...target,
        lastDoneOdometer: activeVehicle.currentOdometer,
        lastDoneDate: new Date().toISOString().slice(0, 10),
      });
      setMaintenanceItems(prev => prev.map(m => (m.id === id ? updatedItem : m)));
      showToast('Manutenção concluída!', 'success');
    } catch (err: unknown) {
      showToast(formatFriendlyNetworkError(err, 'Erro ao atualizar manutenção.'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Import and replace user data strictly from selected JSON backup with confirmation
  const handleRestoreAllData = (data: {
    vehicles: Vehicle[];
    fuelLogs: FuelLog[];
    maintenanceItems: MaintenanceItem[];
    extraExpenses?: ExtraExpense[];
    tireCalibrations?: TireCalibrationLog[];
    stations?: GasStation[];
  }): Promise<boolean> => {
    const vehicleCount = Array.isArray(data.vehicles) ? data.vehicles.length : 0;
    const fuelLogCount = Array.isArray(data.fuelLogs) ? data.fuelLogs.length : 0;
    const maintenanceCount = Array.isArray(data.maintenanceItems) ? data.maintenanceItems.length : 0;
    const expenseCount = Array.isArray(data.extraExpenses) ? data.extraExpenses.length : 0;
    const calibrationCount = Array.isArray(data.tireCalibrations) ? data.tireCalibrations.length : 0;
    const stationCount = Array.isArray(data.stations) ? data.stations.length : 0;

    return new Promise<boolean>(resolve => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      };

      setConfirmModal({
        isOpen: true,
        title: 'Confirmar Importação de Backup',
        description: (
          <div className="space-y-2.5">
            <p>
              Deseja importar os dados deste arquivo de backup para a sua conta? Os registros atuais serão substituídos/atualizados pelos dados reais do arquivo selecionado.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800/70 border border-slate-200 dark:border-neutral-700/70 text-xs text-slate-700 dark:text-neutral-200 font-medium">
              Resumo do arquivo selecionado:{' '}
              <strong className="font-mono-numbers">{vehicleCount}</strong> veículo(s),{' '}
              <strong className="font-mono-numbers">{fuelLogCount}</strong> abastecimento(s),{' '}
              <strong className="font-mono-numbers">{maintenanceCount}</strong> manutenção(ões)
              {expenseCount > 0 ? (
                <>
                  , <strong className="font-mono-numbers">{expenseCount}</strong> despesa(s)
                </>
              ) : null}
              {calibrationCount > 0 ? (
                <>
                  , <strong className="font-mono-numbers">{calibrationCount}</strong> calibragem(ns)
                </>
              ) : null}
              {stationCount > 0 ? (
                <>
                  , <strong className="font-mono-numbers">{stationCount}</strong> posto(s)
                </>
              ) : null}
              .
            </div>
          </div>
        ),
        confirmLabel: 'Importar Backup',
        cancelLabel: 'Cancelar',
        variant: 'warning',
        onCancel: () => finish(false),
        onConfirm: async () => {
          if (!authUser) {
            finish(false);
            return;
          }
          const restoredExpenses = Array.isArray(data.extraExpenses) ? data.extraExpenses : [];
          const restoredCalibrations = Array.isArray(data.tireCalibrations)
            ? data.tireCalibrations
            : [];
          const restoredStations = Array.isArray(data.stations) ? data.stations : [];

          setIsSyncing(true);
          try {
            const result = await adapterImportBackup(authUser.id, {
              vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
              fuelLogs: Array.isArray(data.fuelLogs) ? data.fuelLogs : [],
              maintenanceItems: Array.isArray(data.maintenanceItems) ? data.maintenanceItems : [],
              extraExpenses: restoredExpenses,
              tireCalibrations: restoredCalibrations,
              stations: restoredStations,
              exportDate: new Date().toISOString(),
              version: '1.5.0',
            });
            const importedVehicles = dedupeById(result.data.vehicles);
            setVehicles(importedVehicles);
            setFuelLogs(dedupeById(result.data.fuelLogs));
            setMaintenanceItems(dedupeById(result.data.maintenanceItems));
            setExtraExpenses(dedupeById(result.data.extraExpenses || []));
            setTireCalibrations(dedupeById(result.data.tireCalibrations || []));
            setStations(dedupeById(result.data.stations || []));
            setActiveVehicleId(importedVehicles[0]?.id || '');
            showToast('Backup importado com sucesso!', 'success');
            finish(true);
          } catch (err: unknown) {
            showToast(formatFriendlyNetworkError(err, 'Falha ao importar backup.'), 'error');
            finish(false);
          } finally {
            setIsSyncing(false);
          }
        },
      });
    });
  };

  // Initial Session Check Loading Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 px-6 transition-colors">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 bg-[#09090B] mb-4">
          <img src="/icon-192x192.png" alt="Logo PitStop" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>Inicializando PitStop...</span>
        </div>
      </div>
    );
  }

  // Check authentication guard
  if (!authUser) {
    return (
      <AuthScreen
        onLoginSuccess={user => {
          setIsLoadingData(true);
          setAuthUser(prev => {
            if (prev && prev.id !== user.id) {
              clearDomainState();
              syncedUserIdRef.current = null;
            }
            return user;
          });
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        persistenceMode={persistenceMode}
      />
    );
  }

  // Blocked account guard
  if (isBlockedStatus({ status: authUser.status, email: authUser.email })) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 px-6 transition-colors">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/25 text-red-500 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Acesso Bloqueado / Suspenso
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Acesso suspenso pelo administrador. Entre em contato com o suporte.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 pt-1">{authUser.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleDirectLogout()}
            className="w-full min-h-[46px] px-5 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>
    );
  }

  // Maintenance mode guard (blocks all non-admin users)
  if (systemConfig.maintenance.enabled && authUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 px-6 transition-colors">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500 flex items-center justify-center">
            <Wrench className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Manutenção Programada
            </span>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              PitStop em Atualização
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {systemConfig.maintenance.message ||
                'Estamos realizando melhorias no sistema. Voltamos em alguns minutos.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => void adapterGetSystemConfig().then(setSystemConfig)}
              className="flex-1 min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Verificar Novamente</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDirectLogout()}
              className="flex-1 min-h-[44px] px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = authUser.role === 'admin';
  const effectiveTab: NavTab = currentTab === 'admin' && !isAdmin ? 'dashboard' : currentTab;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 selection:bg-amber-500 selection:text-neutral-950 transition-colors">
      {/* Top Bar Navigation */}
      <Navbar
        vehicles={vehicles}
        activeVehicleId={activeVehicleId}
        onSelectVehicle={id => setActiveVehicleId(id)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        user={authUser}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => {
          setSettingsInitialSection('geral');
          setIsSettingsOpen(true);
        }}
        onLogout={handleLogout}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        showVehicleSelector={effectiveTab === 'dashboard' && !isProfileOpen && !isSettingsOpen}
        persistenceMode={persistenceMode}
        isAdmin={isAdmin}
        onOpenAdmin={() => {
          setAdminInitialSubTab('analytics');
          setAdminSubTabTrigger(prev => prev + 1);
          setCurrentTab('admin');
        }}
        isMaintenanceMode={systemConfig.maintenance.enabled}
        onOpenAdminMaintenance={() => {
          setAdminInitialSubTab('system');
          setAdminSubTabTrigger(prev => prev + 1);
          setCurrentTab('admin');
        }}
      />

      {/* Subheader / Tabs Navigation */}
      <Navigation
        currentTab={effectiveTab}
        onTabChange={tab => setCurrentTab(tab)}
        onOpenFuelModal={handleOpenFuelModal}
        onOpenExpenseModal={handleOpenExpenseModal}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-[calc(5.25rem+max(0.75rem,env(safe-area-inset-top)))] lg:pt-6 pb-8">

        {/* Mobile Vehicle Switcher (< 768px — shown exclusively on Painel/Dashboard) */}
        {effectiveTab === 'dashboard' && !isProfileOpen && !isSettingsOpen && vehicles.length > 0 && (
          <div className="md:hidden mb-4">
            <div className="relative flex items-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl px-3.5 shadow-xs transition-colors">
              <Car className="w-4 h-4 text-amber-500 shrink-0 mr-2.5" />
              <select
                value={activeVehicleId}
                onChange={e => setActiveVehicleId(e.target.value)}
                aria-label="Selecionar veículo ativo"
                className="w-full appearance-none bg-transparent min-h-[44px] pr-8 text-base font-semibold text-slate-900 dark:text-neutral-100 cursor-pointer focus:outline-none truncate"
              >
                {vehicles.map(v => (
                  <option
                    key={v.id}
                    value={v.id}
                    className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100"
                  >
                    {v.name} ({v.plate})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 dark:text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
        {(isLoadingData || isSyncing) && vehicles.length === 0 && effectiveTab !== 'admin' ? (
          <div className="max-w-md mx-auto my-12 text-center p-8 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl shadow-sm transition-colors">
            <Loader2 className="w-10 h-10 mx-auto mb-4 text-amber-500 animate-spin" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100 mb-1">
              {persistenceMode === 'local' ? 'Carregando garagem...' : 'Sincronizando com a nuvem...'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              {persistenceMode === 'local'
                ? 'Preparando veículos, abastecimentos e histórico local.'
                : 'Carregando veículos, abastecimentos e histórico do Supabase.'}
            </p>
          </div>
        ) : (!activeVehicle || vehicles.length === 0) && effectiveTab !== 'garage' && effectiveTab !== 'admin' ? (
          <div className="max-w-md mx-auto my-12 text-center p-8 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm transition-colors">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Car className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2 tracking-tight">
              Bem-vindo ao PitStop!
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              Cadastre seu primeiro veículo para começar a monitorar o consumo real, custos por km e manutenções.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingVehicle(null);
                setIsVehicleModalOpen(true);
              }}
              className="w-full min-h-[48px] py-3 px-5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Veículo</span>
            </button>
          </div>
        ) : (
          <>
            {effectiveTab === 'dashboard' && activeVehicle && (
              <DashboardView
                logs={activeVehicleLogs}
                vehicle={activeVehicle}
                maintenanceItems={maintenanceItems}
                extraExpenses={extraExpenses}
                tireCalibrations={tireCalibrations}
                onQuickCalibrateTires={handleQuickCalibrateTires}
                theme={theme}
                onOpenFuelModal={handleOpenFuelModal}
                onNavigateToRoad={() => setCurrentTab('road')}
                onNavigateToGarage={() => {
                  setGarageSection2Tab('maintenance');
                  setGarageSection2Trigger(prev => prev + 1);
                  setCurrentTab('garage');
                }}
                onNavigateToTireHistory={() => {
                  setGarageSection2Tab('calibrations');
                  setGarageSection2Trigger(prev => prev + 1);
                  setCurrentTab('garage');
                }}
                onUpdateVehicleOdometer={handleUpdateVehicleOdometer}
                announcement={systemConfig.announcement}
              />
            )}

            {effectiveTab === 'road' && activeVehicle && (
              <RoadHistoryView
                logs={activeVehicleLogs}
                vehicle={activeVehicle}
                onEditLog={log => {
                  setEditingLog(log);
                  setIsFuelModalOpen(true);
                }}
                onDeleteLog={handleDeleteFuelLog}
                onOpenFuelModal={handleOpenFuelModal}
              />
            )}

            {effectiveTab === 'flex' && activeVehicle && (
              <FlexAndStationsView
                logs={activeVehicleLogs}
                vehicle={activeVehicle}
                stations={stations}
              />
            )}

            {effectiveTab === 'reports' && activeVehicle && (
              <ReportsView
                vehicles={vehicles}
                activeVehicle={activeVehicle}
                fuelLogs={fuelLogs}
                maintenanceItems={maintenanceItems}
                extraExpenses={extraExpenses}
                theme={theme}
              />
            )}

            {effectiveTab === 'garage' && (
              <GarageView
                vehicles={vehicles}
                activeVehicleId={activeVehicleId}
                onSelectVehicle={id => setActiveVehicleId(id)}
                onSaveVehicle={handleSaveVehicle}
                onDeleteVehicle={handleDeleteVehicle}
                maintenanceItems={maintenanceItems}
                onSaveMaintenance={handleSaveMaintenance}
                onDeleteMaintenance={handleDeleteMaintenance}
                onCompleteMaintenance={handleCompleteMaintenance}
                extraExpenses={extraExpenses}
                onSaveExpense={handleSaveExpense}
                onDeleteExpense={handleDeleteExpense}
                onOpenExpenseModal={handleOpenExpenseModal}
                onQuickCalibrateTires={handleQuickCalibrateTires}
                onDeleteTireCalibration={handleDeleteTireCalibration}
                initialSection2Tab={garageSection2Tab}
                section2TabTrigger={garageSection2Trigger}
                fuelLogs={fuelLogs}
                tireCalibrations={tireCalibrations}
                stations={stations}
                onRestoreAllData={handleRestoreAllData}
              />
            )}

            {effectiveTab === 'admin' && isAdmin && (
              <AdminDashboardView
                currentUser={authUser}
                theme={theme}
                persistenceMode={persistenceMode}
                systemConfig={systemConfig}
                onSystemConfigUpdated={cfg => setSystemConfig(cfg)}
                onDataMutatedForCurrentUser={async () => {
                  await carregarDadosDoUsuario(authUser.id, { force: true });
                }}
                onRequestConfirm={opts =>
                  setConfirmModal({
                    isOpen: true,
                    title: opts.title,
                    description: opts.description,
                    confirmLabel: opts.confirmLabel,
                    cancelLabel: opts.cancelLabel,
                    variant: opts.variant,
                    onConfirm: opts.onConfirm,
                  })
                }
                onShowToast={showToast}
                initialSubTab={adminInitialSubTab}
                subTabTrigger={adminSubTabTrigger}
              />
            )}
          </>
        )}
      </main>

      {/* Global Responsive Footer (Clears Bottom Tab Bar & FAB on Mobile) */}
      <Footer
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />

      {/* Global Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, onCancel: undefined }))}
      />

      {/* Global Vehicle Modal (for empty state and first creation) */}
      <VehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={vehicleData => {
          void handleSaveVehicle(vehicleData);
          setIsVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        initialVehicle={editingVehicle}
      />

      {/* Quick Fuel-up Registration Modal */}
      {activeVehicle && (
        <FuelModal
          isOpen={isFuelModalOpen}
          onClose={() => {
            setIsFuelModalOpen(false);
            setEditingLog(null);
          }}
          onSave={handleSaveFuelLog}
          vehicle={activeVehicle}
          initialLog={editingLog}
          existingLogs={activeVehicleLogs}
          stations={stations}
        />
      )}

      {/* Extra Expense Modal */}
      {activeVehicle && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={expenseData => {
            void handleSaveExpense(expenseData);
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          vehicleId={activeVehicle.id}
          currentVehicleOdometer={activeVehicle.currentOdometer}
          initialExpense={editingExpense}
        />
      )}

      {/* Central de Notificações (Alertas Inteligentes) */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onNotificationClick={handleNotificationClick}
      />

      {/* Perfil do Usuário */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={authUser}
        vehicles={vehicles}
        fuelLogs={fuelLogs}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        onOpenSettings={() => {
          setSettingsInitialSection('geral');
          setIsSettingsOpen(true);
        }}
        onRestartTour={() => setIsTourOpen(true)}
        persistenceMode={persistenceMode}
      />

      {/* Página / Modal de Configurações */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        userEmail={authUser.email}
        userId={authUser.id}
        vehicles={vehicles}
        fuelLogs={fuelLogs}
        maintenanceItems={maintenanceItems}
        extraExpenses={extraExpenses}
        tireCalibrations={tireCalibrations}
        stations={stations}
        initialSection={settingsInitialSection}
        onApplyCloudData={data => {
          const uniqueVehicles = dedupeById(data.vehicles);
          setVehicles(uniqueVehicles);
          setFuelLogs(dedupeById(data.fuelLogs));
          setMaintenanceItems(dedupeById(data.maintenanceItems));
          setExtraExpenses(dedupeById(data.extraExpenses || []));
          setTireCalibrations(dedupeById(data.tireCalibrations || []));
          setStations(dedupeById(data.stations || []));
          setActiveVehicleId(prev =>
            prev && uniqueVehicles.some(v => v.id === prev)
              ? prev
              : uniqueVehicles[0]?.id || ''
          );
          showToast('Dados carregados com sucesso!', 'success');
        }}
        onRestoreBackup={data => handleRestoreAllData(data)}
        onFactoryReset={handleFactoryReset}
      />

      {/* Global Legal Modals (accessible from Footer) */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

      {/* Interactive 5-Step Guided Onboarding Tour */}
      <GuidedTourModal
        isOpen={isTourOpen}
        onClose={handleCompleteGuidedTour}
        onComplete={handleCompleteGuidedTour}
      />

      {/* Toast Notification for Supabase & Operations (Interactive on error so details are readable) */}
      {toast && (
        <div className="fixed top-[calc(4.5rem+max(0.75rem,env(safe-area-inset-top)))] left-4 right-4 sm:left-auto sm:right-6 z-[60] sm:max-w-md pointer-events-auto animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-neutral-900/95 border-emerald-500/40 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-neutral-900/95 border-red-500/40 text-red-300'
                : toast.type === 'warning'
                ? 'bg-neutral-900/95 border-amber-500/40 text-amber-300'
                : 'bg-neutral-900/95 border-neutral-700 text-slate-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />}
            <span className="leading-snug flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Fechar notificação"
              className="p-0.5 rounded-md opacity-70 hover:opacity-100 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
