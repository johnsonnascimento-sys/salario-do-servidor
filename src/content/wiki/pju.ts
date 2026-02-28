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
  sections: WikiSection[];
  legalRefs: Array<{ label: string; href: string }>;
}

export const PJU_WIKI_ARTICLES: WikiArticle[] = [
  {
    scope: 'pju',
    slug: 'previdencia-complementar',
    title: 'Manual PJU: Previdencia Complementar (FUNPRESP-JUD)',
    subtitle:
      'Guia pratico para entender quando usar a opcao e como preencher os campos na calculadora.',
    audience: 'Servidores do Poder Judiciario da Uniao (foco inicial: JMU).',
    updatedAt: '2026-02-28',
    sections: [
      {
        id: 'quando-usar',
        title: '1) Quando esta pagina deve ser usada',
        paragraphs: [
          'Use este manual quando voce estiver simulando cenarios com previdencia complementar e quiser conferir o impacto no liquido.',
          'Esta pagina trata do escopo participante patrocinado e explica o preenchimento dos campos no simulador.',
        ],
      },
      {
        id: 'regra-resumo',
        title: '2) Regra em linguagem simples',
        bullets: [
          'A contribuicao complementar incide sobre o excedente ao teto do RGPS.',
          'Se a base de previdencia nao superar o teto, o valor de Funpresp no mes e zero.',
          'No patrocinado, existe contribuicao normal em faixa definida e contribuicao facultativa opcional.',
          'No simulador, o resultado impacta o bloco de descontos e o liquido final.',
        ],
      },
      {
        id: 'como-preencher',
        title: '3) Como preencher na calculadora (passo a passo)',
        steps: [
          'Abra o simulador da JMU em /simulador/jmu.',
          'No bloco de configuracoes tributarias, ajuste o Regime Previdenciario.',
          'Se o regime exigir previdencia complementar no seu cenario, habilite participacao em Funpresp.',
          'Selecione a contribuicao normal patrocinada conforme sua regra vigente.',
          'Se houver contribuicao facultativa, informe o percentual no campo especifico.',
          'Revise o resumo final e confira a linha de desconto da Funpresp.',
        ],
      },
      {
        id: 'validacao',
        title: '4) Validacoes que o usuario deve conferir',
        bullets: [
          'Base abaixo do teto RGPS: desconto Funpresp deve permanecer zero.',
          'Base acima do teto RGPS: desconto deve aumentar conforme aliquota normal e facultativa.',
          'Sem participacao Funpresp: resultado deve ficar igual ao cenario atual sem complementar.',
          'No 13o, conferir se o comportamento segue a base aplicavel da parcela informada.',
        ],
      },
      {
        id: 'erros-comuns',
        title: '5) Erros comuns e como evitar',
        bullets: [
          'Confundir unidade da aliquota: o sistema interno usa decimal para calculo.',
          'Informar percentual facultativo abaixo do minimo configurado no cenario ativo.',
          'Comparar com holerite de contexto diferente (regime, periodo, base ou parcela de 13o).',
        ],
      },
      {
        id: 'observacoes',
        title: '6) Observacoes importantes',
        paragraphs: [
          'Este manual e orientativo e deve ser lido junto das regras vigentes do seu orgao.',
          'Quando houver divergencia, prevalece a norma oficial e o plano de custeio vigente.',
        ],
      },
    ],
    legalRefs: [
      { label: 'Lei 12.618/2012 (Planalto)', href: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm' },
      { label: 'Lei 10.887/2004 (Planalto)', href: 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.887.htm' },
      { label: 'Legislacao e Normas FUNPRESP-JUD', href: 'https://www.funprespjud.com.br/legislacao-e-normas/' },
      { label: 'Regulamento JusMP-Prev (2018)', href: 'https://www.funprespjud.com.br/wp-content/uploads/2018/10/Plano-de-Beneficios-FunprespJud_2018.pdf' },
      { label: 'Plano de Custeio (vigencia 2025)', href: 'https://www.funprespjud.com.br/wp-content/uploads/2025/01/plano-de-custeio-aa-2024-abr2025-170225.pdf' },
    ],
  },
];

export const getWikiArticle = (scope: string, slug: string): WikiArticle | undefined =>
  PJU_WIKI_ARTICLES.find((article) => article.scope === scope && article.slug === slug);
