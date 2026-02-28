# Estudo Normativo Funpresp-Jud + Backlog de Implementacao (Escopo Patrocinado)

## Resumo
O arcabouco legal e normativo confirma que o calculo de previdencia complementar no cenario participante patrocinado deve usar a remuneracao de participacao no excedente ao teto RGPS, com contribuicao normal entre 6,5% e 8,5% (passo 0,5%), contribuicao facultativa com minimo de 2,5% e sem contrapartida do patrocinador.

O site atual ja possui motor para calculo de Funpresp, mas a UI ativa nao expoe os campos de entrada de Funpresp no fluxo principal, o que tende a zerar a contribuicao na pratica.

Ha risco tecnico relevante de unidade de aliquota (percentual vs decimal) que precisa ser normalizado antes de liberar o recurso na UI ativa.

A melhor implementacao para o contexto atual e data-driven com vigencia, comecando por patrocinado e deixando vinculado/autopatrocinado para fase 2.

## Achados legais consolidados (o que vira regra de sistema)
1. Lei 12.618/2012, art. 3o + art. 16: contribuicao no excedente ao teto do RGPS, com paridade patrocinador-participante ate 8,5%.
2. Regulamento do Plano JusMP-Prev (2018), art. 14: remuneracao de participacao do patrocinado e a parcela da base de contribuicao que excede o teto RGPS.
3. Regulamento (2018), art. 15: contribuicao normal patrocinado entre 6,5% e 8,5% em intervalo de 0,5%; contribuicao facultativa minima de 2,5%; ausencia de escolha na inscricao automatica implica 8,5%.
4. Regulamento (2018), art. 15 paragrafo 3o: plano de custeio anual define FCBE, taxa de carregamento, taxa de administracao e contribuicao administrativa.
5. Plano de Custeio vigente a partir de 01/04/2025: patrocinados 6,5%-8,5%; vinculados 6,5%-22,0%; facultativa minima 2,5%; carregamento normal 3,5%; carregamento facultativa 0,0%; FCBE 13,24%.
6. Lei 10.887/2004, art. 4o paragrafo 2o (via remissao da 12.618): inclusao opcional de parcelas de FC/CJ/local de trabalho na base.

## Diagnostico do site atual (lacunas para corrigir)
1. A UI principal nao expoe configuracao de Funpresp no fluxo ativo do simulador.
2. O motor ja calcula Funpresp e 13o com base excedente ao teto, mas depende de parametros de estado que hoje nao sao capturados no fluxo principal.
3. Existe risco de unidade de aliquota inconsistente em parte da UI legada (valores em % em vez de decimal no calculo).
4. As regras de Funpresp ainda nao estao versionadas no mesmo modelo data-driven usado para PSS/IR.
5. Nao ha trilha explicita na UI para diferenciar regra legal e parametro anual de custeio.

## Backlog priorizado (decision-complete)
### P0 - Conformidade funcional imediata (patrocinado)
1. Expor bloco Previdencia Complementar (Funpresp) na UI ativa quando `regimePrev` for `rpc` ou `migrado`.
2. Adicionar campo `Participa Funpresp` com opcoes `Nao` e `Sim (Patrocinado)`.
3. Adicionar campo `Contribuicao normal patrocinada` com opcoes geradas de configuracao: 6,5, 7,0, 7,5, 8,0, 8,5 (passo 0,5), armazenando sempre em decimal (0.065 etc).
4. Adicionar campo `Contribuicao facultativa (%)` com validacao: 0 ou >= 2,5, passo 0,5, limite maximo inicial 22,0 por compatibilidade com benchmark.
5. Aplicar default: `rpc + Sim (Patrocinado)` inicia em 8,5%; `migrado` inicia em `Nao`.
6. Manter formula de desconto em folha: `valFunpresp = baseExcedente * aliquotaNormal + baseExcedente * aliquotaFacultativa`.
7. Preservar regra de base: `baseExcedente = max(0, basePSS - tetoRGPS)` no mensal e no 13o.
8. Criterio de aceite P0: com mesmo cenario de entrada, o calculo reproduz a logica do benchmark para patrocinado e exibe desconto Funpresp no resumo final.

### P1 - Data-driven e governanca de regra
1. Criar chave de configuracao `previdencia_complementar` em `power_config` (PJU/JMU), com vigencia e estrutura:

```json
{
  "enabled": true,
  "scope": "patrocinado",
  "sponsored_rate": { "min": 0.065, "max": 0.085, "step": 0.005, "default_rpc": 0.085 },
  "facultative_rate": { "min_if_positive": 0.025, "max": 0.22, "step": 0.005, "default": 0.0 },
  "base_rule": "excedente_teto_rgps",
  "include_thirteenth": true,
  "costing_disclosure": {
    "loading_normal": 0.035,
    "loading_facultative": 0.0,
    "fcbe_share_of_normal": 0.1324,
    "admin_remido_assistido": 0.003,
    "effective_from": "2025-04-01"
  },
  "references": {
    "regulamento_version": "2018",
    "plano_custeio_ref": "2025"
  }
}
```

2. Mapear essa chave no servico de configuracao e no `CourtConfig` final.
3. Remover qualquer hardcode de opcoes de Funpresp da UI e puxar tudo da configuracao efetiva.
4. Criterio de aceite P1: alteracao de parametro de Funpresp no banco reflete no simulador sem deploy.

### P2 - Transparencia e preparacao de fase 2
1. Exibir `Base legal e vigencia` no card de Funpresp (lei/regulamento/plano de custeio).
2. Exibir breakdown informativo opcional do desconto normal: parcela de carregamento e FCBE (informativo, sem alterar liquido).
3. Preparar extensao para vinculado/autopatrocinado sem ativar no calculo em producao nesta fase.
4. Criterio de aceite P2: usuario consegue entender regra aplicada e vigencia dos parametros sem consultar fonte externa.

## Mudancas importantes em APIs/interfaces/tipos publicos
1. `PowerConfig` e `EffectiveConfig`: adicionar `previdencia_complementar`.
2. `CourtConfig`: adicionar `previdenciaComplementar` mapeado para consumo da UI/motor.
3. `CalculatorState`: manter `funprespAliq` e `funprespFacul`, adicionar `funprespParticipacao` (`nao` | `patrocinado`) e normalizar unidade de `funprespAliq` para decimal.
4. `IJmuCalculationParams`: adicionar `funprespParticipacao` e manter aliquotas em decimal no contrato interno.
5. UI ativa: nova secao de Funpresp no formulario tributario principal, substituindo dependencia de componentes legados.

## Testes e cenarios de validacao
1. RPC, basePSS abaixo do teto, participante patrocinado com 8,5%: desconto Funpresp deve ser 0.
2. RPC, basePSS acima do teto, 8,5% e facultativa 0%: desconto = excedente * 0,085.
3. RPC, basePSS acima do teto, 7,0% e facultativa 2,5%: desconto = excedente * (0,07 + 0,025).
4. Facultativa 1,5%: UI deve bloquear e exibir erro de validacao.
5. Aliquota normal fora da grade 0,5%: UI deve bloquear.
6. 13o com segunda parcela: calculo de Funpresp deve usar excedente da base aplicavel do 13o.
7. Alternar `pssSobreFC`: recalcular `basePSS`, base excedente e Funpresp coerentemente.
8. Teste de regressao: sem participacao Funpresp, liquido deve permanecer identico ao cenario atual.

## Assuncoes e defaults escolhidos
1. Escopo desta fase: apenas participante patrocinado.
2. Modelo de dados: data-driven com vigencia.
3. Entrega desta etapa: backlog priorizado para implementacao.
4. Limite maximo de facultativa adotado inicialmente em 22,0% por compatibilidade com benchmark; marcado como parametro configuravel, nao como imposicao legal.
5. Nao sera implementado calculo atuarial de beneficio futuro; apenas impacto de folha.

## Fontes oficiais usadas no estudo
1. https://www.funprespjud.com.br/legislacao-e-normas/
2. https://www.funprespjud.com.br/wp-content/uploads/2018/10/Plano-de-Beneficios-FunprespJud_2018.pdf
3. https://www.funprespjud.com.br/wp-content/uploads/2025/01/plano-de-custeio-aa-2024-abr2025-170225.pdf
4. https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm
5. https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.887.htm
6. http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp108.htm
7. http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp109.htm
8. http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11053.htm
