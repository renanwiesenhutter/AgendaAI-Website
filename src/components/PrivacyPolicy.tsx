import { Calendar, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type PrivacySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bulletItems?: string[];
};

const privacySections: PrivacySection[] = [
  {
    id: 'secao-1',
    title: 'Ultimas vez atualizado: 11/02/2026',
    paragraphs: [
      'Esta Política de Privacidade aplica-se ao Agenda AI, um serviço de agendamentos e lembretes operado via WhatsApp. Ela explica como coletamos, usamos, protegemos e compartilhamos suas informações pessoais.',
    ],
  },
  {
    id: 'secao-2',
    title: '1. Coleta de Informações',
    paragraphs: [
      '1.1 Informações fornecidas pelo usuário:',
      'Coletamos nome, número de WhatsApp e endereço de e-mail. Essas informações são necessárias para criar sua conta, identificar você no atendimento e fornecer os serviços do Agenda AI.',
      '1.2 Dados de uso:',
      'As informações sobre compromissos, eventos e solicitações que você nos envia via WhatsApp (por exemplo: título do evento, data/hora, duração, local, observações e mensagens de ajuste/cancelamento) são utilizadas exclusivamente para viabilizar o serviço do Agenda AI, como:',
    ],
    bulletItems: [
      'Criar, alterar, reagendar e cancelar compromissos;',
      'Consultar sua agenda;',
      'Enviar confirmações, lembretes e avisos relacionados aos seus eventos.',
    ],
  },
  {
    id: 'secao-3',
    title: '2. Processamento de Pagamentos',
    paragraphs: [
      '2.1 Pagamentos via plataforma de checkout:',
      'Quando aplicável, os pagamentos do Agenda AI são processados pela Stripe. O Agenda AI não tem acesso a dados sensíveis de pagamento, como informações completas de cartão de crédito.',
      'Podemos receber da Stripe apenas informações necessárias para administrar o serviço, como status do pagamento/assinatura (ex.: aprovado, recusado, cancelado, estornado) e identificadores da transação/cliente.',
      '2.2 Assinaturas via Apple In‑App Purchase:',
      'Quando você realiza uma assinatura através de um aplicativo iOS, o pagamento é processado inteiramente pela Apple. O Agenda AI não tem acesso a informações de pagamento, como dados de cartão de crédito. As assinaturas podem ser renovadas automaticamente conforme o plano escolhido.',
      'Você pode gerenciar ou cancelar sua assinatura a qualquer momento em:',
      'Ajustes > [seu nome] > Assinaturas no seu dispositivo iOS.',
      'Para mais informações sobre assinaturas e reembolsos via Apple, consulte o suporte oficial da Apple.',
    ],
  },
  {
    id: 'secao-4',
    title: '3. Uso e Tratamento dos Dados',
    paragraphs: [
      'As informações coletadas são usadas para:',
    ],
    bulletItems: [
      'Operar o Agenda AI e entregar as funcionalidades solicitadas;',
      'Comunicação relacionada ao serviço (confirmações, lembretes, suporte e avisos);',
      'Melhorias internas (por exemplo: qualidade do atendimento, correções e análises operacionais).',
    ],
  },
  {
    id: 'secao-5',
    title: '4. Compartilhamento e Divulgação de Dados',
    paragraphs: [
      '4.1 Compartilhamento com terceiros:',
      'Não compartilhamos suas informações pessoais com terceiros, exceto quando necessário para operar o serviço (por exemplo: provedores de infraestrutura e pagamento) ou conforme exigido por lei.',
      '4.2 Exigências legais:',
      'Em casos de solicitação legal ou judicial, podemos ser obrigados a divulgar informações pessoais, dentro dos limites aplicáveis.',
    ],
  },
  {
    id: 'secao-6',
    title: '5. Segurança e Proteção dos Dados',
    paragraphs: [
      'Implementamos medidas de segurança para proteger suas informações pessoais contra acesso não autorizado, alteração ou destruição. No entanto, nenhum método de transmissão ou armazenamento eletrônico é completamente seguro.',
    ],
  },
  {
    id: 'secao-7',
    title: '6. Retenção e Exclusão de Dados',
    paragraphs: [
      'Retemos suas informações pessoais pelo tempo necessário para fornecer o serviço e conforme exigido para fins legais ou regulatórios. Quando aplicável e mediante solicitação, poderemos excluir ou anonimizar dados, respeitando obrigações legais.',
    ],
  },
  {
    id: 'secao-8',
    title: '7. Mudanças na Política de Privacidade',
    paragraphs: [
      'Esta Política de Privacidade pode ser atualizada periodicamente. Avisaremos sobre quaisquer mudanças substanciais em como tratamos as informações pessoais.',
    ],
  },
  {
    id: 'secao-9',
    title: '8. Limitação de Responsabilidade',
    paragraphs: [
      'Enquanto nos esforçamos para proteger suas informações pessoais, não podemos garantir sua segurança absoluta. Não somos responsáveis por acessos não autorizados ou outras violações de segurança que escapem ao nosso controle razoável.',
    ],
  },
];

export default function PrivacyPolicy() {
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
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Política de Privacidade do Agenda AI</h1>
          </div>

          <div className="px-6 sm:px-10 py-8 sm:py-10">
            <div className="space-y-7">
              {privacySections.map((section) => (
                <article
                  id={section.id}
                  key={section.id}
                  className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 scroll-mt-24"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>

                  {section.paragraphs.map((paragraph, index) => {
                    const isSubheading = /^\d+\.\d+/.test(paragraph.trim());
                    const isLastParagraph = index === section.paragraphs.length - 1;
                    const hasBulletItems = Boolean(section.bulletItems?.length);
                    const spacingClass = isLastParagraph && !hasBulletItems ? 'mb-0' : isSubheading ? 'mb-1' : 'mb-3';

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
