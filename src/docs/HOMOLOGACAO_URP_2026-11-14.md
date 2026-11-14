# Homologação local — Funpresp-Jud / URP — 14/11/2026

## Entrega e fonte

Correção local do formulário, resolução compartilhada no motor e rastreabilidade da URP nas memórias e exportações. Nenhuma escrita no banco remoto ou publicação do site foi executada.

A [tabela oficial](https://www.funprespjud.com.br/urp/index.php), reconferida em 14/11/2026, registra R$ 206,11 em 12/11/2026. O comunicado sobre [atualização anual](https://www.funprespjud.com.br/atualizacao-a-partir-de-janeiro-de-2016-do-valor-da-remuneracao-de-participacao-escolhida-em-urp/) distingue inscrição no exercício de atualização em janeiro pela URP de novembro anterior. Foi preservado o critério temporal já implementado.

| Folha / referência informada | URP utilizada | Mínimo |
| --- | --- | ---: |
| Novembro/2026 / inscrição outubro/2026 | Outubro/2026: R$ 205,83 | R$ 2.058,30 |
| Novembro/2026 / inscrição anterior a 2026 | Novembro/2025: R$ 197,00 | R$ 1.970,00 |
| Novembro/2026 / inscrição novembro/2026 | Novembro/2026: R$ 206,11 | R$ 2.061,10 |
| Janeiro/2027 / inscrição outubro/2026 | Novembro/2026: R$ 206,11 | R$ 2.061,10 |

O último exemplo testa somente a resolução da URP; não certifica PSS, IR ou folha completa de 2027. Eleições devem refletir a base vigente na folha, não antecipar efeitos de escolha para janeiro. O valor informado não é reajustado automaticamente.

## Validação

- `npm run typecheck` e `npm run build`: aprovados. O build emitiu avisos existentes de tamanho de bundle, importação e Browserslist.
- `npm run test:pension`: motor, novos cenários URP, integração e exportação real PDF/XLSX aprovados. Os testes novos verificam fontes inválidas, ausência de referência, limites exatos, valores em centavos, mensal, 13º e memória histórica.
- `npm run test:pension-form`: aprovado. A fixture antiga de criação histórica passou a incluir uma rubrica histórica, condição exigida pelo fluxo atual; nenhuma alteração de comportamento desse editor.
- `npm run test:pension-stage2`, `npm run test:loading`, `npm run test:config`: aprovados, incluindo isolamento de competência, prevenção de resultados antigos, preservação de entradas e bloqueio de salvar/exportar.
- Catálogo, validação administrativa, serviço administrativo e seed: aprovados quando executados individualmente pelos scripts correspondentes da suíte `test:pension-stage3`.
- PostgreSQL descartável via `@electric-sql/pglite` instalado fora do repositório: migration nova aprovada, com JSON anterior e histórico preservados, reaplicação idempotente e rollback por conflito de valor/fonte. As verificações PostgreSQL do seed anterior também passaram. Para repetir: definir `PENSION_PGLITE_MODULE` com o caminho do pacote e executar `npm run test:pension` e `node scripts/test-pension-seed.mjs`.

Navegador Chrome em página local isolada: componentes reais, hook de cálculo real e motor oficial, com remuneração sintética e configuração em memória. Sem conexão com banco ou gravação de holerite. Conferidos R$ 400,00 preservados com mensagem de mínimo de R$ 2.061,10; entrada no mínimo aceita, desconto normal de R$ 133,97 a 6,5%; R$ 9.000,01 acima da base sintética de R$ 9.000,00 bloqueado, sem resumo anterior; retorno ao mínimo restaura o resumo, que registra fonte e referência. O botão da página de homologação indica disponibilidade; as ações reais de exportação e salvamento foram verificadas pelas suítes de integração, não por esse botão.

## Limites e pendência preexistente

`test:pension-stage3` não ficou integralmente verde: em `pensionStage3UI.test.tsx`, “incidência mensal divergente pode ser corrigida diretamente após mudança de competência” falha ao localizar um label na seção de rubricas manuais. A mesma falha foi reproduzida com um loader de teste que substituiu todos os módulos `src` alterados nesta tarefa por seus conteúdos em `HEAD`. É preexistente e não foi corrigida nesta entrega. Os outros quatro testes desse arquivo passaram.

A migration acrescenta apenas a URP mensal comprovada à configuração do PJU. Snapshots publicados em `historical_rules.configuration` são preservados: novas apurações históricas que precisem de URP ausente nesses snapshots continuam pendentes, sem fallback à configuração mensal. A cobertura integral da vinculada histórica de novembro não foi certificada. Revisar regras históricas exige etapa própria de governança/versionamento.

Antes de qualquer aplicação futura em produção: revisar impacto pelo fluxo administrativo, inspecionar overrides do órgão e a versão ativa do PJU, confirmar a fonte vigente e conferir a configuração efetiva após a aplicação. A migration não substitui essa revisão e não altera permissões/RLS.

## Melhoria de uso após conferência do site público

Na nova rodada de 14/11, o navegador público já apresentava o código `0eaed49`, mas continuava bloqueado por URP de novembro/2026 ausente ou inválida. Os dados observados eram base escolhida de R$ 3.000,00, alíquota de 22% e referência novembro/2026. A tabela oficial foi reconferida e continua registrando a publicação de R$ 206,11 em 12/11/2026. Nenhuma mudança desses dados foi feita na sessão real do usuário.

O feedback visual agora explica que a equipe do site precisa atualizar a tabela e preserva o diagnóstico original em “Informações para suporte”. Não marca o valor informado como inválido por uma falha de configuração e não abre opções adicionais que não resolvem essa falta. Cabeçalho oferece “Ver dados da Funpresp”; o rodapé informa “Funpresp em atualização”. Erros desconhecidos continuam sendo apresentados sem tradução especulativa.

Os campos foram simplificados para “Base de contribuição escolhida no plano” e “Mês e ano da inscrição ou alteração da base”, com explicação para não confundir base e desconto do contracheque. “Usar menor base permitida” exige clique explícito, referência válida e máximo elegível conhecido; altera apenas o valor e orienta a conferir se ele corresponde à adesão real. A tela não muda a inscrição ou retira a participação para liberar artificialmente o resultado.

Verificações desta rodada: 39 testes de formulário aprovados, incluindo os três novos cenários de feedback, preenchimento explícito e limites de atuação da tradução; TypeScript e build aprovados. A página `Calculator` completa foi usada no Chrome com transporte local substituído por dados sintéticos em memória, mantendo formulário, hook de resultados e motor reais. Sem tabela, os dados e bloqueios foram preservados; com a tabela candidata, o botão mínimo aplicou R$ 2.061,10 e a alíquota preservada de 22% gerou R$ 453,44 de contribuição. No viewport de 390px, a largura do documento foi 375px, sem transbordo horizontal; o viewport foi restaurado ao final. Capturas foram entregues como artefatos locais de homologação, fora do versionamento do projeto.

Limite operacional: o acesso a `/admin/power` na sessão disponível foi redirecionado a `/minha-area`; a rota exige usuário administrador. Uma tentativa somente de leitura pela conexão de banco configurada falhou com `ENOTFOUND`; não houve escrita remota. O cadastro de novembro ainda precisa ser aplicado com acesso administrativo válido e confirmação de impacto, conforme a seção 5.2 de `PROJECT_RULES.md`. Melhorar a mensagem não substitui essa aplicação. A migration candidata continua disponível e os snapshots históricos permanecem preservados.
