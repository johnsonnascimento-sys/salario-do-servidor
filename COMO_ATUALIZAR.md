# Guia de Atualização Simplificado - Simulador JMU

Este documento explica como você pode fazer alterações futuras no projeto (ex: atualizar tabelas de salário em 2026).

## 1. Pré-requisitos
Certifique-se de ter o **Node.js** instalado no seu computador.

## 2. Como Rodar o Projeto (Para Testar)
1. Abra a pasta do projeto no Terminal (ou Prompt de Comando).
2. Digite: `npm run dev`
3. O terminal vai mostrar um link (ex: `http://localhost:5173`). Abra no navegador para ver o simulador funcionando.

## 3. Como Atualizar Valores (Salários, Tabelas)
A maioria dos valores que mudam com o tempo está no arquivo **`data.ts`**.

1. Abra o arquivo `data.ts` com um editor de texto (Bloco de Notas ou VS Code).
2. Procure pela parte que você quer mudar.
   - Exemplo: Para mudar o salário de Analista em 2026, procure por `BASES_2025`.
   - Exemplo: Para mudar a tabela de IR, procure por `HISTORICO_IR`.
3. Salve o arquivo. Se o comando `npm run dev` estiver rodando, a página no navegador vai atualizar sozinha!

## 4. Como Gerar a Versão Final (Para Usar/Divulgar)
Depois de fazer suas alterações e testar:
1. No terminal, digite: `npm run build`
2. Isso vai criar/atualizar uma pasta chamada **`dist`**.
3. Os arquivos dentro da pasta `dist` são o seu site pronto. Você pode abrir o `index.html` que está lá dentro para usar.

## 5. Como Salvar (Backup)
Como você não usa GitHub, a forma mais segura de salvar uma nova versão é:
1. Volte para a pasta principal.
2. Selecione todos os arquivos (exceto a pasta `node_modules`, que é muito pesada e recriável).
3. Clique com o botão direito -> "Enviar para" -> "Pasta Compactada (Zip)".
4. Dê um nome com a data, ex: `simulador_v2_jan2026.zip`.
5. Guarde esse arquivo em um local seguro (E-mail, Nuvem, Pendrive).

## 6. Como Atualizar no GitHub (Internet)
Se você criou o repositório no GitHub como sugerido, existem duas formas de atualizar:

### Para Pequenas Alterações (Ex: Mudar um salário)
1. Acesse seu repositório no site do GitHub.
2. Navegue até o arquivo (ex: `data.ts`).
3. Clique no ícone de lápis (✏️) "Edit this file".
4. Faça a alteração direto no navegador.
5. Role a página e clique em **"Commit changes"** (botão verde).
   * **Atenção:** Isso atualiza o código, mas não altera o site publicado automaticamente a menos que você tenha configurado CI/CD. Se não souber o que é isso, prefira o método abaixo.

### Para Grandes Atualizações (Do seu computador para o GitHub)
1. Faça as alterações no seu computador e teste.
2. Acesse a página principal do seu repositório no GitHub.
3. Clique em "Add file" -> "Upload files".
4. Arraste os arquivos alterados (ou a pasta do projeto) para a área de upload.
5. Aguarde carregar e clique em **"Commit changes"**.
   * Isso vai substituir os arquivos antigos pelos novos.

## 7. Como colocar no ar com Vercel (Automático)
Vercel é um site que coloca seu projeto na internet de graça. Se você já tem o código no GitHub, é muito fácil:

1. Acesse [vercel.com](https://vercel.com) e crie uma conta (pode usar a conta do GitHub para entrar).
2. No painel (Dashboard), clique em **"Add New..."** -> **"Project"**.
3. Na lista "Import Git Repository", procure pelo seu projeto (ex: `simulador-jmu`) e clique em **"Import"**.
4. Nas configurações que aparecerem:
   - **Framework Preset:** O Vercel geralmente detecta **Vite** automaticamente. Se não, selecione `Vite`.
   - **Root Directory:** Deixe como está `./`.
   - **Build Command:** `npm run build` (padrão).
   - **Output Directory:** `dist` (padrão).
5. Clique em **"Deploy"**.

Pronto! Em instantes a Vercel vai gerar um link (ex: `simulador-jmu.vercel.app`) para você acessar e compartilhar.
**Vantagem:** Toda vez que você atualizar algo no GitHub (passo 6), a Vercel atualiza o site sozinha! 🚀
