# IR-EA / RRA

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

### 4.9 Imposto de Renda de Exercícios Anteriores (IR-EA / RRA)

1. Apuração progressiva acumulada por competências distintas conforme o art. 12-A da Lei nº 7.713/1988 e Instrução Normativa RFB nº 1.500/2014.
2. O número de meses ($NM$) corresponde à quantidade de competências distintas informadas entre todos os créditos em EA da folha; competências repetidas entre rubricas distintas decorrem do mesmo período e não duplicam $NM$. Informação documental explícita de $NM$ prevalece.
3. A tabela progressiva mensal tem suas faixas e deduções escalonadas pela multiplicação direta por $NM$.
4. A redução do imposto introduzida para o ano-calendário de 2026 (Lei nº 9.250/1995, art. 3º-A incluído pela Lei nº 15.270/2025 c/c Anexo X da IN RFB nº 1.500/2014) incide sobre o montante consolidado de rendimentos tributáveis recebidos no mês do pagamento, sem multiplicação das faixas nominais do redutor por $NM$ nem divisão por média mensal.
5. O imposto apurado de RRA é rateado entre as entradas em EA pelo método dos maiores restos (Hare-Niemeyer), preservando a exatidão em centavos. Descontos dedutíveis abatem a base sem diminuir o denominador dos créditos no rateio.
6. Quando o servidor informar dependentes de IR no cabeçalho da folha, a dedução legal correspondente é vinculada e aplicada por padrão na apuração do IR-EA (RRA), com controle reativo por checkbox para permitir desmarcar caso a fonte pagadora não tenha abatido dependentes na origem, eliminando a exigência de cálculo manual ou lançamento burocrático de ajustes documentados para dependentes já cadastrados.
