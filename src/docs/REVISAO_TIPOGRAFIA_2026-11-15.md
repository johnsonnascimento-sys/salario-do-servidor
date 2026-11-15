# Revisão visual da tipografia — 15/11/2026

## Ambiente e escopo

Conferência no Chrome da calculadora JMU local, com configuração hierárquica remota real e dados de simulação fictícios. A chave pública de `.env.local` retornou HTTP 401 (Invalid API key); a configuração pública já existente em `.env.production.local` retornou HTTP 200. A conferência usou `npx vite --mode production --host 127.0.0.1`, sem alterar credenciais nem escrever no banco.

Foram adicionadas as 15 opções do catálogo (13 cards, VPNI e ATS), além de crédito e desconto livres. Conferidos painéis de composição, resumos, opções tributárias e descrições longas; campos de datas e assessoramento de diárias também foram abertos. Não constitui cobertura de todas as combinações funcionais ou homologação dos cálculos.

## Constatações e correções

- Salário Base, GAJ e Auxílio Alimentação: estilos computados idênticos, Plus Jakarta Sans, 14 px, peso 600.
- Filtros e ações dos lançamentos, contadores do catálogo e cabeçalho de detalhamento permitem quebra em telas estreitas.
- As composições mostram nomes completos das verbas, sem reticências; opções com valor permitem quebra de linha.
- Cabeçalho compacto reorganizado para evitar sobreposição entre marca, tema e ações; botão de tema recebe nome acessível. Layout compacto também atende tablets.
- E-mail no rodapé quebra linha para não causar rolagem horizontal em 1024 px.
- Último ajuste permite quebra também nos totais internos, resumos calculados, seletor percentual/fixo da pensão e detalhes dos descontos.

## Verificação realizada e limite

Matriz visual/DOM em 320, 390, 768, 1024 e 1280 px, nos temas claro e escuro. Antes do último ajuste: nenhum corte detectado nos elementos de texto medidos; largura do documento igual à disponível em 390/768/1024/1280 px, e diferença residual de 1 px em 320 px. A inspeção adicional dos contêineres em 320 px encontrou transbordamentos internos nos totais/resumos, corrigidos no último ajuste.

Zoom real de 200% confirmado no Chrome: `devicePixelRatio` passou de 1 para 2 e a largura CSS de 1272 para 636 px. Nos painéis então abertos não houve cortes detectados; largura disponível e documento de 628 px nos dois temas. Zoom restaurado para 100% após essa conferência.

**A repetição visual final após o último ajuste ficou pendente:** a ferramenta reiniciou durante a medição e passou a recusar acesso à interface do Windows (GetCursorPos: acesso negado). Foi solicitado ao usuário desbloquear a tela, se aplicável. Não declarar a revisão visual integralmente concluída antes dessa repetição. Uma eventual largura de emulação residual também deve ser removida quando a interface voltar.

Typecheck, compilação Vite e suítes existentes de carregamento (5 testes) e configuração (9 testes) aprovados após o último ajuste. A compilação manteve avisos de bundle/importação e Browserslist. Nenhum teste novo foi criado para estas alterações de apresentação.
