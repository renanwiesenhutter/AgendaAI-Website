import { CalendarCheck2 } from 'lucide-react';

export default function GoogleConnected() {
  return (
    <main className="relative h-screen overflow-hidden bg-white px-4 sm:px-6">
      <style>{`
        @keyframes google-shrink-out {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          75% { opacity: 1; transform: scale(0.45); filter: blur(0); }
          100% { opacity: 0; transform: scale(0.08); filter: blur(3px); }
        }

        @keyframes connect-flash {
          0% { opacity: 0; transform: scale(0.2); }
          35% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.6); }
        }

        @keyframes agenda-reveal {
          0% { opacity: 0; transform: scale(0.65); filter: blur(3px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        @keyframes title-expand-sides {
          0% {
            opacity: 0;
            clip-path: inset(0 50% 0 50%);
          }
          100% {
            opacity: 1;
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .google-mark { animation: google-shrink-out 0.95s ease-in-out 0.25s both; }
        .connect-flare { animation: connect-flash 0.8s ease-out 1.05s both; }
        .agenda-mark { animation: agenda-reveal 0.85s cubic-bezier(0.2, 0.7, 0.1, 1) 1.25s both; }
        .title-drop { animation: title-expand-sides 0.6s linear 1.25s both; }
        .info-drop { animation: fade-in 0.9s ease-out 1.9s both; }
      `}</style>

      <section className="relative mx-auto h-screen w-full max-w-4xl overflow-hidden">
        <div className="relative h-screen overflow-hidden">
          <div className="absolute left-1/2 top-[12%] z-20 -translate-x-1/2 -translate-y-1/2">
            <div className="google-mark">
              <svg viewBox="0 0 533.5 544.3" aria-hidden="true" className="h-20 w-20 sm:h-24 sm:w-24">
                <path
                  fill="#4285F4"
                  d="M533.5 278.4c0-17.4-1.5-34.1-4.4-50.2H272v95h146.9c-6.3 33.9-25 62.7-53.3 81.9v67h86.1c50.4-46.4 79.8-114.8 79.8-193.7z"
                />
                <path
                  fill="#34A853"
                  d="M272 544.3c72.6 0 133.5-24.1 178-65.2l-86.1-67c-23.9 16-54.5 25.4-91.9 25.4-70.7 0-130.6-47.7-152-111.8h-88.9v70.3C75.1 485.3 166 544.3 272 544.3z"
                />
                <path
                  fill="#FBBC05"
                  d="M120 325.7c-10.8-31.9-10.8-66.3 0-98.2v-70.3h-88.9c-39.2 78.5-39.2 160.3 0 238.8l88.9-70.3z"
                />
                <path
                  fill="#EA4335"
                  d="M272 107.7c39.5-.6 77.4 14.3 106.5 41.8l79.3-79.3C403 24 342.8-1 272 0 166 0 75.1 59 31.1 157.2l88.9 70.3C141.4 155.4 201.3 107.7 272 107.7z"
                />
              </svg>
            </div>
          </div>

          <div className="absolute left-1/2 top-[12%] z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="connect-flare opacity-0">
              <span className="block h-20 w-20 rounded-full border-2 border-blue-300/70" />
            </div>
          </div>

          <div className="absolute left-1/2 top-[12%] z-30 -translate-x-1/2 -translate-y-1/2">
            <div className="agenda-mark opacity-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-green-500 shadow-[0_18px_42px_-20px_rgba(59,130,246,0.9)] sm:h-24 sm:w-24">
                <CalendarCheck2 className="h-10 w-10 text-white sm:h-11 sm:w-11" />
              </div>
            </div>
          </div>

          <div className="title-drop absolute left-1/2 top-[12%] w-[92%] -translate-x-1/2 translate-y-[56px] opacity-0">
            <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
              Agenda Conectada
            </h1>
          </div>

          <p className="info-drop absolute left-1/2 top-[12%] w-[92%] max-w-xl -translate-x-1/2 translate-y-[124px] text-center text-base text-gray-600 opacity-0 sm:text-lg">
            Tudo certo por aqui. Agora e so voltar para o WhatsApp e continuar usando o Agenda AI normalmente.
          </p>

          <a
            href="https://wa.me/554588156868"
            target="_blank"
            rel="noreferrer"
            className="info-drop absolute bottom-12 left-1/2 -translate-x-1/2 text-center text-sm text-gray-500 underline decoration-1 underline-offset-4 opacity-0 transition-colors hover:text-gray-700"
          >
            Abrir agenda
          </a>

        </div>
      </section>
    </main>
  );
}
