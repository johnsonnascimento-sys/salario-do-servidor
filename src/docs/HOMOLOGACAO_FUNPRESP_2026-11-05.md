# Homologação Funpresp — 05/11/2026

Projeto indicado pelo usuário: `salario_do_servidor` (`govzmfpwrbsmqgzjtfmt`). Código base das três etapas: commit `fd0dda0`, branch `codex/funpresp-etapa3`. Esta operação acrescenta verificadores e evidências, sem alterar regras do motor.

## Procedimento e resultado

1. Obtido snapshot somente de `global_config` ativo, `power_config` do PJU e `org_config` da JMU, por consulta somente leitura. Sem usuários, credenciais ou holerites. Arquivos de snapshot ficaram em diretório temporário externo ao repositório.
2. Importado snapshot em PostgreSQL embarcado descartável e aplicada a migration existente. Conferidos versionamento, preservação de JSONs, outras chaves, global/órgão e idempotência.
3. Executados `ConfigService`, mapper, `DynamicPayrollForm`, hook de resultados e motor reais, com transporte de leitura para o PostgreSQL local. Casos aprovados: patrocinado; não participante; vinculado com remuneração eleita; opção facultativa preenchida pelos controles do formulário; exclusão; retroativo patrocinado para servidor atualmente não participante; restauração; retorno à pendência ao remover vínculos. Conferidos totais compartilhados, soma de créditos menos débitos e protocolo na auditoria.
4. Usuário confirmou expressamente: **“Aplicar a migração nesse projeto agora”**, após receber o impacto de vigências. Aplicada `supabase/migrations/20261105_pju_pension_catalog.sql` no projeto indicado, com transação da própria migration.
5. Verificação posterior pelo cliente público Supabase, sem privilégios administrativos: registros anteriores preservados, com única mudança no encerramento da versão previdenciária ativa de 19/10/2026 em 04/11/2026, e inserção de uma versão ativa em 05/11/2026. Global, órgão e demais chaves do poder coincidem com o snapshot. Timestamps de metadados foram normalizados ao comparar os fusos das duas APIs; JSONs de configuração foram comparados integralmente.
6. Configuração efetiva pública da JMU contém os 10 enquadramentos e a regra histórica revisada, sem override divergente de órgão. Repetidos os cenários de formulário e motor usando essa configuração pública: aprovados.
7. Suíte `test:pension-stage3`: **48 testes aprovados, zero skips**, incluindo oito testes de PostgreSQL. `typecheck`: aprovado.

## Reprodução

O snapshot esperado é um objeto JSON com arrays `global_config`, `power_config` e `org_config`, contendo registros das respectivas tabelas. Usar somente configurações, nunca dados de usuários. Não versionar snapshots nem credenciais.

```powershell
# Caminhos absolutos para arquivos/módulo locais, fornecidos pelo operador.
$env:PENSION_CONFIG_SNAPSHOT = 'CAMINHO_DO_SNAPSHOT_DE_CONFIGURACAO.json'
$env:PENSION_PGLITE_MODULE = 'CAMINHO_DO_MODULO_PGLITE/index.cjs'
npm run test:pension-homologation

# Leitura pública do projeto revisado; não aplica migração.
$env:PENSION_TARGET_PROJECT = 'govzmfpwrbsmqgzjtfmt'
$env:VITE_SUPABASE_URL = 'https://govzmfpwrbsmqgzjtfmt.supabase.co'
# VITE_SUPABASE_ANON_KEY deve ser fornecida no ambiente, apenas anon/publishable.
npm run validate:pension-homologation
```

O verificador remoto opcionalmente compara com `PENSION_CONFIG_SNAPSHOT`, que deve representar o estado imediatamente anterior à aplicação. Essa comparação espera exatamente uma versão adicional. Para repetir apenas os cenários após futuras versões, retirar essa variável e revisar a comparação com o seed correspondente. O verificador local exige snapshot e PGlite; não ignora silenciosamente a ausência desses insumos.

## Limites e próximo passo

- O formulário foi montado em React Test Renderer, com eventos dos controles e efeitos reais; não houve inspeção visual em navegador.
- A leitura pública confirma disponibilidade da configuração, não certifica autenticação, políticas de escrita, cadastro ou persistência de holerites de usuários reais.
- Os testes anteriores de PDF/XLSX e de bloqueio de salvar/exportar continuam sendo evidência automatizada separada; não foi criado um holerite de usuário remoto nesta operação.
- A URL de publicação registrada em `scripts/DEPLOY.md` não respondeu à tentativa de consulta. O funcionamento do site publicado não foi validado.
- Não houve push, deploy nem alteração do código publicado. A nova configuração no banco não publica os novos componentes da calculadora.
- A cobertura normativa permanece a da etapa 3: catálogo de 2026, histórico abril–dezembro/2026 e verbas não comprovadas pendentes.

Próximo passo operacional: preparar a publicação do código validado e concluir a conferência visual e do fluxo autenticado no ambiente acessível. Não declarar homologação integral do site com base apenas nestas verificações.
