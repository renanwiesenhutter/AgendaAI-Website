import { Calendar, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const keyPoints = [
  'O Agenda AI é uma plataforma de tecnologia para organização de compromissos e lembretes com apoio de inteligência artificial.',
  'O uso da plataforma depende da aceitação destes Termos e da Política de Privacidade.',
  'A assinatura pode ter renovação automática, conforme plano contratado, até o cancelamento solicitado pelo titular.',
  'Serviços de terceiros (como WhatsApp, Google Calendar e gateways de pagamento) podem influenciar disponibilidade e funcionalidades.',
  'Em situações críticas, o usuário deve validar informações antes de tomar decisões relevantes.',
];

const summaryItems = [
  '1. Data de disponibilização do texto',
  '2. Definições e termos técnicos',
  '3. Serviços e funcionamento da plataforma',
  '4. Cadastro e elegibilidade dos usuários',
  '5. Planos, cobrança e renovação automática',
  '6. Cancelamento, direito de arrependimento e reembolso',
  '7. Responsabilidades da plataforma',
  '8. Responsabilidades do usuário',
  '9. Isenções e limitações de responsabilidade',
  '10. Regras de conduta e proibições',
  '11. Propriedade intelectual',
  '12. Dados pessoais, privacidade e segurança',
  '13. Suspensão, bloqueio e encerramento de conta',
  '14. Alterações destes Termos',
  '15. Lei aplicável, foro e canais de contato',
];

const sections: TermsSection[] = [
  {
    id: 'secao-1',
    title: '1. Data de disponibilização do texto',
    paragraphs: ['Esta versão dos Termos e Condições de Uso foi disponibilizada em 06/02/2026.'],
  },
  {
    id: 'secao-2',
    title: '2. Definições e termos técnicos',
    paragraphs: [
      'Para facilitar a interpretação deste documento, os termos abaixo são utilizados com os seguintes significados: Plataforma (Agenda AI), Usuário (pessoa física ou jurídica que utiliza o serviço), Conta (credenciais de acesso), Integrações (serviços de terceiros conectados à Plataforma) e Conteúdo (informações enviadas pelo Usuário).',
      'Sempre que houver referência a “nós”, “nosso” ou “Agenda AI”, entende-se a equipe responsável pela operação da plataforma. Sempre que houver referência a “você” ou “Usuário”, entende-se o titular da conta e/ou responsável legal.',
    ],
  },
  {
    id: 'secao-3',
    title: '3. Serviços e funcionamento da plataforma',
    paragraphs: [
      'O Agenda AI oferece recursos para criação, edição, organização e lembretes de compromissos por meios digitais, incluindo interação por mensagens e automações com inteligência artificial.',
      'A plataforma pode aceitar entradas em formatos como texto, áudio e outros suportados tecnicamente no momento do uso, podendo interpretar e estruturar essas informações em eventos e lembretes.',
      'O serviço possui natureza tecnológica e de produtividade. Ele não substitui serviços profissionais especializados, não presta consultoria individual obrigatória e não deve ser tratado como ferramenta única para decisões críticas.',
    ],
    bullets: [
      '3.1. Funcionalidades podem ser alteradas, aprimoradas ou descontinuadas conforme evolução do produto.',
      '3.2. Integrações externas podem apresentar limitações técnicas, atrasos, falhas ou indisponibilidade.',
      '3.3. A interpretação por IA pode conter imprecisões e requer validação do usuário quando necessário.',
    ],
  },
  {
    id: 'secao-4',
    title: '4. Cadastro e elegibilidade dos usuários',
    paragraphs: [
      'Para utilizar recursos do Agenda AI, você poderá precisar criar conta e fornecer dados de identificação e contato corretos, completos e atualizados.',
      'Você declara possuir capacidade legal para contratar o serviço ou estar devidamente representado por responsável legal, quando aplicável.',
    ],
    bullets: [
      '4.1. O usuário é responsável pela guarda de senhas, aparelhos e canais de autenticação.',
      '4.2. É vedado compartilhar credenciais com terceiros sem controle de segurança.',
      '4.3. Qualquer uso realizado na conta será presumido como de responsabilidade do titular, até comunicação de incidente ao suporte.',
    ],
  },
  {
    id: 'secao-5',
    title: '5. Planos, cobrança e renovação automática',
    paragraphs: [
      'O acesso aos recursos pagos do Agenda AI depende de assinatura ativa. Valores, periodicidade, condições promocionais e meios de pagamento são exibidos no checkout ou página oficial de planos.',
      'Ao contratar um plano recorrente, você autoriza cobranças periódicas conforme o ciclo selecionado, inclusive por parceiros de pagamento independentes.',
      'A ausência de pagamento, recusa da operadora, expiração do meio de pagamento ou suspeita de fraude pode impedir a ativação, renovação ou continuidade da assinatura.',
    ],
    bullets: [
      '5.1. Assinaturas podem ser mensais, anuais ou em outro formato informado no momento da contratação.',
      '5.2. Preços e condições futuras podem ser alterados para novos ciclos, com comunicação prévia quando exigida por lei.',
      '5.3. O Agenda AI não armazena integralmente dados sensíveis de cartão quando processados por gateways especializados.',
    ],
  },
  {
    id: 'secao-6',
    title: '6. Cancelamento, direito de arrependimento e reembolso',
    paragraphs: [
      'O titular pode solicitar cancelamento da renovação automática a qualquer momento pelos canais e interfaces disponibilizados. O cancelamento interrompe renovações futuras e, em regra, mantém o acesso até o fim do ciclo já pago.',
      'Quando houver direito de arrependimento legal (incluindo hipóteses do Código de Defesa do Consumidor), o pedido deverá ser feito no prazo legal aplicável, observadas as regras do canal de contratação.',
      'Assinaturas contratadas por lojas de aplicativos ou parceiros externos podem seguir políticas próprias de estorno e cancelamento, sob responsabilidade operacional da respectiva plataforma de pagamento.',
    ],
  },
  {
    id: 'secao-7',
    title: '7. Responsabilidades da plataforma',
    paragraphs: [
      'O Agenda AI envida esforços razoáveis para manter ambiente estável, seguro e funcional, além de promover melhorias contínuas, correções e suporte compatíveis com a natureza do serviço.',
      'Também buscamos comunicar mudanças relevantes de forma clara nos canais oficiais, especialmente quando impactarem cobrança, privacidade, funcionalidades essenciais ou regras de uso.',
    ],
  },
  {
    id: 'secao-8',
    title: '8. Responsabilidades do usuário',
    paragraphs: ['Ao utilizar o serviço, você concorda em agir com boa-fé, observar a legislação aplicável e respeitar estes Termos.'],
    bullets: [
      '8.1. Fornecer informações verdadeiras, completas e atualizadas.',
      '8.2. Revisar e confirmar compromissos importantes antes de agir com base em automações.',
      '8.3. Manter seu ambiente digital seguro (sistema, navegador, antivírus e rede).',
      '8.4. Utilizar a plataforma apenas para finalidades lícitas e legítimas.',
      '8.5. Não atribuir ao Agenda AI responsabilidades por dados incorretos inseridos pelo próprio usuário.',
    ],
  },
  {
    id: 'secao-9',
    title: '9. Isenções e limitações de responsabilidade',
    paragraphs: [
      'Dentro dos limites legais, o Agenda AI não se responsabiliza por prejuízos decorrentes de uso indevido da conta, indisponibilidade de terceiros, falhas de conexão, eventos de força maior, ou decisões tomadas sem validação adequada das informações.',
      'A plataforma também não garante resultado específico de produtividade, ganho financeiro, cumprimento de metas pessoais ou eliminação completa de esquecimentos, pois esses resultados dependem de múltiplos fatores externos e conduta do usuário.',
    ],
    bullets: [
      '9.1. Não há garantia de disponibilidade ininterrupta do serviço.',
      '9.2. Integrações de terceiros podem falhar parcial ou integralmente.',
      '9.3. Limitações técnicas de IA podem gerar interpretações incompletas.',
      '9.4. Danos indiretos e lucros cessantes poderão ser limitados conforme a legislação aplicável.',
    ],
  },
  {
    id: 'secao-10',
    title: '10. Regras de conduta e proibições',
    paragraphs: ['É proibido utilizar o Agenda AI para atividades abusivas, fraudulentas, ilegais ou que violem direitos de terceiros.'],
    bullets: [
      '10.1. Não praticar invasão, engenharia reversa, teste de vulnerabilidade sem autorização ou tentativa de burlar mecanismos de segurança.',
      '10.2. Não enviar conteúdo ilícito, ofensivo, discriminatório, malicioso ou que viole direitos autorais e de personalidade.',
      '10.3. Não usar a infraestrutura da plataforma para spam, phishing, fraude, automação abusiva ou desinformação.',
      '10.4. Não reproduzir, vender, sublicenciar ou explorar comercialmente recursos do Agenda AI sem autorização formal.',
    ],
  },
  {
    id: 'secao-11',
    title: '11. Propriedade intelectual',
    paragraphs: [
      'A titularidade da marca Agenda AI, identidade visual, software, fluxos, bases de dados, layouts, textos e demais elementos da plataforma pertence aos respectivos titulares e é protegida pela legislação nacional e internacional de propriedade intelectual.',
      'A autorização de uso concedida ao usuário é pessoal, limitada, revogável e não exclusiva, exclusivamente para acesso e utilização legítima do serviço.',
    ],
  },
  {
    id: 'secao-12',
    title: '12. Dados pessoais, privacidade e segurança',
    paragraphs: [
      'O tratamento de dados pessoais segue a Política de Privacidade do Agenda AI, que integra estes Termos para todos os efeitos.',
      'Adotamos medidas técnicas e organizacionais para proteção de dados, sem prejuízo de riscos residuais inerentes ao ambiente digital e às integrações com terceiros.',
      'Ao utilizar o serviço, você concorda com o tratamento necessário de dados para execução contratual, suporte, prevenção a fraudes, segurança e cumprimento de obrigações legais.',
    ],
  },
  {
    id: 'secao-13',
    title: '13. Suspensão, bloqueio e encerramento de conta',
    paragraphs: [
      'O Agenda AI poderá suspender, restringir ou encerrar contas em caso de violação destes Termos, inadimplência, indício de fraude, risco à segurança, ordem judicial/administrativa ou uso que comprometa a plataforma.',
      'Sempre que tecnicamente possível e juridicamente permitido, serão apresentados meios para regularização ou contestação.',
    ],
  },
  {
    id: 'secao-14',
    title: '14. Alterações destes Termos',
    paragraphs: [
      'Podemos atualizar estes Termos para refletir mudanças de produto, operação, segurança, exigências legais e evolução tecnológica.',
      'A continuidade de uso após a publicação da nova versão caracteriza concordância, salvo hipóteses em que a lei exija consentimento específico.',
      'A data de atualização será sempre exibida nesta página para facilitar o controle das versões vigentes.',
    ],
  },
  {
    id: 'secao-15',
    title: '15. Lei aplicável, foro e canais de contato',
    paragraphs: [
      'Estes Termos são regidos pela legislação da República Federativa do Brasil.',
      'As partes elegem o foro legalmente competente, observando-se as normas de proteção ao consumidor quando aplicáveis.',
      'Para dúvidas, solicitações e comunicações sobre estes Termos, utilize os canais oficiais de atendimento informados no site do Agenda AI.',
    ],
  },
];

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-85 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Agenda AI</span>
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

      <main className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 pt-0 pb-10 sm:py-14">
        <section className="bg-white rounded-none sm:rounded-3xl border-y sm:border border-gray-200 shadow-[0_18px_50px_-30px_rgba(30,64,175,0.35)] overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 px-6 sm:px-10 py-10 text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-3 py-1 text-sm mb-4">
              <ShieldCheck className="w-4 h-4" />
              Documento legal
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Termos e Condições de Uso</h1>
            <p className="mt-3 text-blue-100 text-base sm:text-lg">
              Leia com atenção as regras de acesso, assinatura e utilização da plataforma Agenda AI.
            </p>
            <p className="mt-4 text-sm text-blue-100">Última atualização: 06 de fevereiro de 2026</p>
          </div>

          <div className="px-6 sm:px-10 py-8 sm:py-10">
            <article className="bg-blue-50 border border-blue-100 rounded-2xl p-5 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-blue-900 mb-3">Como funciona esta plataforma</h2>
              <ul className="list-disc pl-5 space-y-2 text-blue-900/90">
                {keyPoints.map((point, index) => (
                  <li key={`point-${index}`} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </article>

            <article className="mt-8 sm:mt-10 mb-24 sm:mb-28 bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Conteúdo destes Termos</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed">
                {summaryItems.map((item, index) => (
                  <li key={`summary-${index}`}>{item}</li>
                ))}
              </ul>
            </article>

            <div className="space-y-7">
              {sections.map((section) => (
                <article
                  id={section.id}
                  key={section.id}
                  className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 scroll-mt-24"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>

                  {section.paragraphs.map((paragraph, index) => (
                    <p key={`${section.id}-p-${index}`} className="text-gray-700 leading-relaxed mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-2 mt-3 text-gray-700 leading-relaxed">
                      {section.bullets.map((bullet, index) => (
                        <li key={`${section.id}-b-${index}`}>{bullet}</li>
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
