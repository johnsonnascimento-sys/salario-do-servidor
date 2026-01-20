import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Calculator, TrendingUp, ShieldCheck, FileText, ArrowRight,
  Menu, X, ChevronRight, Lock, Building2, ChevronLeft, Sun, Moon, Heart, Mail, MapPin
} from 'lucide-react';
import logo from '../assets/logo.png';
import AdPlaceholder from '../components/AdPlaceholder';

// Definição dos tipos para evitar erro de TypeScript
type SimulatorNode = {
  id: string;
  name: string;
  icon?: React.ReactNode;
  type: 'category' | 'simulator';
  slug?: string;
  children?: SimulatorNode[];
  description?: string;
};

// Dados da Navegação
const SIMULATOR_DATA: SimulatorNode[] = [
  {
    id: 'judiciario',
    name: 'Poder Judiciário',
    type: 'category',
    icon: <Building2 className="w-8 h-8 text-blue-600" />,
    description: 'Tribunais Federais, Estaduais e Superiores',
    children: [
      {
        id: 'jud_federal_sphere',
        name: 'Justiça Federal',
        type: 'category',
        icon: <Building2 className="w-6 h-6 text-blue-600" />,
        description: 'Tribunais da União',
        children: [
          {
            id: 'jud_militar',
            name: 'Justiça Militar da União',
            type: 'category',
            icon: <ShieldCheck className="w-6 h-6 text-blue-500" />,
            children: [
              {
                id: 'stm',
                name: 'STM e Auditorias (JMU)',
                type: 'simulator',
                slug: 'stm',
                description: 'Simulador completo para servidores da JMU (Lei 13.317/16 + Lei 15.292/26)'
              }
            ]
          },
          {
            id: 'jud_federal_comum',
            name: 'Justiça Federal (TRFs)',
            type: 'category',
            icon: <Building2 className="w-6 h-6 text-blue-500" />,
            children: [
              { id: 'trf1', name: 'TRF-1', type: 'simulator', slug: '#' },
              { id: 'trf2', name: 'TRF-2', type: 'simulator', slug: '#' },
              { id: 'trf3', name: 'TRF-3', type: 'simulator', slug: '#' },
              { id: 'trf4', name: 'TRF-4', type: 'simulator', slug: '#' },
              { id: 'trf5', name: 'TRF-5', type: 'simulator', slug: '#' },
              { id: 'trf6', name: 'TRF-6', type: 'simulator', slug: '#' }
            ]
          },
          {
            id: 'jud_eleitoral',
            name: 'Justiça Eleitoral',
            type: 'category',
            icon: <FileText className="w-6 h-6 text-blue-500" />,
            children: [
              { id: 'tse', name: 'TSE', type: 'simulator', slug: '#' },
              { id: 'tre_ac', name: 'TRE-AC', type: 'simulator', slug: '#' },
              { id: 'tre_al', name: 'TRE-AL', type: 'simulator', slug: '#' },
              // Adicione outros TREs conforme necessário, simplificado para "Em Breve" por enquanto
              { id: 'tre_outros', name: 'Outros TREs (Em Breve)', type: 'simulator', slug: '#' }
            ]
          },
          {
            id: 'jud_trabalho',
            name: 'Justiça do Trabalho',
            type: 'category',
            icon: <Building2 className="w-6 h-6 text-blue-500" />,
            children: [
              { id: 'tst', name: 'TST', type: 'simulator', slug: '#' },
              { id: 'trt_outros', name: 'TRTs (Em Breve)', type: 'simulator', slug: '#' }
            ]
          },
          {
            id: 'tjdft',
            name: 'TJDFT',
            type: 'category',
            icon: <Building2 className="w-6 h-6 text-blue-500" />,
            children: [
              { id: 'tjdft_sim', name: 'TJDFT (Em Breve)', type: 'simulator', slug: '#' }
            ]
          }
        ]
      },
      {
        id: 'jud_estadual_sphere',
        name: 'Justiça Estadual',
        type: 'category',
        icon: <Building2 className="w-6 h-6 text-emerald-600" />,
        description: 'Tribunais de Justiça (TJs)',
        children: [
          { id: 'tjac', name: 'TJAC', type: 'simulator', slug: '#' },
          { id: 'tjal', name: 'TJAL', type: 'simulator', slug: '#' },
          { id: 'tjam', name: 'TJAM', type: 'simulator', slug: '#' },
          { id: 'tjap', name: 'TJAP', type: 'simulator', slug: '#' },
          { id: 'tjba', name: 'TJBA', type: 'simulator', slug: '#' },
          { id: 'tjce', name: 'TJCE', type: 'simulator', slug: '#' },
          { id: 'tjes', name: 'TJES', type: 'simulator', slug: '#' },
          { id: 'tjgo', name: 'TJGO', type: 'simulator', slug: '#' },
          { id: 'tjma', name: 'TJMA', type: 'simulator', slug: '#' },
          { id: 'tjmg', name: 'TJMG', type: 'simulator', slug: '#' },
          { id: 'tjms', name: 'TJMS', type: 'simulator', slug: '#' },
          { id: 'tjmt', name: 'TJMT', type: 'simulator', slug: '#' },
          { id: 'tjpa', name: 'TJPA', type: 'simulator', slug: '#' },
          { id: 'tjpb', name: 'TJPB', type: 'simulator', slug: '#' },
          { id: 'tjpe', name: 'TJPE', type: 'simulator', slug: '#' },
          { id: 'tjpi', name: 'TJPI', type: 'simulator', slug: '#' },
          { id: 'tjpr', name: 'TJPR', type: 'simulator', slug: '#' },
          { id: 'tjrj', name: 'TJRJ', type: 'simulator', slug: '#' },
          { id: 'tjrn', name: 'TJRN', type: 'simulator', slug: '#' },
          { id: 'tjro', name: 'TJRO', type: 'simulator', slug: '#' },
          { id: 'tjrr', name: 'TJRR', type: 'simulator', slug: '#' },
          { id: 'tjrs', name: 'TJRS', type: 'simulator', slug: '#' },
          { id: 'tjsc', name: 'TJSC', type: 'simulator', slug: '#' },
          { id: 'tjse', name: 'TJSE', type: 'simulator', slug: '#' },
          { id: 'tjsp', name: 'TJSP', type: 'simulator', slug: '#' },
          { id: 'tjto', name: 'TJTO', type: 'simulator', slug: '#' }
        ]
      }
    ]
  },
  {
    id: 'mpu',
    name: 'Ministério Público',
    type: 'category',
    icon: <ShieldCheck className="w-8 h-8 text-rose-600" />,
    description: 'MPF, MPT, MPM e MPDFT',
    children: [
      { id: 'mpu_breve', name: 'Ramos do MPU (Em Breve)', type: 'simulator', slug: '#' }
    ]
  },
  {
    id: 'executivo',
    name: 'Poder Executivo',
    type: 'category',
    icon: <Building2 className="w-8 h-8 text-emerald-600" />,
    description: 'Ministérios e Autarquias Federais',
    children: [
      { id: 'exec_breve', name: 'Carreiras do Executivo (Em Breve)', type: 'simulator', slug: '#' }
    ]
  },
  {
    id: 'legislativo',
    name: 'Poder Legislativo',
    type: 'category',
    // Se Landmark der erro, usamos Building2 como fallback visual
    icon: <Building2 className="w-8 h-8 text-amber-600" />,
    description: 'Câmara dos Deputados e Senado Federal',
    children: [
      { id: 'leg_breve', name: 'Câmara e Senado (Em Breve)', type: 'simulator', slug: '#' }
    ]
  }
];

export default function Home() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  // Estado para controlar a navegação em níveis
  const [navHistory, setNavHistory] = useState<SimulatorNode[]>([]);

  // Define qual nível mostrar: se não tiver histórico, mostra a raiz (SIMULATOR_DATA)
  // Se tiver histórico, mostra os filhos do último item clicado
  const currentLevel = navHistory.length > 0
    ? navHistory[navHistory.length - 1].children || []
    : SIMULATOR_DATA;

  const handleNodeClick = (node: SimulatorNode) => {
    if (node.type === 'simulator') {
      if (node.slug && node.slug !== '#') {
        navigate(`/simulador/${node.slug}`);
      } else {
        // Apenas para itens "Em breve"
        alert("Simulador em desenvolvimento. Tente a Justiça Militar.");
      }
    } else if (node.type === 'category' && node.children && node.children.length > 0) {
      setNavHistory([...navHistory, node]);
    }
  };

  const handleBack = () => {
    setNavHistory(prev => prev.slice(0, -1));
  };

  const scrollToSimulators = () => {
    const section = document.getElementById('simulators-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToFeatures = () => {
    const section = document.getElementById('features');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle hash scrolling from URL
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id === 'simulators' ? 'simulators-section' : id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-secondary/20">

      {/* Hero - Modern/Tech Style */}
      <main className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-[90vh] flex items-center">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-secondary/30 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]"></div>

          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

          {/* Floating Geometric Shapes */}
          <div className="absolute top-32 right-[20%] w-4 h-4 bg-secondary/60 rotate-45 animate-bounce" style={{ animationDuration: '3s' }}></div>
          <div className="absolute top-[40%] left-[15%] w-3 h-3 bg-emerald-400/60 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-[30%] right-[25%] w-2 h-2 bg-purple-400/60 rotate-45 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}></div>
          <div className="absolute top-[25%] left-[40%] w-6 h-6 border border-secondary/30 rotate-12 animate-spin" style={{ animationDuration: '20s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-xs font-semibold uppercase tracking-widest mb-8 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Atualizado: Tabelas 2025/2026
              </div>

              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-[1.05]">
                Simule seu
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary via-blue-400 to-purple-400">
                  salário real.
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-xl">
                Cálculos precisos baseados na legislação vigente. Progressões, benefícios, descontos e projeções futuras em um só lugar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={scrollToSimulators}
                  className="group relative bg-gradient-to-r from-secondary to-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-2xl shadow-secondary/25 flex items-center justify-center gap-3 hover:shadow-secondary/40 hover:scale-[1.02]"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Começar Simulação <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button
                  onClick={scrollToFeatures}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/10 flex items-center justify-center gap-3"
                >
                  Recursos Exclusivos
                </button>
              </div>

              {/* Tech Stats */}
              <div className="flex gap-8 mt-12 pt-8 border-t border-white/10">
                <div>
                  <div className="text-2xl font-black text-white">100%</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Gratuito</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">2026</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Tabelas Atualizadas</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">Real</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Precisão</div>
                </div>
              </div>
            </div>

            {/* Tech Card */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-r from-secondary/40 to-purple-500/40 rounded-3xl blur-2xl opacity-40"></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-blue-500 flex items-center justify-center">
                      <Calculator className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold">Simulação de Salário</div>
                      <div className="text-xs text-slate-500">Janeiro/2026</div>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm">Vencimento Básico</span>
                    <span className="text-white font-semibold">R$ 8.529,65</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm">Gratificação (GAJ)</span>
                    <span className="text-emerald-400 font-semibold">+ R$ 5.117,79</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm">Adicional de Qualificação</span>
                    <span className="text-emerald-400 font-semibold">+ R$ 1.364,74</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-white/10 pt-4">
                    <span className="text-slate-400 text-sm">PSS (Previdência)</span>
                    <span className="text-rose-400 font-semibold">- R$ 1.650,44</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm">Imposto de Renda</span>
                    <span className="text-rose-400 font-semibold">- R$ 2.411,42</span>
                  </div>
                </div>

                {/* Result Display */}
                <div className="bg-gradient-to-r from-secondary/20 to-purple-500/20 rounded-2xl p-6 border border-secondary/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Líquido Estimado</span>
                      <span className="text-sm text-slate-400">Valor a receber</span>
                    </div>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-secondary to-purple-400">R$ 10.950,32</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* SEÇÃO DE SELEÇÃO (DRILL-DOWN) */}
      <section id="simulators-section" className="bg-white py-24 border-y border-slate-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Selecione seu Órgão</h2>
            <p className="text-slate-500">Navegue pelas esferas abaixo para encontrar a calculadora específica.</p>
          </div>

          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[400px]">
            {/* Breadcrumb / Botão Voltar */}
            {navHistory.length > 0 && (
              <div className="mb-6 flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-secondary transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-sm font-bold text-slate-800">{navHistory[navHistory.length - 1].name}</span>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentLevel.map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`
                    group relative bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 
                    ${node.slug === '#' ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-secondary/5 hover:-translate-y-1 hover:border-secondary/30'}
                  `}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-300 text-slate-600 group-hover:text-secondary">
                      {node.icon || <Building2 className="w-6 h-6" />}
                    </div>
                    {node.slug === '#' ? (
                      <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Em Breve</span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        {node.type === 'category' ? 'Abrir' : 'Simular'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-secondary transition-colors">
                    {node.name}
                  </h3>

                  {node.description && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      {node.description}
                    </p>
                  )}

                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-5 h-5 text-secondary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Recursos Exclusivos</h2>
            <p className="text-slate-500">Algumas ferramentas avançadas disponíveis para assinantes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-secondary mb-6">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Projeção de Carreira</h3>
              <p className="text-slate-500 leading-relaxed text-sm">Visualize sua evolução salarial.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Cálculo Exato</h3>
              <p className="text-slate-500 leading-relaxed text-sm">Algoritmos validados com tabelas oficiais.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Exportação PDF e Excel</h3>
              <p className="text-slate-500 leading-relaxed text-sm">Gere holerites simulados em formatos profissionais.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}