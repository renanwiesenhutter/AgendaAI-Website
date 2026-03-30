import React from 'react';
import { Mail, Smartphone, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAccountByPhone, updateAccount } from '../services/accountService';
import type { AccountWebhookResponse } from '../types/account';
import {
  formatCurrencyBRL,
  formatDatePtBR,
  formatPhoneBR,
  formatSubscriptionInterval,
  getDigits,
  normalizePhoneForWebhook
} from '../utils/accountFormatters';

const TOKEN_KEY = 'agendaai_token';
const AUTH_PHONE_KEY = 'agendaai_auth_phone';
const ACCOUNT_PHONE_KEY = 'agendaai_user_phone';

type UserData = {
  name: string;
  email: string;
  whatsapp: string;
};

type SubscriptionData = {
  planName: string;
  amount: number | null;
  currency: string;
  interval: string;
  nextBillingDate: string;
  portalUrl: string;
};

type SavePhase = 'idle' | 'verifying' | 'moving' | 'checking' | 'success';

type BillingNotice = {
  type: 'success' | 'error';
  message: string;
};

export default function Conta() {
  const navigate = useNavigate();
  const [isEditingBilling, setIsEditingBilling] = React.useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);
  const [assetsReady, setAssetsReady] = React.useState(false);
  const [bootVisible, setBootVisible] = React.useState(true);
  const [accountLoading, setAccountLoading] = React.useState(true);
  const [accountError, setAccountError] = React.useState('');
  const [user, setUser] = React.useState<UserData>({
    name: '',
    email: '',
    whatsapp: ''
  });
  const [subscription, setSubscription] = React.useState<SubscriptionData>({
    planName: '',
    amount: null,
    currency: 'BRL',
    interval: '',
    nextBillingDate: '',
    portalUrl: ''
  });

  const [billingName, setBillingName] = React.useState('');
  const [billingEmail, setBillingEmail] = React.useState('');
  const [billingPhone, setBillingPhone] = React.useState('');

  const [touched, setTouched] = React.useState({
    name: false,
    email: false,
    phone: false,
  });

  const [focused, setFocused] = React.useState({
    name: false,
    email: false,
    phone: false,
  });
  const [savePhase, setSavePhase] = React.useState<SavePhase>('idle');
  const [savingBilling, setSavingBilling] = React.useState(false);
  const [loaderShiftPx, setLoaderShiftPx] = React.useState(150);
  const [billingNotice, setBillingNotice] = React.useState<BillingNotice | null>(null);
  const [initialBillingValues, setInitialBillingValues] = React.useState({
    name: '',
    email: '',
    phone: '',
  });
  const saveButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const saveTimersRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const clearSaveTimers = React.useCallback(() => {
    saveTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    saveTimersRef.current = [];
  }, []);

  const queueSaveTimer = React.useCallback((callback: () => void, delay: number) => {
    const timerId = window.setTimeout(callback, delay);
    saveTimersRef.current.push(timerId);
  }, []);

  React.useEffect(() => {
    return () => {
      clearSaveTimers();
    };
  }, [clearSaveTimers]);

  const applyAccountPayload = React.useCallback((payload: AccountWebhookResponse, requestPhone: string) => {
    const apiAccount = payload.account ?? null;
    const apiSubscription = payload.subscription ?? null;

    const normalizedPhone = normalizePhoneForWebhook(apiAccount?.phone || requestPhone);
    const displayPhone = formatPhoneBR(normalizedPhone || requestPhone);

    if (normalizedPhone) {
      localStorage.setItem(ACCOUNT_PHONE_KEY, normalizedPhone);
    }

    setUser({
      name: apiAccount?.name?.trim() || 'Nome nao informado',
      email: apiAccount?.email?.trim() || 'Email nao informado',
      whatsapp: displayPhone || '-'
    });

    if (apiSubscription) {
      setSubscription({
        planName: apiSubscription.plan_name?.trim() || 'Plano nao informado',
        amount: typeof apiSubscription.amount === 'number' ? apiSubscription.amount : null,
        currency: apiSubscription.currency?.trim() || 'BRL',
        interval: apiSubscription.interval?.trim() || '',
        nextBillingDate: apiSubscription.next_billing_date?.trim() || '',
        portalUrl: apiSubscription.portal_url?.trim() || ''
      });
    }
  }, []);

  const getPhoneFromToken = React.useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const tokenParts = token.split('.');
    if (tokenParts.length < 2) return '';

    try {
      const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64)) as Record<string, unknown>;

      const directPhone = typeof payload.phone === 'string' ? payload.phone : '';
      if (directPhone) return directPhone;

      const whatsapp = typeof payload.whatsapp === 'string' ? payload.whatsapp : '';
      if (whatsapp) return whatsapp;

      const userPayload = payload.user as Record<string, unknown> | undefined;
      if (userPayload && typeof userPayload.phone === 'string') {
        return userPayload.phone;
      }
    } catch {
      return '';
    }

    return '';
  }, []);

  const loadAccountData = React.useCallback(async (forceRefresh = false) => {
    const persistedPhone =
      localStorage.getItem(ACCOUNT_PHONE_KEY) ||
      localStorage.getItem(AUTH_PHONE_KEY) ||
      getPhoneFromToken() ||
      '';
    const normalizedPhone = normalizePhoneForWebhook(persistedPhone);

    if (!normalizedPhone) {
      setAccountError('Nao foi possivel identificar o telefone da conta logada.');
      setAccountLoading(false);
      return;
    }

    setAccountLoading(true);
    setAccountError('');

    try {
      const payload = await fetchAccountByPhone(normalizedPhone, { force: forceRefresh });
      applyAccountPayload(payload, normalizedPhone);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel carregar os dados da conta.';
      setAccountError(message);
      setUser((prev) => ({
        ...prev,
        whatsapp: prev.whatsapp || formatPhoneBR(normalizedPhone)
      }));
    } finally {
      setAccountLoading(false);
    }
  }, [applyAccountPayload, getPhoneFromToken]);

  React.useEffect(() => {
    void loadAccountData(false);
  }, [loadAccountData]);

  React.useEffect(() => {
    let cancelled = false;

    const waitForImage = (src: string, timeoutMs = 4000) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        const finish = () => {
          window.clearTimeout(timeoutId);
          resolve();
        };
        image.onload = finish;
        image.onerror = finish;
        image.src = src;

        const timeoutId = window.setTimeout(resolve, timeoutMs);
        if (image.complete) {
          finish();
        }
      });

    const waitForFonts = () => {
      if (!('fonts' in document) || !document.fonts?.ready) {
        return Promise.resolve();
      }

      return Promise.race([
        document.fonts.ready.then(() => undefined).catch(() => undefined),
        new Promise<void>((resolve) => window.setTimeout(resolve, 1500))
      ]);
    };

    const waitForPaint = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });

    const preloadSources = [
      '/images/Logomarca.png',
      'https://js.stripe.com/v3/fingerprinted/img/FlagIcon-BR-36784f2b8710431a9b536b7224da0eba.svg'
    ];

    Promise.all([...preloadSources.map((src) => waitForImage(src)), waitForFonts(), waitForPaint()]).then(() => {
      if (cancelled) return;
      setAssetsReady(true);
    });

    const hardTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setAssetsReady(true);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(hardTimeoutId);
    };
  }, []);

  React.useEffect(() => {
    if (!assetsReady || accountLoading) return;
    const timeoutId = window.setTimeout(() => {
      setBootVisible(false);
    }, 80);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accountLoading, assetsReady]);

  React.useEffect(() => {
    if (!showSignOutConfirm) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSignOutConfirm(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showSignOutConfirm]);

  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

  const updateLoaderShift = React.useCallback(() => {
    const buttonWidth = saveButtonRef.current?.offsetWidth;
    if (!buttonWidth) return;
    const distance = Math.max(0, buttonWidth / 2 - 32);
    setLoaderShiftPx(distance);
  }, []);

  React.useEffect(() => {
    if (!isEditingBilling) return;
    updateLoaderShift();
    window.addEventListener('resize', updateLoaderShift);
    return () => window.removeEventListener('resize', updateLoaderShift);
  }, [isEditingBilling, updateLoaderShift]);

  const handlePhoneChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;

    let digits = getDigits(raw);
    const startsIntl = /^\s*(\+|00)/.test(raw);
    if ((startsIntl || digits.length > 11) && digits.startsWith('55')) {
      digits = digits.slice(2);
    }

    digits = digits.slice(0, 11);
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);

    let formatted = '';

    if (digits.length <= 2) {
      formatted = digits;
    } else {
      const prefix = `(${ddd}) `;

      if (digits.length > 10) {
        const p1 = rest.slice(0, 5);
        const p2 = rest.slice(5, 9);
        formatted = prefix + (p2 ? `${p1}-${p2}` : p1);
      } else {
        const p1 = rest.slice(0, 4);
        const p2 = rest.slice(4, 8);
        formatted = prefix + (p2 ? `${p1}-${p2}` : p1);
      }
    }

    setBillingPhone(formatted);
  }, []);

  const validateName = (value: string) => {
    const v = value.trim();
    if (v.length === 0) return '';
    if (v.length < 3) return 'Seu nome precisa de pelo menos três caracteres.';
    if (v.length > 30) return 'Seu nome pode ter no máximo 30 caracteres.';
    return '';
  };

  const validateEmail = (value: string) => {
    const v = value.trim();
    if (v.length === 0) return '';
    if (!v.includes('@')) return 'Seu e-mail está incompleto.';
    if (!gmailRegex.test(v)) return 'Lembre-se de usar um Gmail.';
    return '';
  };

  const validatePhone = (value: string) => {
    const digits = getDigits(value);
    if (digits.length === 0) return '';
    if (digits.length < 10) return 'Seu telefone está incompleto.';
    return '';
  };

  const getNameError = () => {
    if (!touched.name || focused.name) return '';
    return validateName(billingName);
  };

  const getEmailError = () => {
    if (!touched.email || focused.email) return '';
    return validateEmail(billingEmail);
  };

  const getPhoneError = () => {
    if (!touched.phone || focused.phone) return '';
    return validatePhone(billingPhone);
  };

  const nameError = getNameError();
  const emailError = getEmailError();
  const phoneError = getPhoneError();
  const groupError = nameError || emailError || phoneError;
  const isSaveAnimating = savePhase !== 'idle';
  const saveSubmitDisabled = savingBilling || Boolean(groupError);
  const subscriptionAmountLabel = formatCurrencyBRL(subscription.amount, subscription.currency);
  const subscriptionIntervalLabel = formatSubscriptionInterval(subscription.interval);
  const nextBillingDateLabel = formatDatePtBR(subscription.nextBillingDate);
  const canOpenPortal = Boolean(subscription.portalUrl);

  const openBillingEditor = () => {
    clearSaveTimers();
    setSavePhase('idle');
    setSavingBilling(false);
    setBillingNotice(null);
    setBillingName(user.name);
    setBillingEmail(user.email);
    setBillingPhone(user.whatsapp);
    setInitialBillingValues({
      name: user.name,
      email: user.email,
      phone: user.whatsapp,
    });
    setTouched({ name: false, email: false, phone: false });
    setFocused({ name: false, email: false, phone: false });
    setIsEditingBilling(true);
  };

  const closeBillingEditor = (options?: { restoreInitialValues?: boolean }) => {
    clearSaveTimers();
    setSavePhase('idle');
    setSavingBilling(false);

    if (options?.restoreInitialValues) {
      setBillingName(initialBillingValues.name);
      setBillingEmail(initialBillingValues.email);
      setBillingPhone(initialBillingValues.phone);
    }

    setIsEditingBilling(false);
    setTouched({ name: false, email: false, phone: false });
    setFocused({ name: false, email: false, phone: false });
  };

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
  };

  const handleHeaderAction = () => {
    if (isEditingBilling) {
      closeBillingEditor({ restoreInitialValues: true });
      return;
    }

    handleSignOut();
  };

  const cancelSignOut = () => {
    setShowSignOutConfirm(false);
  };

  const confirmSignOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_PHONE_KEY);
    localStorage.removeItem(ACCOUNT_PHONE_KEY);
    navigate('/', { replace: true });
  };

  const handleSaveBilling = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (savingBilling || isSaveAnimating) {
      return;
    }

    const submitNameError = validateName(billingName);
    const submitEmailError = validateEmail(billingEmail);
    const submitPhoneError = validatePhone(billingPhone);
    const hasErrors = Boolean(submitNameError || submitEmailError || submitPhoneError);

    if (hasErrors) {
      setTouched({ name: true, email: true, phone: true });
      setFocused({ name: false, email: false, phone: false });
      return;
    }

    const submittedName = billingName.trim() || initialBillingValues.name || user.name;
    const submittedEmail = billingEmail.trim() || initialBillingValues.email || user.email;
    const submittedPhoneDisplay = billingPhone.trim() || initialBillingValues.phone || user.whatsapp;
    const normalizedPhone = normalizePhoneForWebhook(submittedPhoneDisplay);

    setBillingNotice(null);
    setSavingBilling(true);
    clearSaveTimers();
    setSavePhase('verifying');

    const saveStartedAt = performance.now();

    try {
      const payload = await updateAccount({
        name: submittedName,
        email: submittedEmail,
        phone: submittedPhoneDisplay,
        previous_name: initialBillingValues.name,
        previous_email: initialBillingValues.email,
        previous_phone: initialBillingValues.phone,
      });

      const payloadWithFallback: AccountWebhookResponse = {
        ...payload,
        account: {
          name: payload.account?.name ?? submittedName,
          email: payload.account?.email ?? submittedEmail,
          phone: payload.account?.phone ?? normalizedPhone,
        }
      };

      applyAccountPayload(payloadWithFallback, normalizedPhone);
      setBillingNotice(null);

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const elapsedSinceVerifying = performance.now() - saveStartedAt;
      const minimumVerifyingMs = prefersReducedMotion ? 280 : 900;
      const remainingVerifyingMs = Math.max(0, minimumVerifyingMs - elapsedSinceVerifying);

      if (remainingVerifyingMs > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, remainingVerifyingMs);
        });
      }

      if (prefersReducedMotion) {
        setSavePhase('success');
        queueSaveTimer(() => {
          closeBillingEditor();
        }, 1080);
        return;
      }

      setSavePhase('moving');
      queueSaveTimer(() => setSavePhase('checking'), 900);
      queueSaveTimer(() => setSavePhase('success'), 1500);
      queueSaveTimer(() => {
        closeBillingEditor();
        void loadAccountData(true);
      }, 2500);
    } catch (error) {
      setSavingBilling(false);
      setSavePhase('idle');
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : 'Nao foi possivel atualizar os dados da conta agora. Tente novamente.';
      setBillingNotice({ type: 'error', message });
    }
  };

  if (bootVisible) {
    return (
      <main className="min-h-[100dvh] flex flex-col lg:flex-row bg-[#f7fbff]">
        <aside className="w-full lg:w-[42%] bg-gradient-to-r from-blue-500 to-green-600 px-5 lg:px-10 pt-0 pb-0 min-h-[90px] lg:min-h-0 lg:pt-14 lg:pb-10">
          <div className="mt-6 lg:mt-8">
            <div className="account-skeleton-shimmer h-8 w-48 rounded-xl bg-white/25" />
          </div>
        </aside>

        <section className="w-full lg:w-[58%] px-6 lg:px-10 py-10 lg:py-16">
          <div className="w-full max-w-[520px] mx-auto lg:mx-0 lg:ml-14">
            <div className="account-skeleton-shimmer h-10 w-52 rounded-2xl bg-[#e6e6e8]" />
            <div className="account-skeleton-shimmer mt-4 h-5 w-[88%] rounded-xl bg-[#e6e6e8]" />

            <div className="mt-7 space-y-3">
              <div className="account-skeleton-shimmer h-6 w-[72%] rounded-xl bg-[#e6e6e8]" />
              <div className="account-skeleton-shimmer h-6 w-[80%] rounded-xl bg-[#e6e6e8]" />
              <div className="account-skeleton-shimmer h-6 w-[68%] rounded-xl bg-[#e6e6e8]" />
            </div>

            <div className="account-skeleton-shimmer mt-8 h-12 w-[240px] rounded-md bg-[#e6e6e8]" />
            <div className="account-skeleton-shimmer mt-10 h-[50px] w-full max-w-[380px] rounded-md bg-[#e6e6e8]" />
          </div>
        </section>

        <style>{`
          .account-skeleton-shimmer {
            position: relative;
            overflow: hidden;
          }

          .account-skeleton-shimmer::after {
            content: '';
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 48%, rgba(255,255,255,0) 100%);
            animation: account-skeleton-wave 1.2s ease-in-out infinite;
          }

          @keyframes account-skeleton-wave {
            to {
              transform: translateX(100%);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] flex flex-col lg:flex-row">
      <aside className="w-full lg:w-[42%] bg-gradient-to-r from-blue-500 to-green-600 text-white px-5 lg:px-10 pt-0 pb-0 min-h-[90px] lg:min-h-0 lg:pt-14 lg:pb-10 flex flex-col justify-center lg:justify-between">
        <div className="pl-0 lg:pl-4 flex justify-start lg:block">
          <div className="mb-0 lg:mb-12 flex flex-col items-start">
            <button
              type="button"
              onClick={handleHeaderAction}
              className="mt-0 mb-2 inline-flex lg:hidden items-center gap-1 text-white/90 hover:text-white transition-colors"
              aria-label={isEditingBilling ? 'Voltar para minha conta' : 'Sair'}
            >
              <svg viewBox="0 0 16 16" className="h-[14px] w-[14px] shrink-0" fill="currentColor" aria-hidden="true">
                {isEditingBilling ? (
                  <path d="M4.72.97a.75.75 0 0 1 1.06 1.06L2.56 5.25h8.69a.75.75 0 0 1 0 1.5H2.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.748.748 0 0 1 0-1.06l4.5-4.5Z" />
                ) : (
                  <path d="M5.994 2.38a.875.875 0 1 0-1.238-1.238l-4.25 4.25A.849.849 0 0 0 .25 6c0 .232.093.466.257.63l4.25 4.24a.875.875 0 1 0 1.236-1.24L3.238 6.875h7.387C12.492 6.875 14 8.271 14 10c0 1.797-1.578 3.375-3.375 3.375a.875.875 0 0 0 0 1.75c2.763 0 5.125-2.362 5.125-5.125 0-2.83-2.43-4.872-5.12-4.875H3.24l2.754-2.746Z" />
                )}
              </svg>
              <span className="inline-flex items-center text-[14px] leading-[14px]">{isEditingBilling ? 'Voltar para minha conta' : 'Sair'}</span>
            </button>

            <div className="mt-1 lg:mt-10 lg:ml-0">
              <Link to="/" className="inline-flex items-center" aria-label="Ir para home">
                <img src="/images/Logomarca.png" alt="Dalzzen" className="h-6 w-auto" />
              </Link>
            </div>
          </div>

          <p className="hidden lg:block max-w-[360px] text-3xl lg:text-[28px] leading-tight font-semibold tracking-tight">
            Bem vindo de volta,<br />{user.name || 'Usuario'}.
          </p>

          <button
            type="button"
            onClick={handleHeaderAction}
            className="hidden lg:flex mt-4 items-center gap-1.5 text-white hover:opacity-90 transition-opacity"
            aria-label={isEditingBilling ? 'Voltar para minha conta' : 'Sair'}
          >
            <svg viewBox="0 0 16 16" className="h-[12px] w-[12px] shrink-0" fill="currentColor" aria-hidden="true">
              {isEditingBilling ? (
                <path d="M4.72.97a.75.75 0 0 1 1.06 1.06L2.56 5.25h8.69a.75.75 0 0 1 0 1.5H2.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.748.748 0 0 1 0-1.06l4.5-4.5Z" />
              ) : (
                <path d="M5.994 2.38a.875.875 0 1 0-1.238-1.238l-4.25 4.25A.849.849 0 0 0 .25 6c0 .232.093.466.257.63l4.25 4.24a.875.875 0 1 0 1.236-1.24L3.238 6.875h7.387C12.492 6.875 14 8.271 14 10c0 1.797-1.578 3.375-3.375 3.375a.875.875 0 0 0 0 1.75c2.763 0 5.125-2.362 5.125-5.125 0-2.83-2.43-4.872-5.12-4.875H3.24l2.754-2.746Z" />
              )}
            </svg>
            <span className="inline-flex items-center text-[14px] font-medium leading-[14px]">{isEditingBilling ? 'Voltar para minha conta' : 'Sair'}</span>
          </button>
        </div>

        <div className="hidden lg:block mt-12 pl-2 lg:pl-4 text-sm text-white/90 space-y-2">
          <div className="flex items-center space-x-1 text-white/90">
            <span>Powered by</span>
            <span className="flex items-baseline cursor-default">
              <span style={{ fontFamily: '"Lily Script One", cursive' }} className="text-white text-[16px] leading-none">
                D
              </span>
              <span style={{ fontFamily: '"Lobster", cursive' }} className="text-white text-[16px] leading-none">
                alzzen
              </span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-white/85">
            <Link to="/termos-de-uso" className="hover:text-white transition-colors">Termos</Link>
            <Link to="/politica-de-privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </aside>

      <section className="account-page-enter w-full lg:w-[58%] bg-[#f7fbff] lg:bg-white px-6 lg:px-10 py-10 lg:py-16 flex-1 min-h-0 flex flex-col">
        <div className="w-full max-w-[520px] mx-auto lg:mx-0 lg:ml-14 lg:flex-1">
          {!isEditingBilling ? (
            <>
              <h1 className="text-[32px] leading-[1.05] font-semibold text-[#1A1A1AE6] tracking-[-0.02em]">
                Minha conta
              </h1>

              <p className="mt-5 text-[16px] text-[#1A1A1AB2] leading-relaxed">
                Visualize e gerencie as informações da sua assinatura.
              </p>

              {accountError ? (
                <div className="mt-3 rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[14px] text-[#b91c1c]">
                  {accountError}
                  <button
                    type="button"
                    onClick={() => void loadAccountData(true)}
                    className="ml-2 font-semibold underline underline-offset-2 hover:opacity-80"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : null}

              <div className="mt-4 bg-transparent">
                <div className="flex items-center gap-3" style={{ paddingTop: '10px', paddingBottom: '4px' }}>
                  <UserRound className="h-5 w-5 text-[#9CA3AF]" />
                  <span className="text-[16px] text-[#1F2937]">{user.name || 'Nome nao informado'}</span>
                </div>

                <div className="flex items-center gap-3" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
                  <Mail className="h-5 w-5 text-[#9CA3AF]" />
                  <span className="text-[16px] text-[#1F2937]">{user.email || 'Email nao informado'}</span>
                </div>

                <div className="flex items-center gap-3" style={{ paddingTop: '4px', paddingBottom: '2px' }}>
                  <Smartphone className="h-5 w-5 text-[#9CA3AF]" strokeWidth={2.4} />
                  <span className="text-[16px] text-[#1F2937]">{user.whatsapp || '-'}</span>
                </div>
              </div>

              <button
                type="button"
                  onClick={openBillingEditor}
                className="mt-4 inline-flex items-center gap-2 text-[#3c4257] text-[16px] font-medium hover:text-[#2D3748] transition-colors"
              >
                <svg viewBox="0 0 16 16" className="h-[12px] w-[12px]" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.75 2.5c-.69 0-1.25.56-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V8.694a.75.75 0 0 1 1.5 0v3.556A2.75 2.75 0 0 1 12.25 15h-8.5A2.75 2.75 0 0 1 1 12.25v-8.5A2.75 2.75 0 0 1 3.75 1h3.556a.75.75 0 1 1 0 1.5H3.75Z"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M13.739 1.178a1.75 1.75 0 0 0-2.478.002l-6.05 6.073a.75.75 0 0 0-.2.361l-.742 3.217a.75.75 0 0 0 .9.9l3.217-.743a.75.75 0 0 0 .363-.201l6.053-6.076a1.75 1.75 0 0 0-.003-2.472l-1.06-1.06ZM12.323 2.24a.25.25 0 0 1 .354 0l1.06 1.06a.25.25 0 0 1 0 .354l-.745.749-1.415-1.415.746-.748ZM10.52 4.05 6.425 8.16 6.001 10l1.837-.425 4.096-4.11L10.52 4.05Z"
                  />
                </svg>
                Atualizar informações
              </button>

              <div className="mt-12">
                <p className="text-[14px] font-medium uppercase tracking-[0.08em] text-[#1A1F36]">
                  Assinatura atual
                </p>
                <p className="mt-4 text-[20px] leading-tight text-[#3C4257]">
                  {subscription.planName}
                </p>
                <p className="mt-1 text-[24px] font-semibold leading-none text-[#3C4257]">
                  {subscriptionAmountLabel}
                  {subscriptionIntervalLabel ? ` ${subscriptionIntervalLabel}` : ''}
                </p>
                <p className="mt-3 text-[14px] text-[#1a1f36]">
                  Sua proxima data de faturamento e {nextBillingDateLabel}.
                </p>
              </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!canOpenPortal) return;
                    window.open(subscription.portalUrl, '_blank', 'noopener,noreferrer');
                  }}
                  disabled={!canOpenPortal}
                  className={`mt-10 w-full max-w-[380px] h-[50px] rounded-md border border-[#D1D5DB] bg-white text-[#374151] text-[16px] font-semibold transition-colors ${
                    canOpenPortal ? 'hover:bg-[#F9FAFB]' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                Gerenciar Assinatura
              </button>
            </>
          ) : (
            <div className="account-step-enter">
              <div className="text-[14px] text-[#4B5563] flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => closeBillingEditor({ restoreInitialValues: true })}
                  className="font-semibold hover:text-[#111827] transition-colors"
                >
                  Conta
                </button>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[#64748B]">Dados da conta</span>
              </div>

              <h1 className="mt-6 text-[32px] leading-[1.05] font-semibold text-[#1A1A1AE6] tracking-[-0.02em]">
                Dados da conta
              </h1>

              <form className="mt-8" onSubmit={handleSaveBilling}>
                <label className="block text-[14px] font-medium text-[#374151] mb-2">Nome</label>
                <div
                  className={[
                    'w-[350px] h-[48px] rounded-md border bg-white px-4 flex items-center gap-3 transition-colors',
                    nameError ? 'border-red-300' : 'border-[#CBD5E1]',
                    'focus-within:ring-2 focus-within:ring-[#4c9ffe]/20 focus-within:border-[#4c9ffe]',
                  ].join(' ')}
                >
                  <UserRound className="h-4 w-4 text-gray-400" strokeWidth={2.4} />
                  <input
                    type="text"
                    value={billingName}
                    maxLength={30}
                    placeholder={user.name}
                    disabled={savingBilling}
                    onChange={(event) => setBillingName(event.target.value)}
                    onFocus={() => setFocused((prev) => ({ ...prev, name: true }))}
                    onBlur={() => {
                      setFocused((prev) => ({ ...prev, name: false }));
                      setTouched((prev) => ({ ...prev, name: true }));
                    }}
                    className={[
                      'w-full bg-transparent text-[16px] outline-none',
                      nameError
                        ? 'text-red-700 placeholder-red-400 caret-red-600'
                        : 'text-[#1F2937] placeholder:text-gray-400/80 caret-blue-600',
                    ].join(' ')}
                  />
                </div>

                <label className="block text-[14px] font-medium text-[#374151] mb-2 mt-7">Email</label>
                <div
                  className={[
                    'w-[350px] h-[48px] rounded-md border bg-white px-4 flex items-center gap-3 transition-colors',
                    emailError ? 'border-red-300' : 'border-[#CBD5E1]',
                    'focus-within:ring-2 focus-within:ring-[#4c9ffe]/20 focus-within:border-[#4c9ffe]',
                  ].join(' ')}
                >
                  <Mail className="h-4 w-4 text-gray-400" strokeWidth={2.4} />
                  <input
                    type="email"
                    autoComplete="email"
                    value={billingEmail}
                    maxLength={50}
                    placeholder={user.email}
                    disabled={savingBilling}
                    onChange={(event) => setBillingEmail(event.target.value)}
                    onFocus={() => setFocused((prev) => ({ ...prev, email: true }))}
                    onBlur={() => {
                      setFocused((prev) => ({ ...prev, email: false }));
                      setTouched((prev) => ({ ...prev, email: true }));
                    }}
                    className={[
                      'w-full bg-transparent text-[16px] outline-none',
                      emailError
                        ? 'text-red-700 placeholder-red-400 caret-red-600'
                        : 'text-[#1F2937] placeholder:text-gray-400/80 caret-blue-600',
                    ].join(' ')}
                  />
                </div>

                <label className="block text-[14px] font-medium text-[#374151] mb-2 mt-7">Telefone</label>
                <div
                  className={[
                    'w-[350px] h-[48px] rounded-md border bg-white px-4 flex items-center gap-3 transition-colors',
                    phoneError ? 'border-red-300' : 'border-[#CBD5E1]',
                    'focus-within:ring-2 focus-within:ring-[#4c9ffe]/20 focus-within:border-[#4c9ffe]',
                  ].join(' ')}
                >
                  <div className="w-[18px] h-[14px] flex items-center justify-center">
                    <img
                      src="https://js.stripe.com/v3/fingerprinted/img/FlagIcon-BR-36784f2b8710431a9b536b7224da0eba.svg"
                      alt="Brasil"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={billingPhone}
                    placeholder={user.whatsapp}
                    disabled={savingBilling}
                    onChange={handlePhoneChange}
                    onFocus={() => setFocused((prev) => ({ ...prev, phone: true }))}
                    onBlur={() => {
                      setFocused((prev) => ({ ...prev, phone: false }));
                      setTouched((prev) => ({ ...prev, phone: true }));
                    }}
                    className={[
                      'w-full bg-transparent text-[16px] outline-none',
                      phoneError
                        ? 'text-red-700 placeholder-red-400 caret-red-600'
                        : 'text-[#1F2937] placeholder:text-gray-400/80 caret-blue-600',
                    ].join(' ')}
                  />
                </div>

                {groupError ? <p className="mt-3 text-[14px] text-red-600">{groupError}</p> : null}
                {billingNotice?.type === 'error' ? (
                  <p className="mt-3 text-[14px] text-red-600">{billingNotice.message}</p>
                ) : null}

                <button
                  ref={saveButtonRef}
                  type="submit"
                  disabled={saveSubmitDisabled}
                  className={`relative mt-10 w-[350px] h-[48px] rounded-md text-white text-[16px] font-semibold bg-gradient-to-r from-blue-500 to-green-600 disabled:cursor-default ${
                    saveSubmitDisabled && !isSaveAnimating ? 'opacity-70' : 'opacity-100'
                  } ${
                    savingBilling ? 'shadow-none' : 'shadow-[0_10px_18px_-14px_rgba(99,91,255,0.35)]'
                  }`}
                  style={{
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 rounded-md bg-[#1ea56f] will-change-[opacity]"
                    style={{
                      opacity: savePhase === 'moving' || savePhase === 'checking' || savePhase === 'success' ? 1 : 0,
                      transition:
                        savePhase === 'moving' || savePhase === 'checking' || savePhase === 'success'
                          ? 'opacity 760ms cubic-bezier(0.22, 1, 0.36, 1)'
                          : 'opacity 220ms ease'
                    }}
                  />

                  <span className={`relative z-[1] transition-opacity duration-250 ${isSaveAnimating ? 'opacity-0' : 'opacity-100'}`}>
                    Salvar
                  </span>

                  <span
                    className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-white text-[16px] font-semibold transition-all duration-300"
                    style={{
                      opacity: savePhase === 'verifying' ? 1 : 0,
                      transform:
                        savePhase === 'verifying'
                          ? 'translate3d(0,0,0)'
                          : savePhase === 'moving' || savePhase === 'checking' || savePhase === 'success'
                            ? 'translate3d(-8px,0,0)'
                            : 'translate3d(10px,0,0)'
                    }}
                  >
                    Salvando...
                  </span>

                  {isSaveAnimating && (
                    <span
                      className="pointer-events-none absolute top-1/2 right-[21px] h-[22px] w-[22px] will-change-transform"
                      style={{
                        transform: `translate3d(${savePhase === 'verifying' ? '0px' : `-${loaderShiftPx}px`}, -50%, 0)`,
                        transition:
                          savePhase === 'moving'
                            ? 'transform 980ms cubic-bezier(0.65, 0, 1, 1)'
                            : 'transform 180ms ease'
                      }}
                    >
                      {savePhase === 'checking' || savePhase === 'success' ? (
                        <svg className="h-full w-full login-check-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" opacity="0.9" className="login-check-orbit" />
                          <path
                            d="M7.2 12.4L10.3 15.5"
                            stroke="white"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="login-check-path-1"
                          />
                          <path
                            d="M10.3 15.5L16.8 9"
                            stroke="white"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="login-check-path-2"
                          />
                        </svg>
                      ) : (
                        <svg className="h-full w-full login-spinner-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray="44 100"
                          />
                        </svg>
                      )}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => closeBillingEditor({ restoreInitialValues: true })}
                  disabled={savingBilling}
                  className="mt-4 w-[350px] h-[48px] rounded-md border border-[#D1D5DB] text-[#374151] text-[16px] font-semibold hover:bg-[#F9FAFB] transition-colors"
                >
                  Cancelar
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="lg:hidden mt-12 pb-2 text-center text-xs text-gray-400 space-y-2">
          <div className="flex items-center justify-center space-x-1">
            <span>Powered by</span>
            <span className="flex items-baseline cursor-default">
              <span style={{ fontFamily: '"Lily Script One", cursive' }} className="text-gray-400 text-sm leading-none">
                D
              </span>
              <span style={{ fontFamily: '"Lobster", cursive' }} className="text-gray-400 text-sm leading-none">
                alzzen
              </span>
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link to="/termos-de-uso" className="hover:underline">Termos</Link>
            <span className="w-px h-4 bg-gray-300" aria-hidden="true"></span>
            <Link to="/politica-de-privacidade" className="hover:underline">Privacidade</Link>
          </div>
        </div>

        <style>{`
          .signout-modal-enter {
            animation: signout-modal-enter 260ms cubic-bezier(0.22, 1, 0.36, 1);
            will-change: transform, opacity;
          }

          @keyframes signout-modal-enter {
            from {
              opacity: 0;
              transform: translateY(8px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .account-page-enter {
            animation: account-page-enter 520ms cubic-bezier(0.22, 1, 0.36, 1);
            will-change: transform, opacity;
          }

          @keyframes account-page-enter {
            from {
              opacity: 0;
              transform: translateY(14px);
              filter: blur(1.5px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }

          .account-step-enter {
            animation: account-step-enter 560ms cubic-bezier(0.22, 1, 0.36, 1);
            will-change: transform, opacity;
          }

          @keyframes account-step-enter {
            from {
              opacity: 0;
              transform: translateY(22px) scale(0.97);
              filter: blur(2px);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: blur(0);
            }
          }

          @media (max-width: 1023px) {
            .account-step-enter {
              animation: account-step-enter-mobile 360ms cubic-bezier(0.22, 1, 0.36, 1);
            }
          }

          @keyframes account-step-enter-mobile {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .login-spinner-spin {
            animation: login-spinner-rotate 780ms linear infinite;
            transform-origin: center;
          }

          .login-check-icon {
            animation: login-check-pop 260ms cubic-bezier(0.16, 1, 0.3, 1);
          }

          .login-check-orbit {
            stroke-dasharray: 57;
            stroke-dashoffset: 57;
            animation: login-check-orbit 360ms ease-out forwards;
          }

          .login-check-path-1,
          .login-check-path-2 {
            stroke-dasharray: 16;
            stroke-dashoffset: 16;
            animation: login-check-stroke 240ms ease-out forwards;
          }

          .login-check-path-2 {
            animation-delay: 80ms;
          }

          @keyframes login-spinner-rotate {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes login-check-pop {
            from {
              opacity: 0;
              transform: scale(0.78);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes login-check-orbit {
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes login-check-stroke {
            to {
              stroke-dashoffset: 0;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .signout-modal-enter {
              animation: none;
            }

            .account-page-enter {
              animation: none;
            }

            .account-step-enter {
              animation: none;
            }

            .login-spinner-spin,
            .login-check-icon,
            .login-check-orbit,
            .login-check-path-1,
            .login-check-path-2 {
              animation: none;
            }
          }
        `}</style>
      </section>

      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0f172a]/45 px-5 backdrop-blur-[1.5px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-confirm-title"
          onClick={cancelSignOut}
        >
          <div
            className="signout-modal-enter w-full max-w-[430px] rounded-md border border-white/70 bg-white p-6 shadow-[0_28px_65px_-34px_rgba(15,23,42,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="signout-confirm-title" className="text-[24px] font-semibold leading-tight text-[#1A1A1AE6]">
              Sair da conta?
            </h2>

            <p className="mt-2 text-[15px] leading-relaxed text-[#1A1A1AB2]">
              Você vai encerrar sua sessão neste dispositivo. Para voltar, será necessário fazer login novamente.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelSignOut}
                className="h-[44px] rounded-md border border-[#D1D5DB] px-5 text-[15px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmSignOut}
                className="h-[44px] rounded-md bg-gradient-to-r from-blue-500 to-green-600 px-5 text-[15px] font-semibold text-white shadow-[0_10px_18px_-14px_rgba(99,91,255,0.35)] transition-opacity hover:opacity-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
