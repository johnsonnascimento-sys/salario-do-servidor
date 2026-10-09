# Deploy na VPS

O domínio permanece na hospedagem atual. Este procedimento publica somente o serviço
`salario-do-servidor` em `http://76.13.229.118:8092`.

## Configuração

- Python com `paramiko`, Node/npm e Git locais; VPS com Node/npm, Docker e systemd.
- Na VPS, `/opt/salario-do-servidor/shared/production.env` (modo 600) contém
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` públicas válidas, gerenciadas fora do Git.
  Nunca incluir `service_role`, senhas, token de sessão ou `DATABASE_URL` em variáveis `VITE_`.
- A instalação existente usa o container `salario-do-servidor`, a pasta `dist` e
  `/opt/salario-do-servidor/nginx/default.conf`. Os demais serviços não são alterados.
- Para validar localmente, copie apenas as variáveis públicas para `.env.production.local`
  (ignorado pelo Git) e execute `npm run validate:deploy`.

## Publicação e reversão

Execute `python scripts/deploy-vps.py --host 76.13.229.118`. A senha é solicitada por
`getpass` ou recebida pela variável `DEPLOY_SSH_PASSWORD`, sem gravação em arquivos.
O SSH verifica a chave conhecida do servidor; `--trust-new-host` autoriza explicitamente
a primeira conexão quando a chave ainda não está em `known_hosts`.

1. O script envia somente código, assets e testes, sem arquivos `.env`, e prepara uma release
   identificada pelo SHA-256 do arquivo enviado. Instala pelo lockfile, executa testes,
   TypeScript, consulta a configuração efetiva pela chave pública e realiza um cálculo.
2. O candidato roda em Docker ligado ao loopback da VPS, com túnel SSH em
   `http://127.0.0.1:8093`. Confira no navegador: formulário e valores, login,
   listagem/reabertura de holerite, PDF/Excel e ausência de erros no console.
   Não salve ou exclua holerites reais. Somente após aprovação digite `promote`.
3. Antes da troca, o script preserva backup e arma um watchdog de 5 minutos no servidor.
   Publica os assets, reinicia apenas o container deste aplicativo e verifica novamente
   configuração, impressão digital da release, página e JS/CSS.
4. Confira a versão pública no navegador e digite `finalize` dentro dos 5 minutos.
   A finalização cancela a reversão e mantém o backup. Qualquer falha, encerramento sem
   finalização ou perda de sessão causa reversão; o watchdog permanece ativo se o cliente cair.

O script exige validação no navegador nas duas etapas: resposta HTTP 200 não aprova a release.
Na conferência de 09/10/2026, o navegador integrado concluiu PDF/Excel pelo túnel local,
mas não concluiu os downloads pelo IP HTTP, tanto na versão nova quanto na anterior.
Essa limitação deve ser registrada separadamente da regressão do aplicativo; não contornar
avisos de segurança. O domínio HTTPS permanece na hospedagem atual, fora deste deploy.
`version.json` inclui commit de origem, indicação de alterações locais e `sourceHash` para
distinguir builds a partir de mudanças ainda não commitadas. O candidato e túnel são removidos
ao terminar. Para reversão posterior, execute o `rollback.sh` da release somente após criar
novamente seu marcador `pending-<release>`; ele restaura o backup e reinicia o container.

## Critérios de aceitação

- `npm run test:payslip`, `npm run test:loading`, `npm run typecheck`, `npm run build` passam.
- Sem `agencyConfig is required` durante carga lenta ou reabertura.
- Salvar, PDF e Excel desativados enquanto o cálculo está pendente ou indisponível.
- Novembro preserva os campos e líquido de R$ 14.170,85 com a configuração da fixture.
- Chave inválida, configuração ausente e cálculo inválido impedem a promoção.
- Resultado anterior não aparece como atualizado ao mudar uma entrada.

Validação realizada: 23 testes aprovados, TypeScript/build/preflight aprovados,
chave inválida e chave ausente rejeitadas; login, 15 holerites e novembro conferidos.
PDF/Excel baixados pelo candidato e conteúdo do líquido conferido nos dois arquivos.
Reversão por reprovação final exercitada e metadados da versão anterior restaurados.
