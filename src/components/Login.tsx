import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = React.useState('');
  const [phoneTouched, setPhoneTouched] = React.useState(false);
  const [phoneFocused, setPhoneFocused] = React.useState(false);
  const [phoneSubmitAttempted, setPhoneSubmitAttempted] = React.useState(false);
  const [step, setStep] = React.useState<'phone' | 'confirmation'>('phone');
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [error, setError] = React.useState('');
  const [confirmPhase, setConfirmPhase] = React.useState<'idle' | 'verifying' | 'moving' | 'checking' | 'success'>('idle');
  const [loaderShiftPx, setLoaderShiftPx] = React.useState(150);
  const [assetsReady, setAssetsReady] = React.useState(false);
  const [bootVisible, setBootVisible] = React.useState(true);
  const codeInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const confirmButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const timersRef = React.useRef<number[]>([]);

  const digitsOnly = phone.replace(/\D/g, '');
  const phoneValid = digitsOnly.length >= 10;
  const phoneError =
    !phoneFocused && (phoneTouched || phoneSubmitAttempted) && digitsOnly.length > 0 && !phoneValid
      ? 'Seu telefone está incompleto.'
      : '';
  const phonePreview =
    digitsOnly.length >= 10
      ? `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, digitsOnly.length > 10 ? 7 : 6)}-${digitsOnly.slice(
          digitsOnly.length > 10 ? 7 : 6,
          11
        )}`
      : phone;

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
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current = [];
    };
  }, []);

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

  const queueTimeout = (callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(callback, delay);
    timersRef.current.push(timeoutId);
  };

  const updateLoaderShift = React.useCallback(() => {
    const buttonWidth = confirmButtonRef.current?.offsetWidth;
    if (!buttonWidth) return;

    const distance = Math.max(0, buttonWidth / 2 - 32);
    setLoaderShiftPx(distance);
  }, []);

  React.useEffect(() => {
    if (step !== 'confirmation') return;

    updateLoaderShift();
    window.addEventListener('resize', updateLoaderShift);
    return () => window.removeEventListener('resize', updateLoaderShift);
  }, [step, updateLoaderShift]);

  const startVerification = (currentCode: string[]) => {
    if (confirmPhase !== 'idle') {
      return;
    }

    if (currentCode.some((digit) => !digit)) {
      setError('Código de verificação incorreto.');
      return;
    }

    if (currentCode.join('') !== '123456') {
      setError('Código de verificação incorreto.');
      return;
    }

    updateLoaderShift();
    setError('');
    setConfirmPhase('verifying');

    queueTimeout(() => {
      setConfirmPhase('moving');
    }, 700);

    queueTimeout(() => {
      setConfirmPhase('checking');
    }, 1500);

    queueTimeout(() => {
      setConfirmPhase('success');
    }, 1850);

    queueTimeout(() => {
      navigate('/conta');
    }, 2850);
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let digits = event.target.value.replace(/\D/g, '');
    setPhoneSubmitAttempted(false);

    if (digits.length > 11 && digits.startsWith('55')) {
      digits = digits.slice(2);
    }

    digits = digits.slice(0, 11);

    if (digits.length <= 2) {
      setPhone(digits);
      return;
    }

    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);

    if (digits.length > 10) {
      const part1 = rest.slice(0, 5);
      const part2 = rest.slice(5, 9);
      setPhone(`(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`);
      return;
    }

    const part1 = rest.slice(0, 4);
    const part2 = rest.slice(4, 8);
    setPhone(`(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!phoneValid) {
      setPhoneTouched(true);
      setPhoneSubmitAttempted(true);
      return;
    }

    setError('');
    setCode(['', '', '', '', '', '']);
    setStep('confirmation');
  };

  const handleCodeChange = (value: string, index: number) => {
    const nextValue = value.replace(/\D/g, '').slice(0, 1);
    const nextCode = [...code];
    nextCode[index] = nextValue;
    setCode(nextCode);
    setError('');

    if (nextValue && index < codeInputRefs.current.length - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }

    if (nextCode.every((digit) => digit) && index === 5) {
      startVerification(nextCode);
    }
  };

  const handleCodeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
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
    setError('');

    const focusIndex = Math.min(pastedDigits.length, 5);
    codeInputRefs.current[focusIndex]?.focus();

    if (pastedDigits.length === 6) {
      startVerification(nextCode);
    }
  };

  const handleConfirmSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startVerification(code);
  };

  const isConfirmBusy = confirmPhase !== 'idle';

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
                  className={`mt-5 w-full h-[44px] rounded-md text-white text-[16px] font-medium transition-all ${
                    phoneValid
                      ? 'bg-gradient-to-r from-blue-500 to-green-600 opacity-100 shadow-[0_10px_18px_-14px_rgba(99,91,255,0.35)]'
                      : 'bg-gradient-to-r from-blue-500 to-green-600 opacity-55 shadow-none'
                  }`}
                >
                  Enviar
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
                            disabled={isConfirmBusy}
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
                  className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    maxHeight: error ? '44px' : '0px',
                    opacity: error ? 0.88 : 0,
                    transform: error ? 'translateY(0)' : 'translateY(-10px)',
                    marginTop: error ? '20px' : '0px',
                    marginBottom: error ? '4px' : '0px'
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
                    <p className="text-[14px] text-[#d64b6f]">{error}</p>
                  </div>
                </div>

                <button
                  ref={confirmButtonRef}
                  type="submit"
                  disabled={isConfirmBusy}
                  className={`relative mt-5 w-full h-[44px] rounded-md text-white text-[16px] font-medium disabled:cursor-default bg-[#4c9ffe] ${
                    isConfirmBusy ? 'shadow-none' : 'shadow-[0_10px_18px_-14px_rgba(99,91,255,0.35)]'
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
                          ? 'opacity 4000ms cubic-bezier(0.22, 1, 0.36, 1)'
                          : 'opacity 220ms ease'
                    }}
                  />

                  <span
                    className={`relative z-[1] transition-opacity duration-250 ${confirmPhase === 'idle' ? 'opacity-100' : 'opacity-0'}`}
                  >
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

                  {confirmPhase !== 'idle' && (
                    <span
                      className="pointer-events-none absolute top-1/2 right-[21px] h-[22px] w-[22px] will-change-transform"
                      style={{
                        transform: `translate3d(${confirmPhase === 'verifying' ? '0px' : `-${loaderShiftPx}px`}, -50%, 0)`,
                        transition:
                          confirmPhase === 'moving'
                            ? 'transform 720ms cubic-bezier(0.65, 0, 1, 1)'
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
                          />
                          <path
                            d="M10.3 15.5L16.8 9"
                            stroke="white"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
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
                  onClick={() => {
                    if (isConfirmBusy) return;
                    setError('');
                    setCode(['', '', '', '', '', '']);
                  }}
                  disabled={isConfirmBusy}
                  className="mt-6 w-full text-center text-[16px] text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-60 disabled:cursor-default"
                >
                  Reenviar Código
                </button>
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

          @media (prefers-reduced-motion: reduce) {
            .login-step-enter {
              animation: none;
            }

            .login-step-enter > * {
              animation: none;
            }
          }
        `}</style>
      </section>
    </main>
  );
}
