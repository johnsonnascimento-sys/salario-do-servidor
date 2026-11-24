# Diárias

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../PROJECT_RULES.md) para as regras comuns.

Quando a mudança afetar os dias elegíveis de diligência externa, consulte [Indenização de transporte](INDENIZACAO_DE_TRANSPORTE.md).

## Regras gerais

1. Em modo por datas, `data_fim >= data_inicio`.
2. Diarias devem aparecer separadas do bloco de holerite.
3. Adicional de embarque / deslocamento deve aparecer em linha propria com nomenclatura dinamica orientada pelo orgao (`embarkationLabel`).
4. Exibir total de diarias liquidas.
5. No PJU, os valores de diarias e adicionais sao data-driven e podem ser derivados percentualmente da diaria de Ministro do STF (Res. CNJ 73/2009) com regras e percentuais setoriais por ramo/orgao (Ato STM 799/2024, Res. CJF 340/2015, etc.).
6. No modo por datas, fins de semana sao deduzidos automaticamente por calendario, e feriados/pontos facultativos locais podem ser marcados interativamente pelo usuario para a viagem, evitando acoplamento a calendarios fixos de orgaos especificos.
7. Para servidores do PJU, disponibilizar opcao de viagem em assessoramento direto a magistrado com diaria a 80% do Ministro do STF (art. 6º, § 1º, da Res. CNJ 73/2009 c/c Res. CNJ 564/2024), mantendo a diaria comum no percentual regular do cargo/funcao (como CJ-4 a 60%).
8. Na JMU e na Justiça Federal, descontar das diárias o auxílio-transporte devido após a cota-parte, proporcionalmente aos dias de desconto e ao divisor configurado (art. 10, § 3º, do Ato Normativo STM nº 799/2024 e art. 9º da Resolução CJF nº 4/2008). Se o gasto informado for igual ou inferior à cota-parte em centavos, zerar o crédito e o débito do benefício. Quando configurado o meio desconto no retorno, o motor fornece seu valor ao detalhamento.

## Regras de Diárias no Poder Judiciário da União (PJU)

> As regras gerais acima e o item de assessoramento abaixo preservam duas formulações existentes para a referência de 80%. A divergência está registrada para conferência normativa.

1. A referência máxima de valor é a diária de Ministro do Supremo Tribunal Federal (STF), conforme Resolução CNJ Nº 73/2009 e normas setoriais.
2. Escalonamento na Justiça Federal (Resolução CJF nº 340/2015, art. 10). A calculadora usa os valores nacionais nominais da tabela ativa em `dailies_rules.tariff_versions`, independentemente da competência da folha. A Portaria CJF nº 315/2026 vigora desde 10/06/2026 e fixa o limite nacional de R$ 1.165,27.
   - Membro do CJF: 100% da diária de Ministro do STF (R$ 1.545,53).
   - Membro de TRF (Desembargador Federal): 95% da diária de Ministro do STF (R$ 1.468,25).
   - Juiz Federal ou Juiz Federal Substituto: 95% da diária do membro do TRF (R$ 1.394,84).
   - Analista Judiciário ou Cargo em Comissão (CJ-1 a CJ-4): 55% da diária de Ministro do STF (R$ 850,04).
   - Técnico Judiciário ou Função Comissionada (FC-1 a FC-6): 45% da diária de Ministro do STF (R$ 695,49).
   - Auxiliar Judiciário: equipara-se ao Técnico Judiciário (45%, conforme art. 10, § 7º).
3. Escalonamento no Superior Tribunal Militar (Ato Normativo STM Nº 799/2024):
   - Ministro do STM: 100% da diária de Ministro do STF (R$ 1.466,95).
   - Juiz Federal da JMU / Diretor-Geral e Secretário-Geral: 95% do Ministro do STM (R$ 1.393,60).
   - Demais Cargos em Comissão: 60% do Ministro do STM (R$ 880,17).
   - Analista Judiciário: 55% do Ministro do STM (R$ 806,82).
   - Técnico Judiciário: 45% do Ministro do STM (R$ 660,13).
4. Assessoramento direto ou segurança a magistrado (art. 6º, § 4º da Resolução CNJ Nº 73/2009, art. 10, § 3º da Resolução CJF Nº 340/2015 e art. 9º do Ato Normativo STM Nº 799/2024):
   - O servidor que se afastar em assistência direta a magistrado faz jus a diária correspondente a **80% do valor da diária atribuído à autoridade assistida**.
   - As opções de autoridades assistidas e suas fundamentações são estritamente segregadas por ramo judiciário:
     - **Na Justiça Militar da União (JMU / STM)**:
       - Ministro do STM (100% STF) -> 80% de R$ 1.466,95 = **R$ 1.173,56**.
       - Juiz Federal da JMU / Substituto (95% do STM) -> 80% de R$ 1.393,60 = **R$ 1.114,88**.
       - Não exibir opções da Justiça Federal (como Desembargador de TRF ou Membro do CJF).
     - **Na Justiça Federal (CJF e TRFs)**:
       - Desembargador Federal / Membro de TRF (95% STF) -> 80% de R$ 1.468,25 = **R$ 1.174,60**.
       - Juiz Federal / Substituto (95% do TRF) -> 80% de R$ 1.394,84 = **R$ 1.115,87**.
       - Ministro / Membro do CJF (100% STF) -> 80% de R$ 1.545,53 = **R$ 1.236,42**.
       - Não exibir opções da JMU (como Ministro do STM).
   - A opção não se aplica a magistrados em deslocamento institucional.
    - **Acompanhamento de autoridade em tempo integral e hospedagem no mesmo local** (art. 9º, § 1º do Ato Normativo STM Nº 799/2024 e art. 6º, § 5º da Resolução CNJ Nº 73/2009):
      - O servidor que prestar assistência com exigência de acompanhamento em tempo integral e hospedagem no mesmo local faz jus a diária correspondente a **90% do valor da diária atribuído à autoridade assistida**.
      - **Na Justiça Militar da União (JMU / STM)**:
        - Ministro do STM (100% STF) -> 90% de R$ 1.466,95 = **R$ 1.320,26**.
        - Juiz Federal da JMU / Substituto (95% do STM) -> 90% de R$ 1.393,60 = **R$ 1.254,24**.
      - **Na Justiça Federal (CJF e TRFs)**:
        - Desembargador Federal / Membro de TRF (95% STF) -> 90% de R$ 1.468,25 = **R$ 1.321,43**.
        - Juiz Federal / Substituto (95% do TRF) -> 90% de R$ 1.394,84 = **R$ 1.255,36**.
        - Ministro / Membro do CJF (100% STF) -> 90% de R$ 1.545,53 = **R$ 1.390,98**.
5. Adicional de Transporte / Embarque no PJU:
   - **Na Justiça Militar da União (JMU / STM - Ato Normativo STM Nº 799/2024, art. 8º):** Denominado "Adicional de embarque e desembarque", correspondente a 40% da diária de Ministro do STM para ida e volta (R$ 586,78) e 20% para ida ou volta (R$ 293,39).
   - **Na Justiça Federal (CJF e TRFs, Resolução CJF nº 340/2015, art. 17 e Anexo / art. 19):** O “Adicional de transporte” cobre as despesas de deslocamento até os locais de embarque e desembarque. O valor do percurso integral é o nominal da Portaria CJF nº 315/2026, **R$ 680,00**.
     - Conforme o Anexo da Res. CJF 340/2015 ("Uso de Veículo Oficial") e art. 17, § 2º, a viagem padrão é dividida em **4 trechos autônomos de 25% cada**:
       1. Afastamento: residência ou trabalho até o local de embarque (25%);
       2. Afastamento: local de desembarque até o trabalho ou hospedagem (25%);
       3. Retorno: trabalho ou hospedagem até o local de embarque (25%);
       4. Retorno: local de desembarque até a residência ou trabalho (25%).
     - O adicional não é devido nos trechos realizados com utilização de veículo oficial. A calculadora permite selecionar cada trecho sem veículo oficial e aplica a proporção correspondente sobre o valor nominal configurado.

6. Equipe de Trabalho no PJU (art. 8º do Ato Normativo STM Nº 799/2024, art. 10, § 1º da Resolução CJF Nº 340/2015 e art. 6º, § 2º da Resolução CNJ Nº 73/2009):
   - Os servidores que se afastarem em equipe de trabalho recebem diárias em valores equivalentes, correspondentes ao **maior valor da diária atribuído entre os servidores membros da equipe**.
   - **Na Justiça Militar da União (JMU / STM - art. 8º do Ato Normativo STM Nº 799/2024)**:
     - Se um Técnico Judiciário (45% STM = R$ 660,13) se deslocar em equipe com um Analista Judiciário (55% STM = R$ 806,82), recebe a diária de Analista (**R$ 806,82**).
     - Se o Técnico Judiciário se deslocar com um ocupante de Cargo em Comissão (CJ-1 a CJ-4, 60% STM = R$ 880,17), recebe a diária de CJ (**R$ 880,17**).
     - Se um Analista Judiciário se deslocar com ocupante de CJ, recebe a diária de CJ (**R$ 880,17**).
     - O servidor nunca recebe valor inferior ao do seu próprio cargo/função (`Math.max(regularRate, teamRate)`).
   - **Na Justiça Federal (CJF e TRFs - art. 10, § 1º da Resolução CJF Nº 340/2015 c/c art. 6º, § 2º da Resolução CNJ Nº 73/2009)**:
     - Se um Técnico Judiciário (R$ 695,49) se deslocar em equipe com um Analista Judiciário ou com um ocupante de Cargo em Comissão (CJ-1 a CJ-4), recebe a diária correspondente (**R$ 850,04**).
     - Se um Analista Judiciário se deslocar com ocupante de CJ, mantém a diária de 55% (**R$ 850,04**).
     - Se um Auxiliar Judiciário se deslocar com Técnico, recebe a diária de Técnico (**R$ 695,49**).
     - O servidor nunca recebe valor inferior ao do seu próprio cargo/função (`Math.max(regularRate, teamRate)`).
   - A opção não se aplica a magistrados em deslocamento institucional.
