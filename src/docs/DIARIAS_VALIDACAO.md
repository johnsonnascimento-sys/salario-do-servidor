# Validação da evolução de diárias

Data: 27/10/2026. Branch: `codex/evolucao-diarias`.

## Base preservada

Alterações locais anteriores de folha/previdência foram preservadas no commit `37a85d7`, separado da implementação de diárias. Antes das alterações passaram TypeScript e 51 testes de carregamento, snapshots e previdência. Foi guardado também patch da base no diretório temporário do sistema, sem modificar a branch principal.

## Verificações executadas

| Comando / procedimento | Resultado |
| --- | --- |
| `npm run test:diarias` | 34 cenários temporais, 8 testes de interface/admin e 10 integrações aprovados; mais 30 asserts de transcrições oficiais |
| `npm run test:loading` | 4 testes aprovados |
| `npm run test:payslip` | 24 testes aprovados, incluindo competência única, projeção explícita e restauração |
| `npm run test:salary-scenario` | 9 cenários aprovados: aliases, status, competência, cache e recálculo sem mutação |
| `npm run test:pension` | 24 testes de cálculo e 4 integrações aprovados |
| `npm run test:pension-form` | 35 testes aprovados; aviso preexistente no SSR sobre URL relativa de version.json, sem falha |
| `npm run test:sorting` | 4 testes aprovados |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado; avisos de Browserslist antigo, bundle grande e import estático/dinâmico de exportações |
| Três migrations em PostgreSQL 17 descartável | Aprovadas; RLS, auditoria, imutabilidade, hierarquia, vigências, enum de hospedagem e rascunhos documentais sem publicação |
| Duas publicações concorrentes | 3 asserts aprovados: exatamente um commit e uma rejeição por sobreposição |
| Revisão visual com fixture isolada | Desktop e largura de celular; campos legíveis, memória expansível e sem overflow horizontal do documento |

Foram aprovados 156 cenários de aplicação e compatibilidade (52 de diárias, 95 das demais suítes e 9 de cenário salarial), além de 30 asserts das tabelas documentadas e verificações SQL adicionais. Valores fictícios ficam exclusivamente nos fixtures de testes; nenhum valor fictício foi cadastrado nos rascunhos normativos.

## Aceite funcional com dados sintéticos

- A interface administrativa clona uma versão, altera valor, compara resultados e exige confirmação antes de publicar com predecessor explícito. Outro teste altera percentual, divisor e limite e verifica efeitos somente a partir da vigência nova.
- Motor e banco verificam início/fim inclusivos, lacunas, sobreposições, versões futuras, fonte fora de vigência, ciclos, mistura de moedas, regras nacionais obrigatórias e concorrência.
- Viagens entre meses exigem benefícios por competência; alterações no meio do período disponibilizam os campos correspondentes. No modo quantidade, múltiplas vigências exigem data; teto diário incluindo adicionais exige datas para evitar agregação incorreta.
- Somatórios preservam a precisão de parcelas já fixadas; aplicação de teto não pode arredondar crédito para cima do saldo disponível.
- Integrações usam motor, adaptador JMU, serialização, jsPDF e XLSX reais. Apenas acesso ao serviço externo e download do navegador são substituídos. Arquivos XLSX são reabertos e PDFs têm conteúdo/páginas verificados; holerite e diárias ficam separados, com memória e moeda identificadas.
- Snapshots preservam parâmetros e versões após alterações posteriores. A consulta usa os valores originais; recálculo e novo salvamento são explícitos.

## Reprodução segura do banco

Foi utilizado exclusivamente PostgreSQL local com cluster inicializado no TEMP e bancos descartáveis separados. O aceite inicial usou a porta `55436`. Na repetição final, o Windows negou seu bind; o mesmo cluster foi iniciado na porta local alternativa `25436`, usando o banco vazio `dailies_release_20261027`:

```powershell
# Somente em cluster descartável, com banco recém-criado e vazio.
createdb -h 127.0.0.1 -p 25436 -U postgres dailies_release_20261027
psql -h 127.0.0.1 -p 25436 -U postgres -d dailies_release_20261027 -f supabase/tests/dailies_versioning.sql
node supabase/tests/dailies_concurrency.mjs dailies_release_20261027 25436
```

O fixture cria dependências de autenticação e configuração sintéticas: não executar em banco existente. Não utiliza `.env` nem a conexão de produção.

## Limites da entrega

A validação técnica não certifica um regime jurídico completo. As tabelas originais CJF596/CJF315 e os atos STM799/926/947 foram recuperados e transcritos com datas e fontes em rascunhos revisáveis; `DIARIAS_FONTES_VERIFICADAS.md` registra os documentos e limites de aplicação. Nenhum período oficial é ativado automaticamente: ainda é necessário completar condições de enquadramento, calendário, alcance dos limites/adicionais e a conciliação do arredondamento JMU antes de publicar um regime completo. Isso mantém a exigência de bloquear dados insuficientes. Os fluxos de publicação/salvamento contra a instância real do Supabase não foram exercitados, pois isso escreveria no ambiente do usuário. RLS/RPC foram executados no PostgreSQL local e a interface foi testada com I/O isolado.

A branch desabilita seu próprio deploy automático da Vercel via `git.deploymentEnabled`; a configuração das demais branches é preservada. Não foi solicitado deploy, merge nem aplicação de migrations em produção.

## Integração com a branch principal

A `main` com `59a1ce3` (competência/veto salarial) e `de8fd08` (TRT-2) foi integrada à branch de trabalho no commit `f3a7432`. Os cinco conflitos foram resolvidos, preservando competência única, acesso TRT-2, trabalho local e todos os campos de diárias. A principal não recebeu merge.

A ingestão normaliza `enacted/hypothetical` para os status canônicos `promulgated/vetoed/projected`; não infere status por ano, percentual ou rótulo. Projeção exige `simularDerrubadaVeto === true`. Formulário, adaptador e chamadas públicas do motor resolvem o período pela competência, impedindo que um snapshot com período futuro aplique reajuste anterior à sua data no recálculo. A consulta original do snapshot continua imutável. O especialista de cálculo revisou a integração e a nova fração alternativa de hospedagem sem bloqueadores confirmados. Todas as suítes pertinentes, TypeScript e build foram repetidos após a conciliação.
