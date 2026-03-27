import React from 'react';
import { Mail, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type UserData = {
  name: string;
  email: string;
  whatsapp: string;
};

export default function Conta() {
  const navigate = useNavigate();
  const [isEditingBilling, setIsEditingBilling] = React.useState(false);
  const [user, setUser] = React.useState<UserData>({
    name: 'Renan',
    email: 'email@gmail.com',
    whatsapp: '(45) 99145-3366'
  });

  const [billingName, setBillingName] = React.useState(user.name);
  const [billingEmail, setBillingEmail] = React.useState(user.email);
  const [billingPhone, setBillingPhone] = React.useState('45 99145 3366');

  const handleSignOut = () => {
    navigate('/');
  };

  const handleSaveBilling = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUser((prev) => ({
      ...prev,
      name: billingName.trim() || prev.name,
      email: billingEmail.trim() || prev.email,
      whatsapp: billingPhone.trim() ? `(${billingPhone.slice(0, 2)}) ${billingPhone.slice(3)}` : prev.whatsapp
    }));
    setIsEditingBilling(false);
  };

  return (
    <main className="min-h-[100dvh] flex flex-col lg:flex-row">
      <aside className="w-full lg:w-[42%] bg-gradient-to-r from-blue-500 to-green-600 text-white px-5 lg:px-10 pt-0 pb-0 min-h-[90px] lg:min-h-0 lg:pt-14 lg:pb-10 flex flex-col justify-center lg:justify-between">
        <div className="pl-0 lg:pl-4 flex justify-start lg:block">
          <div className="mb-0 lg:mb-12 flex flex-col items-start">
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-0 mb-2 inline-flex lg:hidden items-center gap-1.5 text-white/90 hover:text-white transition-colors"
              aria-label="Sair"
            >
              <svg viewBox="0 0 16 16" className="h-[12px] w-[12px]" fill="currentColor" aria-hidden="true">
                <path d="M5.994 2.38a.875.875 0 1 0-1.238-1.238l-4.25 4.25A.849.849 0 0 0 .25 6c0 .232.093.466.257.63l4.25 4.24a.875.875 0 1 0 1.236-1.24L3.238 6.875h7.387C12.492 6.875 14 8.271 14 10c0 1.797-1.578 3.375-3.375 3.375a.875.875 0 0 0 0 1.75c2.763 0 5.125-2.362 5.125-5.125 0-2.83-2.43-4.872-5.12-4.875H3.24l2.754-2.746Z" />
              </svg>
              <span className="text-[14px] leading-none">Sair</span>
            </button>

            <div className="mt-1 lg:mt-10 lg:ml-0">
              <Link to="/" className="inline-flex items-center" aria-label="Ir para home">
                <img src="/images/Logomarca.png" alt="Dalzzen" className="h-6 w-auto" />
              </Link>
            </div>
          </div>

          <p className="hidden lg:block max-w-[360px] text-3xl lg:text-[28px] leading-tight font-semibold tracking-tight">
            Bem vindo de volta,<br />{user.name}.
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            className="hidden lg:flex mt-4 items-center gap-1.5 text-white hover:opacity-90 transition-opacity"
            aria-label="Sair"
          >
            <svg viewBox="0 0 16 16" className="h-[12px] w-[12px]" fill="currentColor" aria-hidden="true">
              <path d="M5.994 2.38a.875.875 0 1 0-1.238-1.238l-4.25 4.25A.849.849 0 0 0 .25 6c0 .232.093.466.257.63l4.25 4.24a.875.875 0 1 0 1.236-1.24L3.238 6.875h7.387C12.492 6.875 14 8.271 14 10c0 1.797-1.578 3.375-3.375 3.375a.875.875 0 0 0 0 1.75c2.763 0 5.125-2.362 5.125-5.125 0-2.83-2.43-4.872-5.12-4.875H3.24l2.754-2.746Z" />
            </svg>
            <span className="text-[14px] font-medium leading-none">Sair</span>
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

      <section className="w-full lg:w-[58%] bg-[#f7fbff] lg:bg-white px-6 lg:px-10 py-10 lg:py-16 flex-1 min-h-0 flex flex-col">
        <div className="w-full max-w-[520px] mx-auto lg:mx-0 lg:ml-14 lg:flex-1">
          {!isEditingBilling ? (
            <>
              <h1 className="text-[32px] leading-[1.05] font-semibold text-[#1A1A1AE6] tracking-[-0.02em]">
                Minha conta
              </h1>

              <p className="mt-5 text-[16px] text-[#1A1A1AB2] leading-relaxed">
                Visualize e gerencie as informações da sua assinatura.
              </p>

              <div className="mt-4 bg-transparent">
                <div className="flex items-center gap-3" style={{ paddingTop: '10px', paddingBottom: '4px' }}>
                  <UserRound className="h-5 w-5 text-[#9CA3AF]" />
                  <span className="text-[16px] text-[#1F2937]">{user.name}</span>
                </div>

                <div className="flex items-center gap-3" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
                  <Mail className="h-5 w-5 text-[#9CA3AF]" />
                  <span className="text-[16px] text-[#1F2937]">{user.email}</span>
                </div>

                <div className="flex items-center gap-3" style={{ paddingTop: '4px', paddingBottom: '2px' }}>
                  <div className="w-[20px] h-[16px] flex items-center justify-center">
                    <img
                      src="https://js.stripe.com/v3/fingerprinted/img/FlagIcon-BR-36784f2b8710431a9b536b7224da0eba.svg"
                      alt="Brasil"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[16px] text-[#1F2937]">{user.whatsapp}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingBilling(true)}
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
                  Agenda AI - Anual
                </p>
                <p className="mt-1 text-[24px] font-semibold leading-none text-[#3C4257]">
                  R$ 118,80 por ano
                </p>
                <p className="mt-3 text-[14px] text-[#1a1f36]">
                  Sua próxima data de faturamento é 22 de março de 2027.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.location.href = 'https://billing.stripe.com/p/login/dRm4gy9hC2DGd8cgVA5ZC00';
                }}
                className="mt-10 w-full max-w-[380px] h-[50px] rounded-md border border-[#D1D5DB] bg-white text-[#374151] text-[16px] font-semibold hover:bg-[#F9FAFB] transition-colors"
              >
                Gerenciar Assinatura
              </button>
            </>
          ) : (
            <div className="account-step-enter">
              <div className="text-[14px] text-[#4B5563] flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingBilling(false)}
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
                <input
                  value={billingName}
                  onChange={(event) => setBillingName(event.target.value)}
                  className="w-full h-[48px] rounded-md border border-[#CBD5E1] bg-white px-4 text-[16px] text-[#1F2937] outline-none focus:ring-2 focus:ring-[#4c9ffe]/20 focus:border-[#4c9ffe]"
                />

                <label className="block text-[14px] font-medium text-[#374151] mb-2 mt-7">Email</label>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(event) => setBillingEmail(event.target.value)}
                  className="w-full h-[48px] rounded-md border border-[#CBD5E1] bg-white px-4 text-[16px] text-[#1F2937] outline-none focus:ring-2 focus:ring-[#4c9ffe]/20 focus:border-[#4c9ffe]"
                />

                <label className="block text-[14px] font-medium text-[#374151] mb-2 mt-7">Telefone</label>
                <div className="h-[48px] rounded-md border border-[#CBD5E1] bg-white px-4 flex items-center gap-3">
                  <span className="text-[#475569] font-medium">BR</span>
                  <span className="text-[#94A3B8]">+55</span>
                  <input
                    value={billingPhone}
                    onChange={(event) => setBillingPhone(event.target.value)}
                    className="flex-1 bg-transparent text-[16px] text-[#1F2937] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-10 w-full h-[48px] rounded-md bg-gradient-to-r from-blue-500 to-green-600 text-white text-[16px] font-semibold shadow-[0_10px_18px_-14px_rgba(99,91,255,0.35)] hover:opacity-95 transition-opacity"
                >
                  Salvar
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingBilling(false)}
                  className="mt-4 w-full h-[48px] rounded-md border border-[#D1D5DB] text-[#374151] text-[16px] font-semibold hover:bg-[#F9FAFB] transition-colors"
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

          @media (prefers-reduced-motion: reduce) {
            .account-step-enter {
              animation: none;
            }
          }
        `}</style>
      </section>
    </main>
  );
}
