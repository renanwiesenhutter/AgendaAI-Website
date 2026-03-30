import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type TransparencySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bulletItems?: string[];
};

const transparencySections: TransparencySection[] = [
  {
    id: 'secao-1',
    title: '1. Sobre o uso de IA no Agenda AI',
    paragraphs: [
      'O Agenda AI utiliza recursos de Inteligência Artificial para interpretar mensagens, organizar informações e executar ações relacionadas à agenda do usuário.',
      'Para isso, usamos tecnologia da OpenAI dentro da operação do serviço.',
    ],
  },
  {
    id: 'secao-2',
    title: '2. Modelo da OpenAI utilizado no serviço',
    paragraphs: [
      'O Agenda AI utiliza um modelo da OpenAI treinado e configurado especificamente para o contexto de uso do Agenda AI.',
      'Essa configuração é aplicada para melhorar a interpretação de pedidos de agendamento, reagendamento, cancelamento, consulta e lembretes enviados pelos usuários.',
    ],
  },
  {
    id: 'secao-3',
    title: '3. Finalidade do processamento',
    paragraphs: [
      'Os recursos de IA são utilizados para apoiar funcionalidades do produto e experiência do usuário, incluindo:',
    ],
    bulletItems: [
      'Entendimento de comandos enviados pelos canais oficiais do Agenda AI;',
      'Estruturação de informações de compromissos e lembretes;',
      'Automação de respostas e confirmações relacionadas ao serviço.',
    ],
  },
  {
    id: 'secao-4',
    title: '4. Transparência e responsabilidade',
    paragraphs: [
      'A IA é utilizada como suporte tecnológico e não substitui a validação das informações pelo usuário.',
      'O usuário permanece responsável por revisar dados sensíveis, como data, horário e local dos compromissos.',
      'Esta seção complementa os Termos de Uso e a Política de Privacidade do Agenda AI.',
    ],
  },
];

export default function AITransparency() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7fbff]">
      <header className="bg-[#f7fbff]/95 backdrop-blur border-b border-gray-200 fixed top-0 left-0 right-0 z-50 h-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-85 transition-opacity">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/images/Logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Agenda AI</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 pt-14 sm:pt-14 pb-0">
        <section className="bg-[#f7fbff] rounded-none sm:rounded-3xl border-y sm:border border-gray-200 shadow-[0_18px_50px_-30px_rgba(30,64,175,0.35)] overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 px-6 sm:px-10 py-10 text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-3 py-1 text-sm mb-4">
              <ShieldCheck className="w-4 h-4" />
              Transparencia de IA
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Transparência de IA do Agenda AI</h1>
            <p className="mt-4 text-sm text-blue-100">Última atualização: 29 de março de 2026</p>
          </div>

          <div className="px-6 sm:px-10 py-8 sm:py-10">
            <div className="space-y-7">
              {transparencySections.map((section) => (
                <article
                  id={section.id}
                  key={section.id}
                  className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 scroll-mt-24"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>

                  {section.paragraphs.map((paragraph, index) => {
                    const isLastParagraph = index === section.paragraphs.length - 1;
                    const hasBulletItems = Boolean(section.bulletItems?.length);
                    const spacingClass = isLastParagraph && !hasBulletItems ? 'mb-0' : 'mb-3';

                    return (
                      <p key={`${section.id}-p-${index}`} className={`text-gray-700 leading-relaxed ${spacingClass}`}>
                        {paragraph}
                      </p>
                    );
                  })}

                  {section.bulletItems && section.bulletItems.length > 0 && (
                    <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                      {section.bulletItems.map((item, index) => (
                        <li key={`${section.id}-li-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
