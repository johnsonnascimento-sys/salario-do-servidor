import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_STATE, CalculatorState, Rubrica } from './types';
import { calculateAll, formatCurrency, getTablesForPeriod, calculateBaseFixa } from './utils/calculationService';
import { Card, SectionTitle } from './components/Card';
import { Input, Select } from './components/Inputs';
import { DollarSign, Clock, Scissors, Settings, FileText, Table, Calendar, Calculator, Moon, Sun, Plus, Trash2 } from 'lucide-react';
import { BASES_2025 } from './data';

// Declare standard libs for export logic
declare const jspdf: any;
declare const XLSX: any;

export default function App() {
  const [state, setState] = useState<CalculatorState>(INITIAL_STATE);

  // Recalculate whenever inputs change
  useEffect(() => {
    setState(prev => calculateAll(prev));
  }, [
    state.periodo, state.cargo, state.padrao, state.funcao,
    state.aqTituloPerc, state.aqTreinoPerc, state.aqTituloVR, state.aqTreinoVR,
    state.recebeAbono, state.gratEspecificaTipo, state.heQtd50, state.heQtd100,
    state.heIsEA, state.manualBaseHE, state.heBase,
    state.substDias, state.substIsEA,
    state.licencaDias, state.baseLicenca, state.incluirAbonoLicenca,
    state.auxPreEscolarQtd, state.auxTransporteGasto,
    state.dependentes, state.regimePrev, state.funprespAliq, state.funprespFacul,
    state.pssSobreFC, state.pssSobreAQTreino,
    state.emprestimos, state.planoSaude, state.pensao,
    state.vpni_lei, state.vpni_decisao, state.ats,
    state.ferias1_3, state.feriasAntecipadas, state.manualFerias,
    state.adiant13Venc, state.adiant13FC, state.manualAdiant13,
    state.incidirPSSGrat
  ]);

  const update = (field: keyof CalculatorState, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const updateSubstDays = (key: string, days: number) => {
    setState(prev => ({
      ...prev,
      substDias: { ...prev.substDias, [key]: days }
    }));
  };

  const setToday = () => {
    const now = new Date();
    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    setState(prev => ({
      ...prev,
      mesRef: months[now.getMonth()],
      anoRef: now.getFullYear()
    }));
  };

  const handleCalcFerias = () => {
    const tables = getTablesForPeriod(state.periodo);
    const { totalComFC } = calculateBaseFixa(state, tables.funcoes, tables.salario, tables.valorVR);
    update('ferias1_3', totalComFC / 3);
  };

  const handleCalc13Manual = () => {
    const tables = getTablesForPeriod(state.periodo);
    const { baseSemFC, funcaoValor } = calculateBaseFixa(state, tables.funcoes, tables.salario, tables.valorVR);

    setState(prev => ({
      ...prev,
      adiant13Venc: baseSemFC / 2,
      adiant13FC: funcaoValor / 2,
      manualAdiant13: true
    }));
  };

  const handleClearValues = () => {
    update('ferias1_3', 0);
    update('adiant13Venc', 0);
    update('adiant13FC', 0);
    // Force manual to true to prevent auto-recalc overriding zero immediately if month is Jan/Jun/Nov
    update('manualAdiant13', true);
    update('manualFerias', true);
  };

  const addRubrica = () => {
    const newRubrica: Rubrica = {
      id: Math.random().toString(36).substr(2, 9),
      descricao: '',
      valor: 0,
      tipo: 'C'
    };
    setState(prev => ({
      ...prev,
      rubricasExtras: [...prev.rubricasExtras, newRubrica]
    }));
  };

  const removeRubrica = (id: string) => {
    setState(prev => ({
      ...prev,
      rubricasExtras: prev.rubricasExtras.filter(r => r.id !== id)
    }));
  };

  const updateRubrica = (id: string, field: keyof Rubrica, value: any) => {
    setState(prev => ({
      ...prev,
      rubricasExtras: prev.rubricasExtras.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  // --- Lógica Centralizada de Linhas de Resultado ---
  const resultRows = useMemo(() => {
    const rows: Array<{ label: string; value: number; type: 'C' | 'D' }> = [];
    const isNovoAQ = state.periodo >= 1;

    // Proventos
    if (state.vencimento > 0) rows.push({ label: 'VENCIMENTO-ATIVO EC', value: state.vencimento, type: 'C' });
    if (state.gaj > 0) rows.push({ label: 'GRAT. ATIV. JUD. (GAJ)', value: state.gaj, type: 'C' });

    if (state.gratEspecificaValor > 0) {
      const label = state.gratEspecificaTipo === 'gae' ? 'GRATIFICAÇÃO DE ATIVIDADE EXTERNA (GAE)' : 'GRATIFICAÇÃO DE ATIVIDADE DE SEGURANÇA (GAS)';
      rows.push({ label: label, value: state.gratEspecificaValor, type: 'C' });
    }

    if (state.aqTituloValor > 0) {
      const label = isNovoAQ ? 'AQ TÍTULOS (LEI 15.292)' : 'ADICIONAL QUALIFICAÇÃO (TÍTULO)';
      rows.push({ label, value: state.aqTituloValor, type: 'C' });
    }
    if (state.aqTreinoValor > 0) {
      const label = isNovoAQ ? 'AQ TREINAMENTO (LEI 15.292)' : 'ADICIONAL QUALIFICAÇÃO (TREINO)';
      rows.push({ label, value: state.aqTreinoValor, type: 'C' });
    }

    if (state.funcao !== '0') {
      const tables = getTablesForPeriod(state.periodo);
      const valorFC = tables.funcoes[state.funcao] || 0;
      let labelTipo = "FUNÇÃO COMISSIONADA (OPÇÃO)";
      if (state.funcao.startsWith('cj')) labelTipo = "CARGO EM COMISSÃO";
      rows.push({ label: `${labelTipo} - ${state.funcao.toUpperCase()}`, value: valorFC, type: 'C' });
    }

    if (state.substTotal > 0) rows.push({ label: `SUBSTITUIÇÃO DE FUNÇÃO${state.substIsEA ? ' (EA)' : ''}`, value: state.substTotal, type: 'C' });

    if (state.heTotal > 0) rows.push({ label: `SERVIÇO EXTRAORDINÁRIO${state.heIsEA ? ' (EA)' : ''}`, value: state.heTotal, type: 'C' });

    if (state.vpni_lei > 0) rows.push({ label: 'VPNI - LEI 9.527/97', value: state.vpni_lei, type: 'C' });
    if (state.vpni_decisao > 0) rows.push({ label: 'VPNI - DECISÃO JUDICIAL', value: state.vpni_decisao, type: 'C' });
    if (state.ats > 0) rows.push({ label: 'ADICIONAL TEMPO DE SERVIÇO', value: state.ats, type: 'C' });

    if (state.auxAlimentacao > 0) rows.push({ label: 'AUXÍLIO-ALIMENTAÇÃO', value: state.auxAlimentacao, type: 'C' });
    if (state.auxPreEscolarValor > 0) rows.push({ label: 'AUXÍLIO PRÉ-ESCOLAR', value: state.auxPreEscolarValor, type: 'C' });
    if (state.auxTransporteValor > 0) rows.push({ label: 'AUXÍLIO-TRANSPORTE', value: state.auxTransporteValor, type: 'C' });

    if (state.licencaValor > 0) rows.push({ label: 'INDENIZAÇÃO LICENÇA COMPENSATÓRIA', value: state.licencaValor, type: 'C' });
    if (state.abonoPermanencia > 0) rows.push({ label: 'ABONO DE PERMANÊNCIA', value: state.abonoPermanencia, type: 'C' });

    if (state.ferias1_3 > 0) rows.push({ label: 'ADICIONAL 1/3 FÉRIAS', value: state.ferias1_3, type: 'C' });
    if ((state.adiant13Venc + state.adiant13FC) > 0) rows.push({ label: 'ADIANTAMENTO 13º SALÁRIO', value: state.adiant13Venc + state.adiant13FC, type: 'C' });

    // Descontos
    if (state.pssMensal > 0) rows.push({ label: 'CONTRIBUIÇÃO RPPS (PSS)', value: state.pssMensal, type: 'D' });
    if (state.valFunpresp > 0) rows.push({ label: 'FUNPRESP-JUD', value: state.valFunpresp, type: 'D' });
    if (state.irMensal > 0) rows.push({ label: 'IMPOSTO DE RENDA-EC', value: state.irMensal, type: 'D' });
    if (state.irEA > 0) rows.push({ label: 'IMPOSTO DE RENDA-EA', value: state.irEA, type: 'D' });
    if (state.irFerias > 0) rows.push({ label: 'IMPOSTO DE RENDA (FÉRIAS)', value: state.irFerias, type: 'D' });

    if (state.auxTransporteDesc > 0) rows.push({ label: 'COTA-PARTE AUXÍLIO-TRANSPORTE', value: state.auxTransporteDesc, type: 'D' });

    if (state.emprestimos > 0) rows.push({ label: 'CONSIGNAÇÕES / EMPRÉSTIMOS', value: state.emprestimos, type: 'D' });
    if (state.planoSaude > 0) rows.push({ label: 'PLANO DE SAÚDE', value: state.planoSaude, type: 'D' });
    if (state.pensao > 0) rows.push({ label: 'PENSÃO ALIMENTÍCIA', value: state.pensao, type: 'D' });

    // Rubricas Extras
    state.rubricasExtras.forEach(r => {
      if (r.valor > 0 && r.descricao) {
        rows.push({ label: r.descricao.toUpperCase(), value: r.valor, type: r.tipo });
      }
    });

    return rows;
  }, [state]);

  const handleExportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PODER JUDICIÁRIO", 105, 15, { align: "center" });
    doc.text("JUSTIÇA MILITAR DA UNIÃO", 105, 22, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Demonstrativo de Pagamento Simulado - Ref: ${state.mesRef}/${state.anoRef}`, 105, 30, { align: "center" });
    doc.text(`Servidor: ${state.nome || "SERVIDOR SIMULADO"}`, 14, 40);
    doc.text(`Lotação: ${state.lotacao}`, 105, 40);

    doc.setFontSize(8);
    doc.text(`Banco: ${state.dadosBancarios.banco} / Ag: ${state.dadosBancarios.agencia} / CC: ${state.dadosBancarios.conta}`, 14, 44);

    // Convert resultRows to table format
    const tableBody = resultRows.map(row => [
      row.type === 'C' ? 'C' : 'D',
      row.label,
      row.type === 'C' ? formatCurrency(row.value) : '',
      row.type === 'D' ? formatCurrency(row.value) : ''
    ]);

    // Add Totals Row
    tableBody.push(['', 'TOTAL', formatCurrency(state.totalBruto), formatCurrency(state.totalDescontos)]);

    doc.autoTable({
      head: [['TIPO', 'RUBRICA', 'PROVENTOS', 'DESCONTOS']],
      body: tableBody,
      startY: 48,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { halign: 'right', textColor: [0, 100, 0] },
        3: { halign: 'right', textColor: [180, 0, 0] }
      },
      didParseCell: function (data: any) {
        if (data.section === 'body' && data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`LÍQUIDO A RECEBER: ${formatCurrency(state.liquido)}`, 195, finalY, { align: "right" });

    if (state.observacoes) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const splitObs = doc.splitTextToSize(`OBS: ${state.observacoes}`, 180);
      doc.text(splitObs, 14, finalY + 10);
    }

    doc.save(`Holerite_${state.mesRef}_${state.anoRef}.pdf`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const wsData = [
      ["PODER JUDICIÁRIO - JUSTIÇA MILITAR DA UNIÃO"],
      [`SIMULAÇÃO DE SALÁRIO - REF: ${state.mesRef}/${state.anoRef}`],
      [`NOME: ${state.nome}`],
      [`LOTAÇÃO: ${state.lotacao}`],
      [`BANCO: ${state.dadosBancarios.banco} AG: ${state.dadosBancarios.agencia} CC: ${state.dadosBancarios.conta}`],
      [""],
      ["TIPO", "RUBRICA", "PROVENTOS", "DESCONTOS"]
    ];

    resultRows.forEach(row => {
      wsData.push([
        row.type,
        row.label,
        row.type === 'C' ? row.value : "",
        row.type === 'D' ? row.value : ""
      ]);
    });

    wsData.push(["", "TOTAL", state.totalBruto, state.totalDescontos]);
    wsData.push(["", "LÍQUIDO", "", state.liquido]);

    if (state.observacoes) {
      wsData.push([""]);
      wsData.push(["OBS:", state.observacoes]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Basic formatting hint for width
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws, "Holerite");
    XLSX.writeFile(wb, `Holerite_${state.mesRef}.xlsx`);
  };

  const scrollToResults = () => {
    const element = document.getElementById('results-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentTables = getTablesForPeriod(state.periodo);
  const isNovoAQ = state.periodo >= 1;

  return (
    <div className="min-h-screen bg-background text-gray-800 font-sans pb-12 transition-colors duration-200">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="text-primary h-8 w-8" />
            <h1 className="text-xl font-bold text-gray-900">Simulador JMU</h1>
          </div>
          <div className="flex items-center gap-4">
            <input
              className="hidden sm:block form-input rounded-md border-gray-200 bg-gray-50 text-sm py-1.5 px-3 focus:ring-primary focus:border-primary w-64"
              placeholder="Digite seu Nome (Opcional)"
              value={state.nome}
              onChange={e => update('nome', e.target.value)}
            />
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
              <Moon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Global Settings Box */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configurações Globais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Alterações Salariais */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Alterações Salariais (Lei 11.416/06)</label>
              <select
                className="block w-full rounded-md border-gray-200 bg-gray-50 text-sm focus:border-primary focus:ring-primary"
                value={state.periodo}
                onChange={(e) => update('periodo', Number(e.target.value))}
              >
                <option value={0}>Fev/2025 a Dez/2025 (Atual)</option>
                <option value={1}>Jan/2026 a Jun/2026 (Novo AQ)</option>
                <option value={2}>Jul/2026 a Jun/2027 (+8%)</option>
                <option value={3}>Jul/2027 a Jun/2028 (+8% Acum.)</option>
                <option value={4}>Jul/2028 em diante (+8% Acum.)</option>
              </select>
            </div>

            {/* Pagamento Ref */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Mês de Referência</label>
              <div className="flex gap-2">
                <select className="block w-full rounded-md border-gray-200 bg-gray-50 text-sm focus:border-primary focus:ring-primary" value={state.mesRef} onChange={e => update('mesRef', e.target.value)}>
                  <option>JANEIRO</option>
                  <option>FEVEREIRO</option>
                  <option>MARÇO</option>
                  <option>ABRIL</option>
                  <option>MAIO</option>
                  <option>JUNHO</option>
                  <option>JULHO</option>
                  <option>AGOSTO</option>
                  <option>SETEMBRO</option>
                  <option>OUTUBRO</option>
                  <option>NOVEMBRO</option>
                  <option>DEZEMBRO</option>
                </select>
                <input type="number" className="block w-24 rounded-md border-gray-200 bg-gray-50 text-sm focus:border-primary focus:ring-primary" value={state.anoRef} onChange={e => update('anoRef', Number(e.target.value))} />
                <button onClick={setToday} className="bg-primary/10 text-primary px-3 rounded-md hover:bg-primary/20 transition-colors text-sm font-medium">
                  Hoje
                </button>
              </div>
            </div>

            {/* Mês de Cálculo */}
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-medium text-gray-500">Mês de Cálculo (Com ou Sem Férias/13º)</label>
              <select className="block w-full rounded-md border-gray-200 bg-gray-50 text-sm focus:border-primary focus:ring-primary" value={state.tipoCalculo} onChange={e => update('tipoCalculo', e.target.value)}>
                <option value="jan">Janeiro (Adiant. 13º + 1/3 Férias Receb Dezembro)</option>
                <option value="jun">Junho (1º Parc. 13º)</option>
                <option value="comum">Mês Comum</option>
                <option value="nov">Novembro (2ª Parc. 13º)</option>
              </select>
            </div>

          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Column 1: Rendimentos Fixos */}
          <div className="space-y-6">
            <Card
              title="Rendimentos Fixos"
              icon={<DollarSign className="h-5 w-5" />}
              headerColorClass="bg-blue-50 border-blue-100"
              borderColorClass="border-blue-100"
              iconColorClass="text-blue-600"
              titleColorClass="text-blue-800"
            >
              <div className="grid grid-cols-2 gap-4">
                <Select label="Cargo" value={state.cargo} onChange={e => update('cargo', e.target.value)}>
                  <option value="tec">Técnico Judiciário</option>
                  <option value="analista">Analista Judiciário</option>
                </Select>
                <Select label="Classe / Padrão" value={state.padrao} onChange={e => update('padrao', e.target.value)}>
                  {Object.keys(currentTables.salario[state.cargo]).map(p => (
                    <option key={p} value={p}>{p} - {formatCurrency(currentTables.salario[state.cargo][p])}</option>
                  ))}
                </Select>
              </div>

              <Select label="FC/CJ (Titular)" value={state.funcao} onChange={e => update('funcao', e.target.value)}>
                <option value="0">Sem Função / Manual</option>
                {Object.keys(currentTables.funcoes).map(f => (
                  <option key={f} value={f}>{f.toUpperCase()} - {formatCurrency(currentTables.funcoes[f])}</option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Vencimento Básico" value={formatCurrency(state.vencimento)} readOnly />
                <Input label="GAJ (140% do VB)" value={formatCurrency(state.gaj)} readOnly />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 uppercase mb-3">Vantagens Pessoais (Ref. Holerite)</h4>
                <div className="space-y-3">
                  <Input label="VPNI - Lei 9.527/97 (Parc. não absorvível)" type="number" value={state.vpni_lei} onChange={e => update('vpni_lei', Number(e.target.value))} />
                  <Input label="VPNI - Dec. Judicial" type="number" value={state.vpni_decisao} onChange={e => update('vpni_decisao', Number(e.target.value))} />
                  <Input label="Adicional Tempo Serviço (ATS)" type="number" value={state.ats} onChange={e => update('ats', Number(e.target.value))} />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-start gap-2 mb-2">
                  <input type="checkbox" className="mt-1 rounded text-secondary focus:ring-secondary" checked={state.recebeAbono} onChange={e => update('recebeAbono', e.target.checked)} />
                  <div>
                    <label className="text-sm font-medium text-gray-900">Recebo Abono de Permanência?</label>
                    <p className="text-xs text-gray-500 mt-0.5">Igual ao PSS. Calculado automaticamente.</p>
                  </div>
                </div>
                <Input label="" value={formatCurrency(state.abonoPermanencia)} readOnly className="!bg-white !text-green-700 !font-bold" />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 uppercase mb-3">Gratificação Específica (GAE / GAS)</h4>
                <Select label="" value={state.gratEspecificaTipo} onChange={e => update('gratEspecificaTipo', e.target.value)} className="mb-2">
                  <option value="0">Nenhuma</option>
                  <option value="gae">GAE (Oficial de Justiça)</option>
                  <option value="gas">GAS (Agente de Polícia)</option>
                </Select>
                <Input label="" value={formatCurrency(state.gratEspecificaValor)} readOnly className="bg-blue-50 text-blue-700 font-medium mb-2" />
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={state.incidirPSSGrat} onChange={e => update('incidirPSSGrat', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                  <label className="text-xs text-gray-500">Incidir PSS sobre GAE/GAS</label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase">Adicional de Qualificação</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isNovoAQ ? 'bg-orange-100 text-orange-800' : 'bg-teal-100 text-teal-800'}`}>
                    {isNovoAQ ? 'NOVO AQ (2026+)' : 'REGRA 2025'}
                  </span>
                </div>

                <div className="space-y-3">
                  {isNovoAQ ? (
                    <>
                      <div className="bg-orange-50 p-2 rounded border border-orange-100 mb-2">
                        <span className="text-[10px] text-orange-800 font-bold">Valor VR: {formatCurrency(currentTables.valorVR)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Títulos (Base: VR)</label>
                        <select className="form-select w-full rounded-md border-gray-200 bg-gray-50 text-sm" value={state.aqTituloVR} onChange={e => update('aqTituloVR', Number(e.target.value))}>
                          <option value={0}>Nenhum</option>
                          <option value={1}>1x Especialização (1 VR)</option>
                          <option value={2}>2x Especialização (2 VRs)</option>
                          <option value={3.5}>Mestrado (3,5 VRs)</option>
                          <option value={5}>Doutorado (5 VRs)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Ações de Capacitação</label>
                        <select className="form-select w-full rounded-md border-gray-200 bg-gray-50 text-sm" value={state.aqTreinoVR} onChange={e => update('aqTreinoVR', Number(e.target.value))}>
                          <option value={0}>0 horas</option>
                          <option value={0.2}>120 horas (0,2 VR)</option>
                          <option value={0.4}>240 horas (0,4 VR)</option>
                          <option value={0.6}>360 horas (0,6 VR)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <Select label="Títulos (Base: Vencimento)" value={state.aqTituloPerc} onChange={e => update('aqTituloPerc', Number(e.target.value))}>
                        <option value={0}>Nenhum</option>
                        <option value={0.05}>Graduação (5%)</option>
                        <option value={0.075}>Especialização (7,5%)</option>
                        <option value={0.10}>Mestrado (10%)</option>
                        <option value={0.125}>Doutorado (12,5%)</option>
                      </Select>
                      <Select label="Ações de Treinamento" value={state.aqTreinoPerc} onChange={e => update('aqTreinoPerc', Number(e.target.value))}>
                        <option value={0}>0 horas</option>
                        <option value={0.01}>120 horas (1%)</option>
                        <option value={0.02}>240 horas (2%)</option>
                        <option value={0.03}>360 horas (3%)</option>
                      </Select>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="AQ Títulos (R$)" value={formatCurrency(state.aqTituloValor)} readOnly className="text-gray-600" />
                    <Input label="AQ Treino (R$)" value={formatCurrency(state.aqTreinoValor)} readOnly className="text-gray-600" />
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-blue-600 uppercase mb-4">Rubricas Adicionais (Manual)</h3>

              <div className="space-y-2 mb-3">
                {state.rubricasExtras.map((rubrica) => (
                  <div key={rubrica.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Descrição"
                      className="form-input flex-1 rounded border-gray-200 text-xs"
                      value={rubrica.descricao}
                      onChange={e => updateRubrica(rubrica.id, 'descricao', e.target.value)}
                    />
                    <select
                      className="form-select w-24 rounded border-gray-200 text-xs"
                      value={rubrica.tipo}
                      onChange={e => updateRubrica(rubrica.id, 'tipo', e.target.value)}
                    >
                      <option value="C">Crédito</option>
                      <option value="D">Débito</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Valor"
                      className="form-input w-24 rounded border-gray-200 text-xs text-right"
                      value={rubrica.valor || ''}
                      onChange={e => updateRubrica(rubrica.id, 'valor', Number(e.target.value))}
                    />
                    <button onClick={() => removeRubrica(rubrica.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRubrica}
                className="flex items-center gap-2 bg-secondary hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors w-full justify-center"
              >
                <Plus className="h-4 w-4" /> Adicionar Rubrica
              </button>
            </div>
          </div>

          {/* Column 2: Variáveis, HE e Licença */}
          <div className="space-y-6">
            <Card
              title="Variáveis, HE e Licença"
              icon={<Clock className="h-5 w-5" />}
              headerColorClass="bg-purple-50 border-purple-100"
              borderColorClass="border-purple-100"
              iconColorClass="text-purple-600"
              titleColorClass="text-purple-800"
            >
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/50">
                <h4 className="text-sm font-bold text-purple-800 mb-3">Cálculo de Horas Extras (Divisor 175)</h4>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={state.heIsEA} onChange={e => update('heIsEA', e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                    <span className="text-gray-700">Pagamento como EA?</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={state.manualBaseHE} onChange={e => update('manualBaseHE', e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                    <span className="text-gray-700">Não atualizar</span>
                  </label>
                </div>

                <div className="mb-3">
                  <label className="text-xs text-gray-500 block mb-1">Base de Cálculo HE</label>
                  <input
                    type="text"
                    className={`form-input w-full rounded-md border-purple-200 text-sm focus:ring-purple-500 ${state.manualBaseHE ? 'bg-yellow-50' : 'bg-gray-100'}`}
                    value={state.manualBaseHE
                      ? state.heBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : formatCurrency(state.heBase).replace('R$', '').trim()}
                    onChange={e => {
                      if (state.manualBaseHE) {
                        // Allow editing just the number part
                        let raw = e.target.value.replace(/[^0-9,]/g, '');
                        // Check if multiple commas
                        const parts = raw.split(',');
                        if (parts.length > 2) raw = parts[0] + ',' + parts.slice(1).join('');

                        // Parse to store in state, but keep input controlled by formatted value if needed? 
                        // Actually simpler to just parse and store. 
                        // Issue is re-render formatting might jump cursor. 
                        // For now, simple parse.
                        let val = Number(raw.replace('.', '').replace(',', '.')); // Remove thousands separator if any? No, regex removed dots.
                        if (!isNaN(val)) update('heBase', val);
                      }
                    }}
                    readOnly={!state.manualBaseHE}
                  />
                  <button
                    onClick={() => {
                      // O botão só funciona se a checkbox MANUAL estiver *DESMARCADA*? 
                      // Não, user pediu: "Quando marcada, deve desabilitar o botão".
                      // Então botão funciona quando DESMARCADA? Mas desmarcada é Auto...
                      // Talvez o botão seja para "Re-calcular" manual?
                      // Mas seguindo estritamente: Marcada -> Disabled.

                      if (!state.manualBaseHE) {
                        // Logic if needed for "Auto" mode refresh? Likely redundant but enabled.
                        const calculated = calculateAll(state);
                        update('heBase', calculated.heBase);
                      }
                    }}
                    disabled={state.manualBaseHE}
                    className={`mt-2 w-full text-xs font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1 ${!state.manualBaseHE
                      ? 'bg-[#8e44ad] hover:bg-[#7d3c98] text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Setar valor calculado (Reset)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-1">
                  <Input label="Qtd. HE 50%" type="number" value={state.heQtd50} onChange={e => update('heQtd50', Number(e.target.value))} className="bg-white" />
                  <Input label="Valor 50%" value={formatCurrency(state.heVal50)} readOnly className="bg-gray-50 text-gray-600" />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Input label="Qtd. HE 100%" type="number" value={state.heQtd100} onChange={e => update('heQtd100', Number(e.target.value))} className="bg-white" />
                  <Input label="Valor 100%" value={formatCurrency(state.heVal100)} readOnly className="bg-gray-50 text-gray-600" />
                </div>
                <div className="text-right text-xs font-bold text-purple-700 bg-purple-100 p-2 rounded">Total HE: {formatCurrency(state.heTotal)}</div>
              </div>

              {/* Substitution Grid */}
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50/50">
                <h4 className="text-sm font-bold text-orange-800 mb-3">Cálculo de Substituição (Diferença)</h4>
                <label className="flex items-center gap-2 text-xs mb-3">
                  <input type="checkbox" checked={state.substIsEA} onChange={e => update('substIsEA', e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500" />
                  <span className="text-gray-700">Pagamento como EA?</span>
                </label>
                <p className="text-[10px] text-gray-500 mb-2 font-medium">Abatendo sua FC/CJ atual</p>

                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {['fc1', 'fc2', 'fc3', 'fc4', 'fc5', 'fc6', 'cj1', 'cj2', 'cj3', 'cj4'].map(key => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 w-8 uppercase">{key.replace(/(\d+)/, '-$1')}</span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          placeholder="Dias"
                          className="w-16 h-7 rounded border-gray-200 bg-white text-xs text-center focus:ring-orange-500 focus:border-orange-500"
                          value={state.substDias[key] || ''}
                          onChange={e => updateSubstDays(key, Number(e.target.value))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right text-xs font-bold text-orange-600 mt-3">Total Subst.: {formatCurrency(state.substTotal)}</div>
              </div>

              <div className="border border-teal-200 rounded-lg p-4 bg-teal-50/50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-teal-800">Licença Compensatória</h4>
                </div>
                <p className="text-[10px] text-gray-500 mb-3 italic leading-tight">
                  Pago a ocupantes de CJ-2 a CJ-4. Art. 4º Ato Normativo 899.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Função Base</label>
                    <select className="form-select w-full rounded-md border-gray-200 bg-white text-xs" value={state.baseLicenca} onChange={e => update('baseLicenca', e.target.value)}>
                      <option value="auto">Minha Função Atual (Titular)</option>
                      <option value="cj4">Substituição de CJ-4</option>
                      <option value="cj3">Substituição de CJ-3</option>
                      <option value="cj2">Substituição de CJ-2</option>
                      <option value="cj1">Substituição de CJ-1</option>
                      <option value="fc6">Substituição de FC-6</option>
                    </select>
                  </div>
                  <label className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={state.incluirAbonoLicenca} onChange={e => update('incluirAbonoLicenca', e.target.checked)} className="rounded text-teal-600 mt-0.5" />
                    <span className="text-gray-700">Incluir Abono na Base? (ATN 899 Art 4º)</span>
                  </label>
                  <Input label="Qtd. Dias a Indenizar (Máx 4)" type="number" max={4} value={state.licencaDias} onChange={e => update('licencaDias', Number(e.target.value))} className="bg-white" />
                </div>
                <div className="mt-3 bg-teal-100 p-2 rounded flex justify-between items-center">
                  <span className="text-xs font-medium text-teal-800">Valor Estimado (Isento IR/PSS)</span>
                  <span className="text-sm font-bold text-teal-700">{formatCurrency(state.licencaValor)}</span>
                </div>
              </div>

              {/* Auxilio Alimentacao & Transporte - New Design */}
              <div className="space-y-4 pt-2">

                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-blue-700 mb-2">Auxílio Alimentação</h4>
                  <Input label="" type="number" value={state.auxAlimentacao} onChange={e => update('auxAlimentacao', Number(e.target.value))} className="bg-white" />
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-blue-700 mb-2">Auxílio Pré-Escolar</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Qtd. Dependentes</label>
                      <input className="form-input w-full rounded-md border-gray-200 bg-white text-sm text-center" type="number" value={state.auxPreEscolarQtd} onChange={e => update('auxPreEscolarQtd', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Valor Total (R$)</label>
                      <input className="form-input w-full rounded-md border-gray-200 bg-gray-50 text-gray-600 text-sm text-right font-medium" readOnly type="text" value={formatCurrency(state.auxPreEscolarValor)} />
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Cota Base: R$ 1.235,77</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-blue-700 mb-2">Auxílio Transporte</h4>
                  <div className="mb-2">
                    <label className="text-[10px] text-gray-500 block mb-1">Valor Mensal do Transporte (Gasto Total)</label>
                    <input className="form-input w-full rounded-md border-gray-200 bg-white text-sm" type="number" value={state.auxTransporteGasto} onChange={e => update('auxTransporteGasto', Number(e.target.value))} />
                  </div>
                  <p className="text-[10px] text-gray-400">Base: 22 dias. Desconto: 6% do Vencimento.</p>
                  {state.auxTransporteGasto > 0 && state.auxTransporteValor === 0 && (
                    <p className="text-[10px] text-red-500 mt-1 font-bold">Atenção (Art. 23): Benefício cancelado pois desconto {'>'} valor.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Column 3: Descontos e Previdência */}
          <div className="space-y-6">
            <Card
              title="Descontos e Previdência"
              icon={<Scissors className="h-5 w-5" />}
              headerColorClass="bg-red-50 border-red-100"
              borderColorClass="border-red-100"
              iconColorClass="text-red-600"
              titleColorClass="text-red-800"
            >

              <div className="bg-red-50/50 rounded-lg p-3 border border-red-100">
                <h4 className="text-xs font-bold text-red-700 mb-2">Tabelas de Tributação (Vigência)</h4>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <Select label="Tabela PSS" value={state.tabelaPSS} onChange={e => update('tabelaPSS', e.target.value)}>
                    <option value="2025">Portaria MPS/MF 6/...</option>
                    <option value="2024">Portaria MPS/MF 2/2024</option>
                  </Select>
                  <Select label="Tabela IR (Lei 11.482)" value={state.tabelaIR} onChange={e => update('tabelaIR', e.target.value)}>
                    <option value="2025_maio">Maio/2025</option>
                    <option value="2024_fev">Fev/2024</option>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Dedução Dep. (Lei 9250)</label>
                    <input className="form-input w-full rounded-md border-red-200 bg-gray-50 text-xs text-gray-600" readOnly type="text" value="R$ 189,59" />
                  </div>
                  <Input label="Dependentes IR" type="number" value={state.dependentes} onChange={e => update('dependentes', Number(e.target.value))} className="bg-white text-center" />
                </div>
              </div>

              <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100">
                <h4 className="text-xs font-bold text-orange-700 mb-2">Regime de Previdência / Ingresso</h4>
                <Select label="" value={state.regimePrev} onChange={e => update('regimePrev', e.target.value)} className="mb-3">
                  <option value="antigo">Antes de 2013 / Regime Antigo (Integral)</option>
                  <option value="migrado">Antes de 2013 / Previdência Complementar (Teto)</option>
                  <option value="novo_antigo">Após 2013 / Regime Antigo (Integral - Raro)</option>
                  <option value="rpc">Após 2013 / RPC (Teto INSS)</option>
                </Select>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px]">
                    <input type="checkbox" checked={state.pssSobreFC} onChange={e => update('pssSobreFC', e.target.checked)} className="rounded border-gray-300 text-orange-500" />
                    <span className="text-gray-600">Incidir PSS sobre FC/CJ</span>
                  </label>
                  <label className="flex items-center gap-2 text-[10px]">
                    <input type="checkbox" checked={state.pssSobreAQTreino} onChange={e => update('pssSobreAQTreino', e.target.checked)} className="rounded border-gray-300 text-orange-500" />
                    <span className="text-gray-600">Incidir PSS sobre AQ Treinamento</span>
                  </label>
                </div>

                {state.regimePrev !== 'antigo' && (
                  <div className="grid grid-cols-2 gap-2 mt-2 border-t border-orange-200 pt-2">
                    <Select label="Funpresp Alíquota" value={state.funprespAliq} onChange={e => update('funprespAliq', Number(e.target.value))}>
                      <option value={0}>Não aderi</option>
                      <option value={0.065}>6,5%</option>
                      <option value={0.075}>7,5%</option>
                      <option value={0.085}>8,5%</option>
                    </Select>
                    <Input label="Facultativa (%)" type="number" value={state.funprespFacul} onChange={e => update('funprespFacul', Number(e.target.value))} className="bg-white" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Input label="PSS Mensal (RPPS)" value={formatCurrency(state.pssMensal)} readOnly className="bg-gray-100 text-gray-800 font-medium" />
                <Input label="Funpresp" value={formatCurrency(state.valFunpresp)} readOnly className="bg-gray-100 text-purple-700 font-medium" />
                <Input label="IRRF Mensal (EC - Salário)" value={formatCurrency(state.irMensal)} readOnly className="bg-gray-100 text-gray-800 font-medium" />
                <Input label="IRRF - EA (RRA/Ex. Anteriores)" value={formatCurrency(state.irEA)} readOnly className="bg-gray-100 text-gray-800 font-medium" />

                <div className="bg-sky-50 p-2 rounded border border-sky-100">
                  <label className="text-xs font-bold text-sky-700 block mb-1">IRRF s/ Férias</label>
                  <input className="form-input w-full rounded-md border-sky-200 bg-white text-sky-600 text-sm font-bold" readOnly type="text" value={formatCurrency(state.irFerias)} />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 uppercase mb-3">Outros Descontos (Opcionais)</h4>
                <div className="grid grid-cols-1 gap-3">
                  <Input label="Empréstimos" type="number" value={state.emprestimos} onChange={e => update('emprestimos', Number(e.target.value))} placeholder="0" className="bg-white" />
                  <Input label="Plano de Saúde" type="number" value={state.planoSaude} onChange={e => update('planoSaude', Number(e.target.value))} placeholder="0" className="bg-white" />
                  <Input label="Pensão Alimentícia" type="number" value={state.pensao} onChange={e => update('pensao', Number(e.target.value))} placeholder="0" className="bg-white" />
                </div>
              </div>

            </Card>

            <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden relative">
              {/* Top Right Button */}
              <div className="absolute top-0 right-0 p-2">
                <button
                  onClick={handleCalcFerias}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm transition-colors uppercase"
                >
                  Calcular 1/3
                </button>
              </div>

              <div className="p-6 pt-4">
                <h3 className="text-lg font-bold text-blue-500 flex items-center gap-2 mb-4">
                  Férias e 13º Salário
                </h3>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-700">Adicional 1/3 Férias</label>
                    <label className="flex items-center gap-1 text-[10px] text-red-500 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.manualFerias}
                        onChange={e => update('manualFerias', e.target.checked)}
                        className="rounded border-gray-300 text-red-500 focus:ring-red-500 h-3 w-3"
                      /> Não atualizar
                    </label>
                  </div>
                  <Input label="" type="number" value={state.ferias1_3} onChange={e => update('ferias1_3', Number(e.target.value))} className="bg-white border-gray-300" />
                </div>

                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-orange-800">
                    <input type="checkbox" checked={state.feriasAntecipadas} onChange={e => update('feriasAntecipadas', e.target.checked)} className="rounded border-orange-300 text-orange-600 focus:ring-orange-500" />
                    Recebi o dinheiro no mês passado?
                  </label>
                </div>

                <div className="flex justify-end mb-6">
                  <button onClick={handleCalc13Manual} className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold py-1 px-3 rounded shadow-sm transition-colors uppercase">
                    Calcular 13º Manual
                  </button>
                </div>

                {/* Manual 13th fields */}
                <div className="pt-4 border-t border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-xs font-bold text-blue-800">Adiantamento 13º (Janeiro/Junho)</h5>
                    <label className="flex items-center gap-1 text-[10px] text-red-500 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.manualAdiant13}
                        onChange={e => update('manualAdiant13', e.target.checked)}
                        className="rounded border-gray-300 text-red-500 focus:ring-red-500 h-3 w-3"
                      /> Não atualizar
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">Adiant. Ativo EC (Base)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">R$</span>
                        <input
                          type="text"
                          className={`form-input w-full pl-9 rounded-md border-gray-200 text-sm focus:border-primary focus:ring-primary ${!state.manualAdiant13 ? 'bg-gray-50 text-gray-600 font-medium' : 'bg-white'}`}
                          value={state.adiant13Venc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          onChange={(e) => {
                            if (!state.manualAdiant13) return;
                            const raw = e.target.value.replace(/\D/g, '');
                            update('adiant13Venc', Number(raw) / 100);
                          }}
                          readOnly={!state.manualAdiant13}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">Adiant. FC/CJ (Função)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">R$</span>
                        <input
                          type="text"
                          className={`form-input w-full pl-9 rounded-md border-gray-200 text-sm focus:border-primary focus:ring-primary ${!state.manualAdiant13 ? 'bg-gray-50 text-gray-600 font-medium' : 'bg-white'}`}
                          value={state.adiant13FC.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          onChange={(e) => {
                            if (!state.manualAdiant13) return;
                            const raw = e.target.value.replace(/\D/g, '');
                            update('adiant13FC', Number(raw) / 100);
                          }}
                          readOnly={!state.manualAdiant13}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clear Button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleClearValues}
                      className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1 uppercase"
                    >
                      <Trash2 size={12} /> Zerar Valores
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        <section className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FileText size={16} /> Dados para Holerite (Opcional)</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Lotação</label>
              <input className="form-input w-full rounded-md border-gray-200 bg-gray-50 text-sm" value={state.lotacao} onChange={e => update('lotacao', e.target.value)} />
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Banco</label>
                <input className="form-input w-full rounded-md border-gray-200 bg-gray-50 text-sm" value={state.dadosBancarios.banco} onChange={e => setState(p => ({ ...p, dadosBancarios: { ...p.dadosBancarios, banco: e.target.value } }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Agência</label>
                <input className="form-input w-full rounded-md border-gray-200 bg-gray-50 text-sm" value={state.dadosBancarios.agencia} onChange={e => setState(p => ({ ...p, dadosBancarios: { ...p.dadosBancarios, agencia: e.target.value } }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Conta</label>
                <input className="form-input w-full rounded-md border-gray-200 bg-gray-50 text-sm" value={state.dadosBancarios.conta} onChange={e => setState(p => ({ ...p, dadosBancarios: { ...p.dadosBancarios, conta: e.target.value } }))} />
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-700 mb-3">Observações / Notas</h3>
          <textarea
            className="form-textarea w-full rounded-md border-gray-200 bg-gray-50 text-sm h-20 placeholder-gray-400 focus:border-primary focus:ring-primary"
            placeholder="Digite aqui anotações sobre este cálculo..."
            value={state.observacoes}
            onChange={e => update('observacoes', e.target.value)}
          />
        </section>

        <section className="mt-8 space-y-4">
          <button
            onClick={scrollToResults}
            className="w-full bg-primary hover:bg-blue-600 text-white text-lg font-bold py-4 rounded-md shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            CALCULAR SALÁRIO
          </button>

          <div id="results-section" className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="py-3 px-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Rubrica</th>
                    <th className="py-3 px-4 font-bold text-gray-600 uppercase text-xs tracking-wider text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resultRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className={`py-3 px-4 font-medium ${row.type === 'C' ? 'text-green-600' : 'text-red-600'}`}>
                        {row.label}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {formatCurrency(row.value)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals */}
                  <tr className="bg-white">
                    <td className="py-3 px-4 font-bold text-gray-800 uppercase">TOTAL BRUTO</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800">{formatCurrency(state.totalBruto)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-3 px-4 font-bold text-gray-800 uppercase">TOTAL DESCONTOS</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800">{formatCurrency(state.totalDescontos)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t border-gray-200">
              <button onClick={handleExportPDF} className="bg-[#e74c3c] hover:bg-[#c0392b] text-white text-xs font-bold py-2 px-4 rounded shadow-sm flex items-center gap-2 transition-colors">
                <FileText size={16} /> PDF (Holerite)
              </button>
              <button onClick={handleExportExcel} className="bg-[#2ecc71] hover:bg-[#27ae60] text-white text-xs font-bold py-2 px-4 rounded shadow-sm flex items-center gap-2 transition-colors">
                <Table size={16} /> Excel
              </button>
            </div>

            <div className="bg-secondary py-6 px-4 text-white flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Líquido a Receber</span>
              <span className="text-3xl font-extrabold tracking-tight">{formatCurrency(state.liquido)}</span>
            </div>
          </div>
        </section>

      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400">Simulador de Salário JMU © 2025 - Design Modernizado</p>
      </footer>
    </div>
  );
}