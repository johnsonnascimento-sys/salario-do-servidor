# Manual do Painel Administrativo

Este manual descreve como operar o painel administrativo atual do sistema.

## 1. Acesso ao painel

1. Acesse `https://www.salariodoservidor.com.br/admin`.
2. Faça login com conta que esteja na allowlist de administradores.
3. Após autenticar, o sistema abre o Hub em `/admin/hub`.

## 2. Estrutura do Hub (`/admin/hub`)

O Hub possui 4 áreas:

1. `Regras Globais`
2. `Regras por Poder`
3. `Órgãos`
4. `Usuários`

O card de diagnóstico rápido foi removido do Hub.

## 3. Regras Globais (`/admin/global`)

Uso:

1. Visualize os registros da tabela `global_config`.
2. Clique em `Editar` na linha desejada.
3. Ajuste o JSON no editor.
4. Clique em `Salvar`.
5. Confirme o alerta de impacto imediato.

Campos principais do registro:

1. `config_key`
2. `config_value` (JSON)
3. `valid_from`
4. `valid_to`

Observações:

1. O editor exige JSON válido em formato de objeto.
2. Alterações entram em vigor imediatamente após salvar.

## 4. Regras por Poder (`/admin/power`)

Uso:

1. Selecione o poder no filtro (ou deixe `Todos os poderes`).
2. Clique em `Editar` na configuração desejada.
3. Ajuste o JSON.
4. Clique em `Salvar`.
5. Confirme o alerta de impacto imediato.

Campos principais:

1. `power_name`
2. `config_key`
3. `config_value` (JSON)
4. `valid_from`
5. `valid_to`

## 5. Órgãos (`/admin/org`)

Uso:

1. Pesquise pelo `slug` ou nome do órgão.
2. Clique em `Editar`.
3. Ajuste `configuration` (JSON de override local).
4. Clique em `Salvar`.
5. Confirme o alerta de impacto imediato.

Campos principais:

1. `org_slug`
2. `org_name`
3. `power_name`
4. `configuration` (JSON)

## 6. Usuários (`/admin/users`)

A página possui 3 abas.

### 6.1 Contas do sistema

Operações:

1. Editar `Nome`, `Email`, `CPF`.
2. Marcar/desmarcar `Beta habilitado`.
3. Marcar/desmarcar `Allowlist de cadastro habilitada`.
4. `Salvar` alterações.
5. `Resetar senha` (envia link por email).
6. `Excluir conta` (remove usuário de autenticação).

### 6.2 Allowlist de cadastro

Objetivo:

1. Gerenciar quem pode se cadastrar durante beta fechado.

Operações:

1. Inserir `Nome completo`, `CPF`, `Email`, `Notas`.
2. Clicar em `Salvar`.
3. Visualizar lista atual de entradas e status.

### 6.3 Allowlist admin

Objetivo:

1. Definir quem pode acessar `/admin*`.

Operações:

1. Inserir email administrativo.
2. Definir status (`Habilitado` ou `Desabilitado`).
3. Salvar.
4. Remover email existente.

## 7. Regras de segurança e governança

1. Apenas usuários admins podem escrever configurações.
2. Alterações de configuração afetam cálculos imediatamente.
3. Tabelas sensíveis de allowlist são acessadas via RPC segura.
4. Evite editar produção sem validação prévia do impacto.

## 8. Boas práticas operacionais

1. Antes de alterar, registre o motivo da mudança.
2. Altere um bloco por vez.
3. Prefira mudanças pequenas e rastreáveis.
4. Após salvar, valide no simulador do órgão/poder afetado.
5. Para alterações críticas, documente no `CHANGELOG.md`.

## 9. Limitações atuais do painel novo

1. Não há botão `Nova versão` na UI atual.
2. O fluxo principal é edição do registro existente.
3. Se você precisar versionamento por vigência via interface, isso deve ser implementado no painel novo.

## 10. Solução de problemas

1. `Acesso negado no /admin`:
   - Verifique se o email está na allowlist admin.
2. `Erro ao salvar JSON`:
   - Revise vírgulas, aspas e estrutura de objeto.
3. `Link de reset indo para domínio errado`:
   - Verifique `Site URL` e `Redirect URLs` no Supabase Auth.
   - Gere novo email de recuperação após correção.
