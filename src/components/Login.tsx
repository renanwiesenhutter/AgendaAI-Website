import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

type AuthApiResponse = {
  success?: boolean;
  authorized?: boolean;
  token?: string;
  message?: string;
  error?: string;
  attemptsRemaining?: number;
  blockedUntil?: string | number | null;
  codeExpired?: boolean;
  retryAfterSeconds?: number;
};

const SEND_CODE_ENDPOINT = 'https://n8n.dalzzen.com/webhook/auth/send-code';
const VERIFY_CODE_ENDPOINT = 'https://n8n.dalzzen.com/webhook/auth/verify-code';
const AUTH_PHONE_KEY = 'agendaai_auth_phone';
const TOKEN_KEY = 'agendaai_token';
const ACCOUNT_PHONE_KEY = 'agendaai_user_phone';

const getDigits = (value: string) => value.replace(/\D/g, '');

const formatPhone = (value: string) => {
  const digits = getDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return digits;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length > 10) {
    const part1 = rest.slice(0, 5);
    const part2 = rest.slice(5, 9);
    return `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`;
  }

  const part1 = rest.slice(0, 4);
  const part2 = rest.slice(4, 8);
  return `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`;
};

const parseBlockedUntil = (value: AuthApiResponse['blockedUntil']) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue > 1_000_000_000_000 ? numericValue : numericValue * 1000;
    }

    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }
  }

  return null;
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getApiMessage = (payload: AuthApiResponse | null, fallback: string) => {
  if (payload?.message && payload.message.trim()) return payload.message;
  if (payload?.error && payload.error.trim()) return payload.error;
  return fallback;
};

async function postAuth(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  let payload: AuthApiResponse | null = null;
  try {
    payload = (await response.json()) as AuthApiResponse;
  } catch {
    payload = null;
  }

  return { response, payload };
}

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = React.useState('');
  const [phoneTouched, setPhoneTouched] = React.useState(false);
  const [phoneFocused, setPhoneFocused] = React.useState(false);
  const [phoneSubmitAttempted, setPhoneSubmitAttempted] = React.useState(false);
  const [phoneApiError, setPhoneApiError] = React.useState('');
  const [step, setStep] = React.useState<'phone' | 'confirmation'>('phone');
  const [authPhone, setAuthPhone] = React.useState('');
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [codeError, setCodeError] = React.useState('');
  const [codeExpired, setCodeExpired] = React.useState(false);
  const [confirmPhase, setConfirmPhase] = React.useState<'idle' | 'verifying' | 'moving' | 'checking' | 'success'>('idle');
  const [loaderShiftPx, setLoaderShiftPx] = React.useState(150);
  const [blockedUntilMs, setBlockedUntilMs] = React.useState<number | null>(null);
  const [blockedSecondsLeft, setBlockedSecondsLeft] = React.useState(0);
  const [resendCooldownSeconds, setResendCooldownSeconds] = React.useState(0);
  const [sendingCode, setSendingCode] = React.useState(false);
  const [verifyingCode, setVerifyingCode] = React.useState(false);
  const [resendingCode, setResendingCode] = React.useState(false);
  const [assetsReady, setAssetsReady] = React.useState(false);
  const [bootVisible, setBootVisible] = React.useState(true);
  const codeInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const confirmButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const timersRef = React.useRef<number[]>([]);

  const digitsOnly = getDigits(phone);
  const phoneValid = digitsOnly.length >= 10;
  const phoneValidationError =
    !phoneFocused && (phoneTouched || phoneSubmitAttempted) && digitsOnly.length > 0 && !phoneValid
      ? 'Seu telefone está incompleto.'
      : '';
  const phoneError = phoneApiError || phoneValidationError;
  const phonePreview = formatPhone(authPhone || digitsOnly);

  const blockActive = blockedSecondsLeft > 0;
  const resendBlockedByCooldown = resendCooldownSeconds > 0;
  const phoneSubmitDisabled = sendingCode || !phoneValid;
  const confirmSubmitDisabled = verifyingCode || resendingCode || blockActive;
  const resendDisabled = verifyingCode || resendingCode || blockActive || resendBlockedByCooldown;
  const isConfirmAnimating = confirmPhase !== 'idle';

  const clearQueuedTimers = React.useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  const queueTimeout = React.useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(callback, delay);
    timersRef.current.push(timeoutId);
  }, []);

  const updateLoaderShift = React.useCallback(() => {
    const buttonWidth = confirmButtonRef.current?.offsetWidth;
    if (!buttonWidth) return;
    const distance = Math.max(0, buttonWidth / 2 - 32);
    setLoaderShiftPx(distance);
  }, []);

  React.useEffect(() => {
    if (step !== 'confirmation') return;

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!isDesktop) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const focusDelay = prefersReducedMotion ? 0 : 640;
    const timeoutId = window.setTimeout(() => {
      codeInputRefs.current[0]?.focus();
    }, focusDelay);

    return () => window.clearTimeout(timeoutId);
  }, [step]);

  React.useEffect(() => {
    const existingToken = localStorage.getItem(TOKEN_KEY);
    if (existingToken) {
      navigate('/conta', { replace: true });
    }
  }, [navigate]);

  React.useEffect(() => {
    const persistedPhone = localStorage.getItem(AUTH_PHONE_KEY) ?? '';
    const persistedDigits = getDigits(persistedPhone).slice(0, 11);
    if (persistedDigits.length >= 10) {
      setAuthPhone(persistedDigits);
      setPhone(formatPhone(persistedDigits));
      setStep('confirmation');
    }
  }, []);

  React.useEffect(() => {
    return () => {
      clearQueuedTimers();
    };
  }, [clearQueuedTimers]);

  React.useEffect(() => {
    let cancelled = false;

    const waitForImage = (src: string) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        const finish = () => resolve();
        image.onload = finish;
        image.onerror = finish;
        image.src = src;
        if (image.complete) {
          resolve();
        }
      });

    Promise.all([waitForImage('/images/Logomarca.png')]).then(() => {
      if (!cancelled) {
        setAssetsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!assetsReady) return;
    const timeoutId = window.setTimeout(() => setBootVisible(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [assetsReady]);

  React.useEffect(() => {
    if (!blockedUntilMs) {
      setBlockedSecondsLeft(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((blockedUntilMs - Date.now()) / 1000));
      setBlockedSecondsLeft(remaining);
    };

    updateRemaining();
    if (blockedUntilMs <= Date.now()) return;

    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [blockedUntilMs]);

  React.useEffect(() => {
    if (resendCooldownSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setResendCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [resendCooldownSeconds]);

  React.useEffect(() => {
    if (step !== 'confirmation') return;
    updateLoaderShift();
    window.addEventListener('resize', updateLoaderShift);
    return () => window.removeEventListener('resize', updateLoaderShift);
  }, [step, updateLoaderShift]);

  const applyAuthHints = React.useCallback((payload: AuthApiResponse | null) => {
    if (!payload) return;

    const nextBlockedUntil = parseBlockedUntil(payload.blockedUntil);
    if (nextBlockedUntil) {
      setBlockedUntilMs(nextBlockedUntil);
    } else if ('blockedUntil' in payload && !payload.blockedUntil) {
      setBlockedUntilMs(null);
    }

    if (typeof payload.retryAfterSeconds === 'number') {
      setResendCooldownSeconds(Math.max(0, Math.ceil(payload.retryAfterSeconds)));
    }

    if (typeof payload.codeExpired === 'boolean') {
      setCodeExpired(payload.codeExpired);
    }
  }, []);

  const sendCodeRequest = React.useCallback(
    async (phoneNumber: string, fromResend: boolean) => {
      if (fromResend) {
        setResendingCode(true);
      } else {
        setSendingCode(true);
      }

      setPhoneApiError('');
      setCodeError('');

      try {
        const { response, payload } = await postAuth(SEND_CODE_ENDPOINT, { phone: phoneNumber });
        applyAuthHints(payload);

        if (response.ok && payload?.success) {
          localStorage.setItem(AUTH_PHONE_KEY, phoneNumber);
          setAuthPhone(phoneNumber);
          setStep('confirmation');
          setCodeExpired(false);
          setCode(['', '', '', '', '', '']);

          return;
        }

        const message = getApiMessage(payload, 'Não foi possível enviar o código agora. Tente novamente.');
        if (fromResend || step === 'confirmation') {
          setCodeError(message);
        } else {
          setPhoneApiError(message);
        }
      } catch {
        const message = 'Erro de conexão. Verifique sua internet e tente novamente.';
        if (fromResend || step === 'confirmation') {
          setCodeError(message);
        } else {
          setPhoneApiError(message);
        }
      } finally {
        if (fromResend) {
          setResendingCode(false);
        } else {
          setSendingCode(false);
        }
      }
    },
    [applyAuthHints, step]
  );

  const startVerification = React.useCallback(
    async (currentCode: string[]) => {
      if (verifyingCode || resendingCode) return;

      if (blockActive) {
        setCodeError(`Muitas tentativas. Tente novamente em ${formatDuration(blockedSecondsLeft)}.`);
        return;
      }

      if (currentCode.some((digit) => !digit)) {
        setCodeError('Digite os 6 dígitos para continuar.');
        return;
      }

      if (!authPhone) {
        setCodeError('Número não encontrado. Volte e solicite um novo código.');
        return;
      }

      setVerifyingCode(true);
      clearQueuedTimers();
      setConfirmPhase('verifying');
      setCodeError('');
      const verificationStartedAt = performance.now();

      let verificationSucceeded = false;

      try {
        const { response, payload } = await postAuth(VERIFY_CODE_ENDPOINT, {
          phone: authPhone,
          code: currentCode.join('')
        });

        applyAuthHints(payload);

        if (response.ok && payload?.success && payload.authorized && payload.token) {
          verificationSucceeded = true;
          localStorage.setItem(TOKEN_KEY, payload.token);
          localStorage.setItem(ACCOUNT_PHONE_KEY, authPhone);
          localStorage.removeItem(AUTH_PHONE_KEY);

          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const elapsedSinceVerifying = performance.now() - verificationStartedAt;
          const minimumVerifyingMs = prefersReducedMotion ? 280 : 900;
          const remainingVerifyingMs = Math.max(0, minimumVerifyingMs - elapsedSinceVerifying);

          if (remainingVerifyingMs > 0) {
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, remainingVerifyingMs);
            });
          }

          if (prefersReducedMotion) {
            setConfirmPhase('success');
            queueTimeout(() => {
              navigate('/conta');
            }, 1080);
            return;
          }

          setConfirmPhase('moving');
          queueTimeout(() => setConfirmPhase('checking'), 900);
          queueTimeout(() => setConfirmPhase('success'), 1500);
          queueTimeout(() => {
            navigate('/conta');
          }, 2500);
          return;
        }

        const message = getApiMessage(payload, 'Código inválido. Revise e tente novamente.');
        setCodeError(message);
      } catch {
        setCodeError('Erro de conexão. Verifique sua internet e tente novamente.');
      } finally {
        if (!verificationSucceeded) {
          setVerifyingCode(false);
          setConfirmPhase('idle');
        }
      }
    },
    [
      applyAuthHints,
      authPhone,
      blockActive,
      blockedSecondsLeft,
      clearQueuedTimers,
      navigate,
      queueTimeout,
      resendingCode,
      verifyingCode
    ]
  );

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let digits = getDigits(event.target.value);
    setPhoneSubmitAttempted(false);
    setPhoneApiError('');

    if (digits.length > 11 && digits.startsWith('55')) {
      digits = digits.slice(2);
    }

    digits = digits.slice(0, 11);
    setPhone(formatPhone(digits));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!phoneValid) {
      setPhoneTouched(true);
      setPhoneSubmitAttempted(true);
      return;
    }

    await sendCodeRequest(digitsOnly, false);
  };

  const handleCodeChange = (value: string, index: number) => {
    const nextValue = value.replace(/\D/g, '').slice(0, 1);
    const nextCode = [...code];
    nextCode[index] = nextValue;
    setCode(nextCode);
    setCodeError('');

    if (nextValue && index < codeInputRefs.current.length - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }

    if (nextCode.every((digit) => digit) && index === 5) {
      void startVerification(nextCode);
    }
  };

  const handleCodeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      codeInputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowRight' && index < codeInputRefs.current.length - 1) {
      event.preventDefault();
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (!pastedDigits) {
      return;
    }

    const nextCode = ['', '', '', '', '', ''];
    pastedDigits.split('').forEach((digit, index) => {
      nextCode[index] = digit;
    });

    setCode(nextCode);
    setCodeError('');

    const focusIndex = Math.min(pastedDigits.length, 5);
    codeInputRefs.current[focusIndex]?.focus();

    if (pastedDigits.length === 6) {
      void startVerification(nextCode);
    }
  };

  const handleConfirmSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await startVerification(code);
  };

  const handleGoBack = React.useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  }, [navigate]);

  if (bootVisible) {
    return (
      <main className="min-h-[100dvh] bg-[#f2f2f4] px-6 py-8">
        <div className="mx-auto mt-[22dvh] w-full max-w-[720px]">
          <div className="login-skeleton-shimmer h-7 w-40 rounded-full bg-[#e6e6e8]" />
          <div className="login-skeleton-shimmer mt-5 h-10 w-[86%] rounded-2xl bg-[#e6e6e8]" />
          <div className="login-skeleton-shimmer mt-3 h-10 w-[72%] rounded-2xl bg-[#e6e6e8]" />

          <div className="mt-24 space-y-4">
            <div className="login-skeleton-shimmer h-14 w-full rounded-xl bg-[#e6e6e8]" />
            <div className="login-skeleton-shimmer h-14 w-full rounded-xl bg-[#e6e6e8]" />
            <div className="login-skeleton-shimmer mx-auto h-10 w-[62%] rounded-full bg-[#e6e6e8]" />
          </div>
        </div>

        <style>{`
          .login-skeleton-shimmer {
            position: relative;
            overflow: hidden;
          }

          .login-skeleton-shimmer::after {
            content: '';
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 48%, rgba(255,255,255,0) 100%);
            animation: login-skeleton-wave 1.2s ease-in-out infinite;
          }

          @keyframes login-skeleton-wave {
            to {
              transform: translateX(100%);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .login-skeleton-shimmer::after {
              animation: none;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] flex flex-col lg:flex-row">
      <aside className="w-full lg:w-[42%] bg-gradient-to-r from-blue-500 to-green-600 text-white px-5 lg:px-10 pt-0 pb-0 min-h-[80px] lg:min-h-0 lg:pt-14 lg:pb-10 flex flex-col justify-center lg:justify-between">
        <div className="pl-0 lg:pl-4 flex justify-start lg:block">
          <div className="mb-0 lg:mb-12">
            <div className="group relative inline-flex items-center ml-2 lg:ml-0">
              <button
                type="button"
                onClick={handleGoBack}
                className="absolute -left-4 lg:-left-5 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/85 transition-all duration-300 ease-out lg:group-hover:-translate-x-[2px] lg:group-hover:text-white lg:group-focus-within:-translate-x-[2px] lg:group-focus-within:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
                aria-label="Voltar"
              >
                <svg viewBox="0 0 16 16" className="h-[12px] w-[12px]" fill="currentColor" aria-hidden="true">
                  <path
                    d="M3.417 7H15a1 1 0 0 1 0 2H3.417l4.591 4.591a1 1 0 0 1-1.415 1.416l-6.3-6.3a1 1 0 0 1 0-1.414l6.3-6.3A1 1 0 0 1 8.008 2.41z"
                    fillRule="evenodd"
                  />
                </svg>
              </button>

              <Link to="/" className="relative ml-1 inline-flex h-6 items-center lg:min-w-[84px]" aria-label="Ir para home">
                <img
                  src="/images/Logomarca.png"
                  alt="Dalzzen"
                  className="h-6 w-auto ml-3 transition-all duration-300 ease-out lg:group-hover:-translate-x-[4px] lg:group-hover:opacity-0 lg:group-focus-within:-translate-x-[4px] lg:group-focus-within:opacity-0"
                />
                <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 translate-x-[10px] whitespace-nowrap text-[24px] font-semibold leading-none text-white opacity-0 transition-all duration-300 ease-out lg:group-hover:translate-x-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-x-0 lg:group-focus-within:opacity-100">
                  Voltar
                </span>
              </Link>
            </div>
          </div>

          <p className="hidden lg:block max-w-[360px] text-3xl lg:text-[28px] leading-tight font-semibold tracking-tight">
            Acesse sua conta Agenda AI<br />com segurança.
          </p>
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
            <Link to="/transparencia-ia" className="hover:text-white transition-colors">Transparência IA</Link>
          </div>
        </div>
      </aside>

      <section className="w-full lg:w-[58%] bg-[#f7fbff] lg:bg-white px-6 lg:px-10 py-10 lg:py-16 flex-1 min-h-0 flex flex-col">
        <div className="w-full max-w-[430px] mx-auto lg:mx-0 lg:ml-14 lg:flex-1 min-h-[430px]">
          {step === 'phone' ? (
            <div key="phone" className="login-step-enter">
              <h1 className="text-[32px] leading-[1.05] font-semibold text-[#1A1A1AE6] tracking-[-0.02em]">
                Faça login para gerenciar sua conta
              </h1>

              <p className="mt-5 text-[16px] text-[#1A1A1AB2] leading-relaxed">
                Insira seu número de celular para enviarmos um código de acesso ao portal do cliente.
              </p>

              <form className="mt-5" onSubmit={handleSubmit}>
                <p className="block text-[14px] font-medium text-[#1A1A1AB2] mb-2">
                  Celular
                </p>

                <div
                  className={`h-[50px] rounded-md border bg-white px-3 flex items-center transition ${
                    phoneError
                      ? 'border-red-300 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-200/70'
                      : 'border-gray-300 focus-within:border-[#4c9ffe] focus-within:ring-2 focus-within:ring-[#4c9ffe]/20'
                  }`}
                >
                  <div className="w-[20px] h-[16px] flex items-center justify-center">
                    <img
                      src="https://js.stripe.com/v3/fingerprinted/img/FlagIcon-BR-36784f2b8710431a9b536b7224da0eba.svg"
                      alt="Brasil"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => {
                      setPhoneFocused(false);
                      setPhoneTouched(true);
                    }}
                    className={`w-full ml-2 bg-transparent text-[16px] outline-none placeholder:text-gray-400 ${
                      phoneError ? 'text-red-700 caret-red-600' : 'text-gray-900 caret-blue-600'
                    }`}
                    aria-label="Celular"
                    aria-invalid={!!phoneError}
                    aria-describedby={phoneError ? 'phone-error' : undefined}
                    required
                  />
                </div>

                <div
                  className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      maxHeight: phoneError ? '44px' : '0px',
                      opacity: phoneError ? 0.88 : 0,
                      transform: phoneError ? 'translateY(0)' : 'translateY(-10px)',
                      marginTop: phoneError ? '12px' : '0px',
                      marginBottom: phoneError ? '8px' : '0px'
                    }}
                    aria-live="polite"
                  >
                  <div className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4 text-[#d64b6f]"
                      aria-hidden="true"
                    >
                      <path d="M12 8.25V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                      <path
                        d="M12 3.75L21 19.5H3L12 3.75Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p id="phone-error" className="text-[14px] text-[#d64b6f]">{phoneError}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={phoneSubmitDisabled}
                  className={`mt-5 w-full h-[44px] rounded-md text-white text-[16px] font-medium transition-all ${
                    phoneValid && !sendingCode
                      ? 'bg-gradient-to-r from-blue-500 to-green-600 opacity-100 shadow-[0_10px_18px_-14px_rgba(99,91,255,0.35)]'
                      : 'bg-gradient-to-r from-blue-500 to-green-600 opacity-55 shadow-none'
                  }`}
                >
                  {sendingCode ? 'Enviando...' : 'Enviar'}
                </button>

                <div className="mt-4 text-center">
                  <Link
                    to="/checkout?plan=annual"
                    className="text-[14px] text-blue-600 transition-colors hover:text-blue-700"
                  >
                    Ainda não tenho o Agenda AI
                  </Link>
                </div>
              </form>
            </div>
          ) : (
            <div key="confirmation" className="login-step-enter">
              <h1 className="text-[32px] leading-[1.05] font-semibold text-[#1A1A1AE6] tracking-[-0.02em] text-left lg:text-center">
                Confirme seu acesso
              </h1>

              <p className="mt-5 text-[16px] text-[#1A1A1AB2] leading-relaxed max-w-[390px] text-left lg:text-center lg:mx-auto">
                Digite o código de 6 dígitos que enviamos para<br/><span className="font-medium text-[#1A1A1AE6]">{phonePreview}</span>.
              </p>

              <form className="mt-8" onSubmit={handleConfirmSubmit}>
                <div className="w-full flex items-center justify-center">
                  <div className="flex items-center">
                    {code.map((digit, index) => {
                      const isFirstInGroup = index % 3 === 0;
                      const isLastInGroup = index % 3 === 2;

                      return (
                        <React.Fragment key={index}>
                          <input
                            ref={(element) => {
                              codeInputRefs.current[index] = element;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={1}
                            value={digit}
                            onChange={(event) => handleCodeChange(event.target.value, index)}
                            onKeyDown={(event) => handleCodeKeyDown(event, index)}
                            onPaste={handleCodePaste}
                            disabled={verifyingCode || resendingCode || blockActive}
                            className={`relative h-[52px] w-[44px] border border-gray-300 bg-white text-center text-[24px] font-medium text-gray-900 outline-none transition focus:z-10 focus:border-[#4c9ffe] focus:ring-2 focus:ring-[#4c9ffe]/20 ${
                              isFirstInGroup ? 'rounded-l-md' : isLastInGroup ? 'rounded-r-md -ml-px' : 'rounded-none -ml-px'
                            }`}
                          />
                          {index === 2 && <span className="mx-4 text-gray-400 text-[24px] leading-none">-</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    maxHeight: codeError ? '24px' : '0px',
                    opacity: codeError ? 0.9 : 0,
                    transform: codeError ? 'translateY(0)' : 'translateY(-6px)',
                    marginTop: codeError ? '6px' : '0px',
                    marginBottom: codeError ? '2px' : '0px'
                  }}
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4 text-[#d64b6f]"
                      aria-hidden="true"
                    >
                      <path d="M12 8.25V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                      <path
                        d="M12 3.75L21 19.5H3L12 3.75Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-[14px] text-[#d64b6f]">{codeError}</p>
                  </div>
                </div>

                <div className="mt-3 min-h-[24px] text-center" aria-live="polite">
                  {blockActive && (
                    <p className="text-[14px] text-[#d64b6f]">
                      Temporariamente bloqueado. Tente novamente em {formatDuration(blockedSecondsLeft)}.
                    </p>
                  )}
                </div>

                <button
                  ref={confirmButtonRef}
                  type="submit"
                  disabled={confirmSubmitDisabled}
                  className={`relative mt-5 w-full h-[44px] rounded-md text-white text-[16px] font-medium bg-[#4c9ffe] disabled:cursor-default ${
                    confirmSubmitDisabled && !isConfirmAnimating ? 'opacity-70' : 'opacity-100'
                  } ${
                    verifyingCode ? 'shadow-none' : 'shadow-[0_10px_18px_-14px_rgba(99,91,255,0.35)]'
                  }`}
                  style={{
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 rounded-md bg-[#1ea56f] will-change-[opacity]"
                    style={{
                      opacity: confirmPhase === 'moving' || confirmPhase === 'checking' || confirmPhase === 'success' ? 1 : 0,
                      transition:
                        confirmPhase === 'moving' || confirmPhase === 'checking' || confirmPhase === 'success'
                          ? 'opacity 760ms cubic-bezier(0.22, 1, 0.36, 1)'
                          : 'opacity 220ms ease'
                    }}
                  />

                  <span className={`relative z-[1] transition-opacity duration-250 ${isConfirmAnimating ? 'opacity-0' : 'opacity-100'}`}>
                    Continuar
                  </span>

                  <span
                    className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-white text-[16px] font-medium transition-all duration-300"
                    style={{
                      opacity: confirmPhase === 'verifying' ? 1 : 0,
                      transform:
                        confirmPhase === 'verifying'
                          ? 'translate3d(0,0,0)'
                          : confirmPhase === 'moving' || confirmPhase === 'checking' || confirmPhase === 'success'
                            ? 'translate3d(-8px,0,0)'
                            : 'translate3d(10px,0,0)'
                    }}
                  >
                    Validando...
                  </span>

                  {isConfirmAnimating && (
                    <span
                      className="pointer-events-none absolute top-1/2 right-[21px] h-[22px] w-[22px] will-change-transform"
                      style={{
                        transform: `translate3d(${confirmPhase === 'verifying' ? '0px' : `-${loaderShiftPx}px`}, -50%, 0)`,
                        transition:
                          confirmPhase === 'moving'
                            ? 'transform 980ms cubic-bezier(0.65, 0, 1, 1)'
                            : 'transform 180ms ease'
                      }}
                    >
                      {confirmPhase === 'checking' || confirmPhase === 'success' ? (
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
                  onClick={async () => {
                    if (resendDisabled || !authPhone) return;
                    setCode(['', '', '', '', '', '']);
                    await sendCodeRequest(authPhone, true);
                  }}
                  disabled={resendDisabled || !authPhone}
                  className={`mt-6 w-full text-center text-[16px] transition-colors disabled:opacity-60 disabled:cursor-default ${
                    codeExpired ? 'text-[#d64b6f] font-semibold hover:text-[#c0385f]' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {resendingCode
                    ? 'Reenviando...'
                    : resendBlockedByCooldown
                      ? `Reenviar código em ${formatDuration(resendCooldownSeconds)}`
                      : 'Reenviar Código'}
                </button>

                {codeExpired && (
                  <p className="mt-2 text-center text-[14px] text-[#d64b6f]" aria-live="polite">
                    O código expirou. Solicite um novo código para continuar.
                  </p>
                )}
              </form>
            </div>
          )}

        </div>

        <div className="lg:hidden mt-16 pb-2 text-center text-xs text-gray-400 space-y-2">
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
            <span className="w-px h-4 bg-gray-300" aria-hidden="true"></span>
            <Link to="/transparencia-ia" className="hover:underline">IA</Link>
          </div>
        </div>

        <style>{`
          .login-step-enter {
            animation: login-step-enter 560ms cubic-bezier(0.22, 1, 0.36, 1);
            will-change: transform, opacity;
          }

          .login-step-enter > * {
            animation: login-step-content 620ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          @keyframes login-step-enter {
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

          @keyframes login-step-content {
            from {
              opacity: 0;
              transform: translateY(10px);
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
            .login-step-enter {
              animation: none;
            }

            .login-step-enter > * {
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
    </main>
  );
}
