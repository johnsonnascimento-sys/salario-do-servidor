# Planejamento de Arquitetura: Projeto Salário do Servidor

## 1. Visão Geral
Transformar a calculadora monolítica da JMU em uma plataforma SaaS modular para múltiplos órgãos (Executivo, Legislativo, Judiciário).

## 2. Ambientes e Segurança
* **Ambientes:** `DEV` (salario-do-servidor-dev) e `PROD` (johnsonnascimento-sys).
* **Credenciais:** Exclusivamente via variáveis de ambiente (`.env`).

## 3. Estratégia de Dados (Database)
* **Tabelas Legadas:** Regras antigas serão descontinuadas.
* **Tabelas Preservadas:** `pix`, `users`.
* **Novas Tabelas:** Serão criadas tabelas relacionais (`agencies`, `salary_tables`) para suportar a configuração dinâmica.

## 4. Hierarquia de Lógica
1.  **Global (Regras Unificadas):** Regras federais que se aplicam a todos os servidores, com tabelas atualizáveis periodicamente (IRRF, Teto INSS/PSS).
2.  **Cluster:** Regras compartilhadas por Poder (ex: Benefícios do Judiciário).
3.  **Agency:** Regras locais específicas (ex: Rubricas exclusivas da JMU).

## 5. Estratégia de Expansão (Como criar novos órgãos?)
O sistema suportará dois métodos de adição de órgãos:
* **Método A (Configuração/Banco):** Para órgãos padronizados (ex: Executivo Federal).
    * *Como:* Cadastro via Painel de Controle. O sistema usa um "GenericExecutiveService" e carrega as tabelas salariais do banco de dados.
    * *Uso de código:* Zero.
* **Método B (Adapter/Código):** Para órgãos com regras complexas e únicas (ex: JMU, Câmara).
    * *Como:* Criação de um novo arquivo (ex: `CamaraService.ts`) que estende a classe base e implementa a lógica específica.
    * *Uso de código:* Necessário para definir a lógica da exceção.

## 6. Roadmap de Implementação
* **Fase 1:** Interfaces `IAgencyCalculator` e estrutura de pastas.
* **Fase 2:** Extração de cálculos puros (IRRF/INSS) para `src/core`.
* **Fase 3:** Criação do `JmuService` (Adapter) isolando a lógica atual.
* **Fase 4:** Conexão do Frontend ao novo Service.
* **Fase 5:** Modelagem do Novo Banco de Dados.
* **Fase 6:** Refatoração do Painel de Controle (Admin).
