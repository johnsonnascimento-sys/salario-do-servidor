# Regularização do cadastro CJF — 06/11/2026

## Problema e escopo

A consulta administrativa confirmou ausência de `org_config.cjf` no projeto
`govzmfpwrbsmqgzjtfmt`, também observado pelo cliente público do site. A versão
publicada `5114567` mantinha o simulador operante através de um fallback.

A correção cadastra somente `cjf`, preservando exatamente o merge efetivo
`global < PJU < fallback CJF`. O cadastro contém apenas diferenças do CJF
em relação à configuração herdada. Não há alteração do motor ou revisão
normativa dos parâmetros já publicados.

Criar um registro vazio ou executar a migration 014 isoladamente mudaria
parâmetros: PJU tem divisor de HE 175 e VR 6,5%, enquanto o fallback CJF
aplica 200 e 5%. A 014 também não contém todos os ajustes posteriores de
diárias e atualiza outros órgãos. Por isso ela não é utilizada nesta correção.

## Procedimento administrativo

O usuário autorizou a correção neste chat. O fluxo de manutenção usa a conexão
administrativa já configurada em `DATABASE_URL`, exclusivamente no mesmo
projeto da configuração pública de produção. A sessão de usuário final do
navegador não possui autorização para `/admin/org`; não se alteram allowlists
ou permissões para contornar isso.

O impacto confirmado é a substituição da origem dos overrides do CJF pelo
banco, com **igualdade integral dos parâmetros e resultados atuais**. A
revisão especializada de regras aprovou a migração e a estratégia de preservação.

O script lê o diretório indicado em `--env-dir`; nunca imprime credenciais.
A CA oficial deve ser obtida em Database Settings do Supabase ou no endereço
oficial de distribuição abaixo e informada em `--ca`:

`https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`

Fingerprint SHA-256 verificada nesta execução:
`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.
O cliente exige validação do certificado e hostname, sem modificar proteções do servidor.

```powershell
# Somente leitura; --env-dir aponta para a configuração local autorizada.
node.exe scripts/repair-cjf-config.mjs --env-dir ../salario-do-servidor --ca .cjf-ca.crt.local
# Ensaio da migração real; todas as alterações são revertidas.
node.exe scripts/repair-cjf-config.mjs --env-dir ../salario-do-servidor --ca .cjf-ca.crt.local --rehearse
# Aplicação administrativa do impacto autorizado; valida antes de COMMIT.
node.exe scripts/repair-cjf-config.mjs --env-dir ../salario-do-servidor --ca .cjf-ca.crt.local --apply
```

A migração `supabase/migrations/20261106_register_cjf_config.sql` recusa
sobrescrever um cadastro divergente ou aplicar após mudança nas regras PJU
usadas para preparar o override. Tabelas de configuração são bloqueadas
brevemente na transação. Uma segunda execução é um no-op, inclusive timestamps.
O arquivo `cjf-config-backup.json.local`, ignorado pelo Git, preserva o estado
anterior das tabelas de configuração, sem credenciais ou holerites.

## Validação anterior à aplicação

- Ensaio transacional no projeto de produção com rollback: aprovado.
- Configuração efetiva completa antes/depois: idêntica.
- Demais órgãos e todas as linhas de global/PJU: preservados.
- Segunda execução da migração: nenhuma alteração.
- Motor oficial: 66 cenários com resultados completos idênticos, cobrindo
  cargos/padrões, funções, AQ, HE, diárias comuns/assistência/acompanhamento/
  equipe, 0–4 trechos, glosas e rubricas manuais.
- Suítes existentes: ConfigService (8), diárias PJU (16), HE federal (4),
  total de 28 testes aprovados. Mensagens de erro/fallback nessas suítes são
  provocadas deliberadamente por mocks de falhas/ausência de cadastro.
- TypeScript: aprovado.

## Estado da aplicação

Preparada e ensaiada; o resultado da aplicação e da conferência pública será
registrado após sua execução. Não exige deploy do frontend.

## Reversão

Não executar migrations antigas para reverter. Se necessário, a remoção
administrativa somente do registro criado nesta tarefa restaura o fallback
da versão `5114567`. Confirmar primeiro que o cadastro não foi posteriormente
editado e comparar com a migração/backup; não excluir registros divergentes.
