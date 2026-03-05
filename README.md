# Simulador de Salario do Servidor

Calculadora web para simulacao de holerite com regras da JMU e componentes parametrizados por configuracao.

## Quick Start

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
npm run preview
```

## Funcionalidades

- Formulario dinamico de rubricas obrigatorias e pre-definidas.
- Area logada de usuario (`/acesso`, `/minha-area`) com CRUD de holerites salvos.
- Cadastro em beta fechado por allowlist (`cpf + email`).
- Rubricas manuais com incidencias de base:
  - IR
  - IR (EA)
  - PSS
  - PSS (EA)
- Resumo calculado por card em accordion.
- Detalhamento final separado em:
  - Holerite (sem diarias)
  - Diarias (pagamento separado)
- Exportacao para PDF e Excel.

## Arquitetura (alto nivel)

- UI React/Tailwind em `src/components`.
- Orquestracao via hooks em `src/hooks`.
- Motor de calculo por agencia em `src/services/agency`.
- Regras de negocio data-driven via configuracao (`courtConfig`/`payrollRules`/`dailies`).
- Supabase Auth + tabelas de usuario (`user_profiles`, `user_payslips`, `signup_allowlist`).

## Autenticacao e acesso

- Usuario final:
  - Login/cadastro em `/acesso`.
  - Area logada em `/minha-area`.
  - Holerites salvos em `/minha-area/holerites`.
- Admin:
  - Login administrativo em `/login`.
  - Rotas `/admin*` protegidas por allowlist de emails admin.
- Seguranca:
  - RLS por `auth.uid()` nas tabelas de perfil/holerites.
  - Cadastro liberado apenas para registros da `signup_allowlist` enquanto o beta estiver fechado.

## Regras importantes

- Nao hardcodar aliquotas legais na UI.
- Motor de calculo oficial centralizado no service da agencia.
- Para diarias por data:
  - `data fim >= data inicio` obrigatorio.
- Gatilho `Johnson*` e intencional.

## Documentacao

- [Regras do projeto (fonte canonica)](./PROJECT_RULES.md)
- [Guia para agentes](./AGENTS.md)
- [Historico de mudancas](./CHANGELOG.md)
- [Formulas legadas (referencia)](./src/docs/LEGACY_FORMULAS.md)

## Scripts uteis

- `npm run dev`: ambiente local.
- `npm run build`: build de producao.
- `npm run preview`: sobe build local para validacao.
- `npm run audit`: auditoria geral do projeto.
- `npm run audit:design`: auditoria de design system.
