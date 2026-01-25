# Estrutura do Banco de Dados

Este documento detalha a estrutura do banco de dados do projeto **Salário do Servidor**, hospedado no Supabase. O sistema utiliza uma arquitetura "Data-Driven" para gerenciar regras de negócio complexas e históricas (2024, 2025, 2026+) sem necessidade de redeploys constantes.

## Visão Geral

- **Banco de Dados**: PostgreSQL (via Supabase)
- **Arquitetura**: Configuração Hierárquica (Global -> Poder -> Órgão)
- **Segurança**: Row Level Security (RLS) Ativo

## Diagrama Relacional (ERD)

```mermaid
erDiagram
    global_config {
        uuid id PK
        text config_key UK "Ex: pss_tables, ir_deduction"
        jsonb config_value "Conteúdo da regra"
        date valid_from UK "Início da vigência"
        date valid_to "Fim da vigência (nullable)"
    }

    power_config {
        uuid id PK
        text power_name UK "Ex: PJU, Executivo"
        text config_key UK "Ex: salary_bases"
        jsonb config_value "Conteúdo da regra"
        date valid_from UK
        date valid_to
    }

    org_config {
        uuid id PK
        text org_slug UK "Ex: jmu, stm"
        text org_name
        text power_name "Link lógico para power_config"
        jsonb configuration "Overrides específicos do órgão"
    }

    courts {
        uuid id PK
        text slug UK
        text name
        jsonb config "Configuração monolítica (Legado)"
        boolean visible
    }

    %% Relacionamentos Lógicos (soft links via texto)
    org_config }|--|| power_config : "referencia power_name"
```

## Detalhamento das Tabelas

### 1. `global_config`
Configurações federais aplicáveis a todos os servidores, independentemente do órgão.
* **Finalidade**: Centralizar tabelas de impostos (IR, PSS) e deduções legais.
* **Colunas Importantes**:
    * `config_key`: Identificador da regra (ex: `pss_tables`).
    * `config_value`: JSON contendo a estrutura de dados (ex: faixas de alíquotas).
    * `valid_from`: Permite versionamento temporal (ex: tabela vigente a partir de Jan/2026).

### 2. `power_config`
Configurações específicas de um "Poder" ou carreira macro.
* **Finalidade**: Definir bases salariais, benefícios e gratificações comuns a uma carreira (ex: Analistas do PJU).
* **Colunas Importantes**:
    * `power_name`: Agrupador (ex: `PJU`).
    * `config_key`: Identificador (ex: `salary_bases` para vencimentos básicos).

### 3. `org_config`
Cadastro dos órgãos disponíveis no simulador.
* **Finalidade**: Listar os órgãos (Tribunais) e vincular ao seu Poder regulador.
* **Colunas Importantes**:
    * `org_slug`: Identificador na URL (ex: `/simulador/jmu`).
    * `power_name`: Define de onde herdar as bases salariais (ex: `PJU`).
    * `configuration`: Campo JSON para regras exclusivas do órgão que fogem ao padrão do Poder.

### 4. `courts` (Legado / Fallback)
Tabela original do sistema.
* **Status**: Mantida para retrocompatibilidade. O sistema novo lê `org_config` e converte para o formato esperado pela UI, mas esta tabela ainda existe no banco.

## Políticas de Acesso (RLS)

O banco de dados utiliza **Row Level Security** para controlar acesso:

| Tabela | Operação | Permissão | Público Alvo |
| :--- | :--- | :--- | :--- |
| `*_config` | SELECT | **Pública** | Todos (Simulador Publico) |
| `*_config` | INSERT/UPDATE | **Restrito** | Apenas Admin / Service Role (No ambiente de Dev, pode estar liberado para Anon) |

## Estrutura dos JSONs (Exemplos)

### Tabela de PSS (`global_config`)
```json
{
  "2026": {
    "ceiling": 8475.55,
    "rates": [
      { "min": 0, "max": 1621.00, "rate": 0.075 },
      { "min": 1621.01, "max": 2902.84, "rate": 0.090 }
      // ...
    ]
  }
}
```

### Bases Salariais (`power_config`)
```json
{
  "analista": {
    "C13": 9292.14,
    "A1": 6188.61
  },
  "funcoes": {
    "fc1": 1215.34,
    "cj3": 10029.94
  }
}
```
