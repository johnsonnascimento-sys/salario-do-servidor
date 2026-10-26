# Ativação e manutenção do histórico de diárias

A migration `20261026190000_dailies_versioning.sql` é aditiva. Não altera tabelas de folha, valores legados, holerites nem RLS das simulações. Não deve ser aplicada automaticamente em produção. Nenhum valor normativo é publicado por essa migration.

Em seguida, `20261026190100_dailies_review_drafts.sql` cadastra os metadados de `jf` (configuração salarial vazia) e modelos de percentuais JMU/CJF sem datas nem valores monetários. São rascunhos para revisão, sem efeito em cálculos até publicação administrativa fundamentada. A referência `stf_nacional`, limites e regras faltantes precisam ser completados; nenhuma data de ato é presumida como data de publicação ou início dos efeitos.

## Preparação e publicação

1. Fazer backup e aplicar primeiro em banco descartável/homologação com as migrations anteriores, inclusive `org_config`, `power_config` e `is_admin_user()`.
2. Conferir os âmbitos criados a partir de `org_config`. O relacionamento de poder vem de `org_config.power_name`; o ramo é explícito em `dailies_org_memberships`. JMU e STM recebem ramo JMU. Cadastrar a Justiça Federal no `org_config` antes de usar seu âmbito; vincular seu slug real a CJF via `admin_set_dailies_branch` quando aplicável. Nenhuma regra antiga do PJU é importada para o novo âmbito PJU.
3. O legado da JMU/STM fica em `legacy_snapshot`, como rascunho com vigência nula, sem participação no cálculo. Não se atribui data histórica presumida. Clonar e converter o conteúdo para o payload tipado, conferir fundamentos e salvar a revisão elimina a marca de legado no novo rascunho. A auditoria preserva a cópia anterior. Valores atuais não comprovam períodos anteriores.
4. No painel administrativo, definir regra, referências, tarifas, limites e fontes oficiais. Todo parâmetro monetário precisa de `source_ids` resolvíveis na configuração efetiva. Percentuais de referência/categoria precisam de alvos existentes e da mesma moeda; ciclos e limites obrigatórios alterados são rejeitados no servidor. Conferir também as fontes de regras e a matriz normativa.
5. Selecionar início jurídico comprovado e término inclusivo, se houver. Publicação administrativa tem timestamp próprio. Comparar a simulação anterior e posterior antes de confirmar impacto. Lacunas permanecem indisponíveis; não se usa o legado como fallback.
6. Publicar via RPC. Para alteração normativa, informar a versão anterior do mesmo âmbito: ela é encerrada no dia anterior ao novo início. Para correção cadastral, preservar exatamente o intervalo e informar a versão corrigida: o registro antigo fica íntegro, marcado como substituído. Não editar diretamente conteúdo publicado.

## Garantias e limites

Os RPCs de escrita exigem `is_admin_user()`. As tabelas não concedem escrita direta a `anon`/`authenticated`, inclusive administradores autenticados. Leitura pública mostra versões publicadas; rascunhos e auditoria são administrativos. Conteúdo publicado é imutável; encerramento e substituição geram imagens anterior/posterior na auditoria. O lock transacional serializa publicações em toda a hierarquia, evitando corrida entre órgão e poder. Sobreposições do mesmo âmbito são rejeitadas, com rollback integral em falhas; uma constraint de exclusão GiST também protege a integridade no banco. A migration utiliza a extensão padrão PostgreSQL `btree_gist`.

A validação de publicação examina configurações efetivas nas fronteiras temporais e impede referências inexistentes, ciclos, mistura de moedas e alteração de limites obrigatórios herdados. Ela não substitui conferência humana de vigência, autenticidade ou aplicabilidade de um ato. A entrada por quantidade pode exigir data normativa quando há mais de uma configuração no mês.

O serviço consulta órgão, intervalo e revisão em uma única RPC. A assinatura inclui conteúdo e intervalos publicados e contexto de herança. O cache usa órgão, datas e revisão e devolve cópias isoladas. Publicar e alterar ramo limpa o cache local; outras sessões consultam a revisão novamente em cada carregamento. A interface deve invalidar resultados e rejeitar respostas assíncronas obsoletas ao trocar entradas.

## Teste descartável e retorno

`supabase/tests/dailies_versioning.sql` cria dependências sintéticas para banco vazio e aplica a migration; nunca deve rodar em banco existente. Executar via `psql` em PostgreSQL 17 local e porta reservada. Depois executar `node supabase/tests/dailies_concurrency.mjs`, exclusivamente no fixture em `127.0.0.1:55436`.

Os testes cobrem RLS anônima/usuário comum, bloqueio de escrita direta, imutabilidade e auditoria, limites inclusivos, expiração, isolamento JMU/JF, divisor inválido, referências, ciclos, moedas, limite/regra obrigatórios, vigência de fontes, substituição, correção, rascunhos sem vigência e publicação concorrente. Os valores e fontes de `example.invalid` são apenas fixtures e não seeds oficiais.

Vínculos administrativos de ramo são auditados e só podem ser alterados antes de existir histórico publicado no órgão ou nos ramos envolvidos. Remapear o ramo posteriormente mudaria a resolução histórica; nessa hipótese deve-se modelar novo órgão/regime por migration revisada. Publicação de âmbito sem nenhum órgão associado é rejeitada, evitando dados sem validação da herança efetiva.

Para retorno de aplicação, reverter o frontend/serviço ao artefato anterior e preservar tabelas e auditoria. Para dados publicados incorretamente, registrar correção ou nova vigência via RPC. Não apagar o histórico nem reaplicar os fixtures. Não há migração destrutiva de retorno e nenhuma alteração de produção foi executada durante o desenvolvimento.
