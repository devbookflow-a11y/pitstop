import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  Gauge,
  DollarSign,
  Compass,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AuthUser } from '../types';
import {
  adapterSignIn,
  adapterSignUp,
  PersistenceMode,
  readBlockedAuthMessage,
  clearBlockedAuthMessage,
} from '../lib/storageAdapter';
import { TermsModal } from './TermsModal';
import { PrivacyModal } from './PrivacyModal';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  persistenceMode?: PersistenceMode;
}

const CORE_PILLARS = [
  {
    icon: Gauge,
    title: 'Cálculo Real Tanque a Tanque',
    description:
      'Média exata em km/L, comparativo Flex inteligente e ranking real de rendimento por posto.',
    accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: DollarSign,
    title: 'TCO por Quilômetro',
    description:
      'Custo real por km (R$/km) consolidando combustível, manutenções preventivas, IPVA e seguro.',
    accent: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: Compass,
    title: 'Radar Preditivo',
    description:
      'Previsão do próximo abastecimento, lembretes de calibragem de pneus e simulador de viagem.',
    accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  theme,
  onToggleTheme,
  persistenceMode = 'cloud',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('reset_email') || '';
    } catch {
      return '';
    }
  });
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Error/Feedback/Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [blockedBannerMessage, setBlockedBannerMessage] = useState<string | null>(() =>
    readBlockedAuthMessage()
  );

  // Modals state
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const persisted = readBlockedAuthMessage();
    if (persisted) {
      setBlockedBannerMessage(persisted);
    }
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleDismissBlockedBanner = () => {
    clearBlockedAuthMessage();
    setBlockedBannerMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    clearBlockedAuthMessage();
    setBlockedBannerMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = senha.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    try {
      const { user, error } = await adapterSignIn(cleanEmail, cleanPass);
      const persistedBlocked = readBlockedAuthMessage();

      if (persistedBlocked) {
        setBlockedBannerMessage(persistedBlocked);
        setIsLoading(false);
        return;
      }

      if (error) {
        setErrorMessage(error);
        setIsLoading(false);
        return;
      }

      if (user) {
        setSuccessMessage(`Bem-vindo de volta, ${user.nome}!`);
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = setTimeout(() => {
          onLoginSuccess(user);
        }, 300);
      } else {
        setErrorMessage('Não foi possível obter a sessão do usuário. Tente novamente.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar ao servidor.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanNome = nome.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = senha.trim();
    const cleanConfirma = confirmaSenha.trim();

    if (!cleanNome || !cleanEmail || !cleanPass || !cleanConfirma) {
      setErrorMessage('Preencha todos os campos para criar sua conta.');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMessage('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (cleanPass !== cleanConfirma) {
      setErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage(
        'Você precisa ler e aceitar os Termos de Uso e a Política de Privacidade para continuar.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const { user, hasSession, error } = await adapterSignUp(cleanEmail, cleanPass, {
        nome: cleanNome,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanNome)}`,
      });

      if (error) {
        setErrorMessage(error);
        setIsLoading(false);
        return;
      }

      if (hasSession && user) {
        setSuccessMessage('Conta criada com sucesso! Entrando no PitStop...');
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = setTimeout(() => {
          onLoginSuccess(user);
        }, 350);
      } else if (user) {
        setSuccessMessage(
          'Conta cadastrada com sucesso! Enviamos um link de confirmação para o seu e-mail. Por favor, confirme-o e faça login.'
        );
        setIsLoading(false);
        setMode('login');
      } else {
        setSuccessMessage('Conta criada com sucesso! Faça login com suas credenciais.');
        setIsLoading(false);
        setMode('login');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar conta.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* LEFT COLUMN (Clean Institutional Showcase harmonized in Light & Dark Mode) */}
      <aside className="hidden lg:flex flex-col justify-center bg-white dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 relative overflow-hidden p-12 xl:p-16 border-r border-zinc-200 dark:border-zinc-800 transition-colors">
        {/* Subtle Neutral Telemetry Grid & Ambient Emerald/Amber Glows */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.045] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(113,113,122,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(113,113,122,0.5) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-28 -left-24 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/12 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none"
        />

        {/* Institutional Content */}
        <div className="relative z-10 space-y-10 max-w-lg mx-auto w-full">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800 bg-[#09090B] flex items-center justify-center shrink-0">
              <img
                src="/icon-192x192.png"
                alt="Logo PitStop"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                  PITSTOP
                </span>
                <svg
                  width="22"
                  height="14"
                  viewBox="0 0 22 14"
                  fill="none"
                  aria-hidden="true"
                  className="text-emerald-500"
                >
                  <path
                    d="M1 10H5L7.5 3L11.5 12L15 5.5L17 8.5H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                Telemetria & Gestão Automotiva Inteligente
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.15] text-zinc-900 dark:text-white">
              Controle inteligente de consumo, custos e manutenção do seu veículo.
            </h1>
            <p className="text-sm xl:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Transforme cada abastecimento e revisão em decisões reais de economia com precisão de painel automotivo.
            </p>
          </div>

          {/* 3 Minimalist Core Pillars */}
          <div className="space-y-4">
            {CORE_PILLARS.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.accent}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {item.title}
                    </h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN (Clean Auth Area respecting Light Mode & Dark Mode) */}
      <main className="flex flex-col justify-center px-4 sm:px-8 py-8 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-zinc-50 dark:bg-[#09090B] relative transition-colors">
        {/* Top-Right Theme Toggle */}
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Alternar tema claro e escuro"
            className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-[#121215] hover:bg-zinc-100 dark:hover:bg-[#18181B] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all active:scale-95"
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-zinc-700" />
            )}
          </button>
        </div>

        <div className="w-full max-w-md mx-auto my-auto z-10 animate-in fade-in zoom-in-95 duration-200">
          {/* Compact Mobile Header (< 1024px) */}
          <div className="lg:hidden flex items-center gap-3 mb-5 pr-12">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800 bg-[#09090B] shrink-0">
              <img
                src="/icon-192x192.png"
                alt="Logo PitStop"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
                PITSTOP
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                Telemetria de Combustível & Gestão de Garagem
              </p>
            </div>
          </div>

          {/* Auth Card Container */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/70 space-y-5 transition-colors">
            <div className="hidden lg:block space-y-1">
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {mode === 'login' ? 'Acesse sua garagem' : 'Crie sua conta gratuita'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                {mode === 'login'
                  ? 'Entre para sincronizar seus veículos e abastecimentos na nuvem.'
                  : 'Comece a monitorar consumo, postos e custos reais em segundos.'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`min-h-[44px] py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 ${
                  mode === 'login'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`min-h-[44px] py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 ${
                  mode === 'register'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* Persistent Blocked Account Alert (cleared only by explicit X or new login attempt) */}
            {blockedBannerMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-amber-500/15 dark:bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-200 text-xs flex items-start gap-2.5"
              >
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <strong className="block font-bold text-red-800 dark:text-red-300">
                    Acesso Bloqueado
                  </strong>
                  <span className="block leading-relaxed break-words">{blockedBannerMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDismissBlockedBanner}
                  aria-label="Fechar aviso de bloqueio"
                  className="p-1 rounded-lg text-red-600 dark:text-red-300 hover:bg-red-500/15 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Feedback messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <span className="flex-1 break-words">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      autoComplete="email"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-300 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="Sua senha secreta"
                      autoComplete="current-password"
                      className="w-full min-h-[44px] pl-10 pr-12 py-2.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-300 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 absolute right-1 top-1/2 -translate-y-1/2 transition-colors active:scale-95"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-neutral-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{persistenceMode === 'local' ? 'Entrando...' : 'Conectando ao Supabase...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no PitStop</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Como prefere ser chamado"
                      autoComplete="name"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-300 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      autoComplete="email"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-300 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Senha (mín. 6)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={senha}
                        onChange={e => setSenha(e.target.value)}
                        placeholder="••••••"
                        className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-300 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmaSenha}
                        onChange={e => setConfirmaSenha(e.target.value)}
                        placeholder="••••••"
                        className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-300 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Show/Hide password toggle */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="min-h-[40px] px-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors active:scale-95"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showPassword ? 'Ocultar senhas' : 'Ver senhas digitadas'}</span>
                  </button>
                </div>

                {/* Terms and Privacy Checkbox */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 leading-snug select-none py-1">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500 shrink-0"
                    />
                    <span>
                      Li e concordo com os{' '}
                      <button
                        type="button"
                        onClick={() => setIsTermsOpen(true)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 underline font-semibold py-1"
                      >
                        Termos de Uso
                      </button>{' '}
                      e a{' '}
                      <button
                        type="button"
                        onClick={() => setIsPrivacyOpen(true)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 underline font-semibold py-1"
                      >
                        Política de Privacidade
                      </button>
                      .
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-neutral-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Criando sua conta...</span>
                    </>
                  ) : (
                    <>
                      <span>Criar Minha Conta</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Bottom badge */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                {persistenceMode === 'local'
                  ? 'Modo Preview Local • Dados salvos neste navegador'
                  : 'Nuvem Sincronizada • Autenticação Segura via Supabase'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={() => setAcceptedTerms(true)}
        showAcceptButton={mode === 'register' && !acceptedTerms}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        onAccept={() => setAcceptedTerms(true)}
        showAcceptButton={mode === 'register' && !acceptedTerms}
      />
    </div>
  );
};
