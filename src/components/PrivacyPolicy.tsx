import { Calendar, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

type PrivacySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const keyPoints = [
  'Esta Politica descreve como o Agenda AI coleta, utiliza, compartilha, protege e elimina dados pessoais.',
  'O tratamento de dados ocorre com base na LGPD e apenas para finalidades legitimas, especificas e informadas.',
  'Pagamentos e integracoes com terceiros seguem controles contratuais, tecnicos e operacionais adequados.',
  'Voce pode exercer direitos de titular, incluindo acesso, correcao, portabilidade e eliminacao, nos termos da lei.',
  'Atualizacoes desta Politica serao publicadas nesta pagina com indicacao da data da versao vigente.',
];

const summaryItems = [
  '1. Data de disponibilizacao do texto',
  '2. Definicoes e conceitos gerais',
  '3. Escopo de dados pessoais tratados',
  '4. Formas de coleta de dados',
  '5. Finalidades e bases legais do tratamento',
  '6. Compartilhamento de dados com terceiros',
  '7. Transferencias internacionais de dados',
  '8. Pagamentos, assinaturas e parceiros financeiros',
  '9. Cookies e tecnologias semelhantes',
  '10. Retencao, bloqueio e descarte de dados',
  '11. Direitos do titular e como exercer',
  '12. Seguranca da informacao e governanca',
  '13. Dados de menores de idade',
  '14. Atualizacoes desta Politica',
  '15. Contato e solicitacoes de privacidade',
];

const privacySections: PrivacySection[] = [
  {
    id: 'secao-1',
    title: '1. Data de disponibilizacao do texto',
    paragraphs: ['Esta versao da Politica de Privacidade foi disponibilizada em 06/02/2026.'],
  },
  {
    id: 'secao-2',
    title: '2. Definicoes e conceitos gerais',
    paragraphs: [
      'Para facilitar a leitura, os termos abaixo sao utilizados com os seguintes significados: Dados Pessoais (informacoes relacionadas a pessoa natural identificada ou identificavel), Titular (pessoa a quem os dados se referem), Tratamento (qualquer operacao realizada com dados), Controlador (quem decide sobre o tratamento) e Operador (quem trata dados em nome do Controlador).',
      'Quando esta Politica mencionar "Agenda AI", "nos", "nossos" ou termos equivalentes, refere-se ao responsavel pela operacao da plataforma. Quando mencionar "voce" ou "usuario", refere-se ao titular da conta e/ou seu representante legal, conforme o caso.',
    ],
  },
  {
    id: 'secao-3',
    title: '3. Escopo de dados pessoais tratados',
    paragraphs: [
      'Podemos tratar dados de cadastro e contato, como nome, e-mail, telefone e informacoes de autenticacao, alem de dados operacionais necessarios para prestacao do servico.',
      'Tambem podem ser tratados dados relacionados ao uso da plataforma, como preferencias, historico de interacoes, informacoes de agenda, configuracoes e metadados tecnicos (por exemplo, IP, navegador e registro de eventos de seguranca).',
      'Em determinadas jornadas, podem existir dados enviados por voce em mensagens, textos, audios ou integracoes habilitadas por sua iniciativa. Recomendamos nao inserir dados excessivos ou sensiveis sem necessidade.',
    ],
  },
  {
    id: 'secao-4',
    title: '4. Formas de coleta de dados',
    paragraphs: ['A coleta pode ocorrer por diferentes meios, sempre vinculados ao uso legitimo da plataforma e dos canais oficiais.'],
    bullets: [
      '4.1. Dados informados diretamente por voce durante cadastro, suporte, contratacao ou uso de funcionalidades.',
      '4.2. Dados gerados automaticamente durante acesso ao site, aplicacoes, API e integracoes autorizadas.',
      '4.3. Dados recebidos de parceiros e provedores externos, quando indispensaveis para autenticacao, pagamento, comunicacao e seguranca.',
    ],
  },
  {
    id: 'secao-5',
    title: '5. Finalidades e bases legais do tratamento',
    paragraphs: [
      'Tratamos dados pessoais para executar o contrato de uso da plataforma, disponibilizar funcionalidades, enviar lembretes, processar assinaturas, atender chamados e prestar suporte tecnico.',
      'Tambem tratamos dados para cumprir obrigacoes legais/regulatorias, prevenir fraudes, proteger direitos, garantir seguranca dos ambientes e aprimorar a experiencia do usuario com analises internas de performance e confiabilidade.',
      'As bases legais incluem, conforme o contexto, execucao de contrato, cumprimento de obrigacao legal, exercicio regular de direitos, legitimo interesse e consentimento, quando exigido pela legislacao aplicavel.',
    ],
  },
  {
    id: 'secao-6',
    title: '6. Compartilhamento de dados com terceiros',
    paragraphs: [
      'O compartilhamento de dados pessoais ocorre apenas no limite necessario para operacao do servico, com parceiros que atuam em nome do Agenda AI ou em funcao de integracoes solicitadas por voce.',
      'Sempre que possivel, adotamos contratos e requisitos de seguranca para assegurar que terceiros tratem os dados de forma adequada e compativel com esta Politica.',
    ],
    bullets: [
      '6.1. Provedores de infraestrutura, armazenamento, monitoramento e comunicacao.',
      '6.2. Processadores de pagamento e plataformas de assinatura.',
      '6.3. Ferramentas de analytics, atendimento e prevencao a fraude.',
      '6.4. Autoridades publicas, quando houver obrigacao legal, ordem judicial ou requisicao valida.',
    ],
  },
  {
    id: 'secao-7',
    title: '7. Transferencias internacionais de dados',
    paragraphs: [
      'Alguns provedores utilizados pelo Agenda AI podem armazenar ou processar dados fora do Brasil. Nesses casos, buscamos mecanismos de governanca e seguranca compativeis com a legislacao aplicavel.',
      'Ao utilizar a plataforma, voce reconhece que determinados fluxos tecnicos podem envolver transferencia internacional, sempre com medidas razoaveis para protecao de dados pessoais.',
    ],
  },
  {
    id: 'secao-8',
    title: '8. Pagamentos, assinaturas e parceiros financeiros',
    paragraphs: [
      'As cobrancas de assinatura podem ser processadas por parceiros especializados. O Agenda AI nao armazena integralmente dados sensiveis de cartao quando o processamento ocorre por gateway externo.',
      'Quando a contratacao for realizada por loja de aplicativos, marketplace ou intermediador de pagamento, politicas especificas desse parceiro podem complementar regras de cancelamento, renovacao e estorno.',
      'Recomendamos a leitura conjunta dos Termos de Uso e das politicas do parceiro de pagamento utilizado no momento da compra.',
    ],
  },
  {
    id: 'secao-9',
    title: '9. Cookies e tecnologias semelhantes',
    paragraphs: [
      'Podemos utilizar cookies, SDKs e identificadores similares para autenticacao, seguranca, personalizacao de experiencia, medicao de desempenho e analise de uso da plataforma.',
      'Voce pode gerenciar parte dessas preferencias em seu navegador, dispositivo ou configuracoes da aplicacao, ciente de que algumas funcionalidades podem ser impactadas.',
    ],
    bullets: [
      '9.1. Cookies essenciais: necessarios para funcionamento e seguranca.',
      '9.2. Cookies de desempenho: ajudam a medir estabilidade e uso.',
      '9.3. Cookies funcionais: armazenam preferencias e personalizacao.',
    ],
  },
  {
    id: 'secao-10',
    title: '10. Retencao, bloqueio e descarte de dados',
    paragraphs: [
      'Os dados pessoais sao mantidos apenas pelo periodo necessario para atender finalidades legitimas desta Politica, execucao contratual, suporte, obrigacoes legais e exercicio regular de direitos.',
      'Encerrada a necessidade de tratamento, os dados podem ser eliminados, anonimizados ou mantidos bloqueados, conforme requisitos legais, regulatorios e de seguranca.',
    ],
  },
  {
    id: 'secao-11',
    title: '11. Direitos do titular e como exercer',
    paragraphs: [
      'Nos termos da LGPD, voce pode solicitar confirmacao da existencia de tratamento, acesso, correcao, anonimizacao, bloqueio, eliminacao, portabilidade e informacoes sobre compartilhamento, observadas as hipoteses legais.',
      'Tambem e possivel requerer revisao de decisoes automatizadas quando aplicavel e revogar consentimento em tratamentos que dependam dessa base legal.',
    ],
    bullets: [
      '11.1. As solicitacoes podem ser feitas pelos canais oficiais de contato do Agenda AI.',
      '11.2. Poderemos solicitar comprovacao de identidade para protecao do titular e prevencao a fraude.',
      '11.3. Prazos e limites de atendimento seguem a legislacao vigente e a viabilidade tecnica/juridica do pedido.',
    ],
  },
  {
    id: 'secao-12',
    title: '12. Seguranca da informacao e governanca',
    paragraphs: [
      'Adotamos medidas tecnicas e administrativas razoaveis para proteger dados pessoais contra acessos nao autorizados, perda, alteracao, divulgacao ou destruicao indevida.',
      'Nenhum sistema e totalmente imune a incidentes. Ainda assim, mantemos processos de monitoramento, controle de acesso e melhoria continua para reduzir riscos operacionais.',
    ],
  },
  {
    id: 'secao-13',
    title: '13. Dados de menores de idade',
    paragraphs: [
      'A plataforma nao e direcionada intencionalmente a menores sem representacao legal. Caso seja identificado tratamento inadequado, poderemos adotar medidas para restringir conta e remover dados, conforme permitido por lei.',
      'Responsaveis legais que identificarem uso indevido por menor podem entrar em contato para analise e providencias cabiveis.',
    ],
  },
  {
    id: 'secao-14',
    title: '14. Atualizacoes desta Politica',
    paragraphs: [
      'Podemos atualizar esta Politica para refletir mudancas legais, regulatorias, tecnicas ou de produto. A versao vigente sera sempre publicada nesta pagina com a respectiva data de atualizacao.',
      'Em alteracoes relevantes, poderemos adotar mecanismos adicionais de comunicacao pelos canais disponiveis.',
    ],
  },
  {
    id: 'secao-15',
    title: '15. Contato e solicitacoes de privacidade',
    paragraphs: [
      'Para duvidas, requisicoes relacionadas a dados pessoais ou exercicio de direitos de titular, utilize os canais oficiais informados no site do Agenda AI.',
      'As demandas serao analisadas conforme a legislacao aplicavel e os procedimentos internos de seguranca e governanca de dados.',
    ],
  },
];

export default function PrivacyPolicy() {
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

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 pt-0 pb-10 sm:py-14">
        <section className="bg-white rounded-none sm:rounded-3xl border-y sm:border border-gray-200 shadow-[0_18px_50px_-30px_rgba(30,64,175,0.35)] overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 px-6 sm:px-10 py-10 text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-3 py-1 text-sm mb-4">
              <ShieldCheck className="w-4 h-4" />
              Documento legal
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Política de Privacidade</h1>
            <p className="mt-3 text-blue-100 text-base sm:text-lg">
              Leia com atencao como o Agenda AI trata dados pessoais em todas as etapas da prestacao do servico.
            </p>
            <p className="mt-4 text-sm text-blue-100">Última atualização: 06 de fevereiro de 2026</p>
          </div>

          <div className="px-6 sm:px-10 py-8 sm:py-10">
            <article className="bg-blue-50 border border-blue-100 rounded-2xl p-5 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-blue-900 mb-3">Compromissos de privacidade</h2>
              <ul className="list-disc pl-5 space-y-2 text-blue-900/90">
                {keyPoints.map((point, index) => (
                  <li key={`point-${index}`} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </article>

            <article className="mt-8 sm:mt-10 mb-24 sm:mb-28 bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Conteudo desta Politica</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed">
                {summaryItems.map((item, index) => (
                  <li key={`summary-${index}`}>{item}</li>
                ))}
              </ul>
            </article>

            <div className="space-y-7">
              {privacySections.map((section) => (
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
