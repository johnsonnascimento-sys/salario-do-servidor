export interface WikiSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
}

export interface WikiArticle {
  scope: string;
  slug: string;
  title: string;
  subtitle: string;
  audience: string;
  updatedAt: string;
  readingLevel?: 'iniciante' | 'intermediario' | 'tecnico';
  sections: WikiSection[];
  legalRefs: Array<{ label: string; href: string }>;
}

export interface WikiNode {
  id: string;
  name: string;
  type: 'category' | 'article';
  description?: string;
  scope?: string;
  slug?: string;
  children?: WikiNode[];
}

const WIKI_ARTICLES: WikiArticle[] = [
  {
    scope: 'global',
    slug: 'ir-e-previdencia-geral',
    title: 'Wiki Global: Imposto de Renda e Previdência (visão geral)',
    subtitle:
      'Guia introdutório para entender as bases de IR e previdência antes de usar simuladores específicos.',
    audience: 'Qualquer servidor público que esteja começando a entender o contracheque.',
    updatedAt: '2026-02-28',
    readingLevel: 'iniciante',
    sections: [
      {
        id: 'introducao',
        title: '1) Por onde começar',
        paragraphs: [
          'Se você abriu o contracheque e não entendeu quase nada, comece por aqui.',
          'A ideia é simples: primeiro entra o bruto (vencimento, gratificações, adicionais), depois saem os descontos obrigatórios e opcionais, e o que sobra é o líquido.',
          'No simulador, você não precisa decorar lei para usar: basta preencher corretamente os campos de base e conferir os resultados por bloco.',
        ],
      },
      {
        id: 'conceitos-chave',
        title: '2) Conceitos que você precisa dominar',
        bullets: [
          'Base de cálculo: valor sobre o qual um desconto é aplicado.',
          'Desconto progressivo: alíquotas por faixa, não uma única alíquota sobre tudo.',
          'Regime previdenciário: define as regras de contribuição e possíveis limites.',
          'Competência atual x exercício anterior (EA): muda a trilha de apuração em alguns casos.',
        ],
      },
      {
        id: 'passo-a-passo',
        title: '3) Como usar na prática',
        steps: [
          'Selecione o simulador do seu órgão.',
          'Preencha a base obrigatória (cargo, padrão, função, vantagens fixas).',
          'Revise o bloco tributário/previdenciário.',
          'Adicione rubricas extras somente quando existir evento real no seu mês.',
          'Confirme os blocos de resultado: bruto, descontos, líquido.',
          'Compare com o contracheque oficial para validar o cenário.',
        ],
      },
      {
        id: 'erros-frequentes',
        title: '4) Erros mais comuns',
        bullets: [
          'Usar referência de mês diferente da do contracheque comparado.',
          'Preencher valores de adicionais sem conferir incidência em IR/PSS.',
          'Misturar cenários de regimes previdenciários distintos.',
          'Interpretar desconto progressivo como percentual único sobre a remuneração total.',
        ],
      },
    ],
    legalRefs: [
      { label: 'Constituição Federal de 1988 (Planalto)', href: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm' },
      { label: 'Lei 10.887/2004 (Planalto)', href: 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.887.htm' },
      { label: 'Legislação Federal (Planalto)', href: 'https://www.planalto.gov.br/legislacao/' },
    ],
  },
  {
    scope: 'pju',
    slug: 'previdencia-complementar',
    title: 'PJU: Previdência Complementar (FUNPRESP-JUD) na Calculadora',
    subtitle:
      'Guia completo, do zero ao avançado, para entender e preencher corretamente a previdência complementar no simulador.',
    audience: 'Servidores do Poder Judiciário da União, com foco inicial em JMU.',
    updatedAt: '2026-02-28',
    readingLevel: 'tecnico',
    sections: [
      {
        id: 'o-que-e',
        title: '1) O que é previdência complementar (explicação simples)',
        paragraphs: [
          'Pense em duas camadas de previdência. A primeira é a previdência do regime próprio (RPPS), que segue as regras do serviço público. A segunda, opcional em muitos casos, é a previdência complementar.',
          'Na prática, quando aplicável ao seu caso, a contribuição complementar recai sobre a parte da base que ultrapassa o teto do RGPS.',
          'Na calculadora, esse efeito aparece como uma linha de desconto específica de FUNPRESP-JUD, sem substituir os demais descontos previdenciários obrigatórios.',
        ],
      },
      {
        id: 'quando-ativa',
        title: '2) Quando você deve preencher esse bloco',
        bullets: [
          'Quando seu cenário de regime indicar uso de previdência complementar.',
          'Quando você estiver simulando situação de participante patrocinado.',
          'Quando sua base previdenciária superar o teto do RGPS no período simulado.',
          'Quando quiser validar impacto no líquido ao alterar alíquota normal e facultativa.',
        ],
      },
      {
        id: 'passo-a-passo-usuario',
        title: '3) Passo a passo para quem nunca usou',
        steps: [
          'Abra o simulador do órgão (ex.: JMU).',
          'Preencha cargo, padrão, função e demais valores fixos.',
          'No bloco previdenciário, escolha o regime correto do seu cenário.',
          'No bloco de previdência complementar, informe se participa como patrocinado.',
          'Selecione a alíquota normal conforme o cenário vigente.',
          'Se existir contribuição facultativa, informe o percentual correspondente.',
          'Confira no resultado final a linha de desconto de FUNPRESP-JUD.',
          'Se quiser comparar cenários, altere apenas um parâmetro por vez e observe o líquido.',
        ],
      },
      {
        id: 'como-interpretar',
        title: '4) Como interpretar o resultado',
        bullets: [
          'Base abaixo do teto RGPS: contribuição complementar tende a zero.',
          'Base acima do teto: contribuição cresce proporcionalmente ao excedente.',
          'Ajuste de alíquota normal/facultativa: altera diretamente o desconto de FUNPRESP.',
          'Sem participação complementar: o cenário deve ficar equivalente ao cálculo sem FUNPRESP.',
        ],
      },
      {
        id: 'tecnico-base-legal',
        title: '5) Parte técnica: fundamentos normativos e regulatórios',
        bullets: [
          'Constituição Federal (organização do regime previdenciário e base constitucional do sistema).',
          'Lei 12.618/2012: institui o regime de previdência complementar para servidores federais e estabelece parâmetros de contribuição.',
          'Lei 10.887/2004: disciplina contribuição previdenciária de servidor público e referências de base contributiva.',
          'LC 108/2001 e LC 109/2001: governança e regime geral da previdência complementar fechada.',
          'Regulamento do Plano JusMP-Prev (FUNPRESP-JUD): regras operacionais de contribuição, elegibilidade e custeio.',
          'Plano de Custeio vigente: parâmetros anuais aplicáveis (faixas, componentes de custeio e vigência).',
        ],
      },
      {
        id: 'checagem-final',
        title: '6) Checklist rápido antes de confiar no número',
        bullets: [
          'Período/mês de referência confere com o cenário real?',
          'Regime previdenciário está correto?',
          'Participação em FUNPRESP está marcada conforme seu caso?',
          'Alíquotas informadas no padrão esperado (decimal no cálculo interno)?',
          'Base e parcelas do 13º estão coerentes com o cenário comparado?',
        ],
      },
    ],
    legalRefs: [
      { label: 'Constituição Federal de 1988 (Planalto)', href: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm' },
      { label: 'Lei 12.618/2012 (Planalto)', href: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm' },
      { label: 'Lei 10.887/2004 (Planalto)', href: 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.887.htm' },
      { label: 'LC 108/2001 (Planalto)', href: 'http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp108.htm' },
      { label: 'LC 109/2001 (Planalto)', href: 'http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp109.htm' },
      { label: 'Legislação e normas FUNPRESP-JUD', href: 'https://www.funprespjud.com.br/legislacao-e-normas/' },
      { label: 'Regulamento JusMP-Prev (2018)', href: 'https://www.funprespjud.com.br/wp-content/uploads/2018/10/Plano-de-Beneficios-FunprespJud_2018.pdf' },
      { label: 'Plano de Custeio (vigência 2025)', href: 'https://www.funprespjud.com.br/wp-content/uploads/2025/01/plano-de-custeio-aa-2024-abr2025-170225.pdf' },
    ],
  },
];

export const WIKI_CATALOG_TREE: WikiNode[] = [
  {
    id: 'global',
    name: 'Wiki Global',
    type: 'category',
    description: 'Imposto de Renda e regras gerais de previdência.',
    children: [
      {
        id: 'global-ir-e-previdencia',
        name: 'IR e Previdência: visão geral',
        type: 'article',
        scope: 'global',
        slug: 'ir-e-previdencia-geral',
        description: 'Introdução para quem está começando.',
      },
    ],
  },
  {
    id: 'por-poder',
    name: 'Wiki por Poder',
    type: 'category',
    description: 'Conteúdo por poder e carreira, no mesmo estilo dos simuladores.',
    children: [
      {
        id: 'pju',
        name: 'Poder Judiciário da União',
        type: 'category',
        description: 'Normas e uso prático para o PJU.',
        children: [
          {
            id: 'pju-funpresp',
            name: 'Previdência Complementar (FUNPRESP-JUD)',
            type: 'article',
            scope: 'pju',
            slug: 'previdencia-complementar',
            description: 'Guia completo com parte técnica e base legal.',
          },
        ],
      },
      {
        id: 'executivo-federal',
        name: 'Executivo Federal',
        type: 'category',
        description: 'Conteúdo em preparação.',
        children: [],
      },
      {
        id: 'legislativo-federal',
        name: 'Legislativo Federal',
        type: 'category',
        description: 'Conteúdo em preparação.',
        children: [],
      },
    ],
  },
];

export const getWikiArticle = (scope: string, slug: string): WikiArticle | undefined =>
  WIKI_ARTICLES.find((article) => article.scope === scope && article.slug === slug);

export const getAllWikiArticles = (): WikiArticle[] => [...WIKI_ARTICLES];
