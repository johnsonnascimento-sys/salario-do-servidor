import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const sections: Array<{ title: string; items: string[] }> = [
  {
    title: '1. Acesso ao painel',
    items: [
      'Acesse /admin e faça login com conta na allowlist administrativa.',
      'Após autenticação, você entra no Hub (/admin/hub).',
    ],
  },
  {
    title: '2. Hub administrativo',
    items: [
      'Regras Globais: IR, PSS, deduções e tabelas universais.',
      'Regras por Poder: bases e parâmetros por carreira/poder.',
      'Órgãos: overrides locais por órgão.',
      'Usuários: contas, allowlist de cadastro e allowlist admin.',
    ],
  },
  {
    title: '3. Regras Globais',
    items: [
      'Abra /admin/global.',
      'Clique em Editar na linha desejada.',
      'Ajuste o JSON e clique em Salvar.',
      'Confirme o alerta de impacto imediato.',
    ],
  },
  {
    title: '4. Regras por Poder',
    items: [
      'Abra /admin/power.',
      'Use o filtro de poder para reduzir a lista.',
      'Edite o JSON e salve.',
    ],
  },
  {
    title: '5. Órgãos',
    items: [
      'Abra /admin/org.',
      'Pesquise por slug/nome.',
      'Edite o campo configuration (JSON) e salve.',
    ],
  },
  {
    title: '6. Usuários',
    items: [
      'Aba Contas do sistema: editar dados, resetar senha, excluir conta.',
      'Aba Allowlist de cadastro: controlar quem pode se cadastrar no beta.',
      'Aba Allowlist admin: controlar acesso às rotas /admin*.',
    ],
  },
  {
    title: '7. Boas práticas',
    items: [
      'Faça mudanças pequenas e rastreáveis.',
      'Valide no simulador após alterações críticas.',
      'Evite alterar produção sem contexto de impacto.',
    ],
  },
];

export default function AdminManual() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link to="/admin/hub" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} /> Voltar ao Hub
          </Link>
          <h1 className="text-h4 font-bold text-gray-900 mt-3">Manual do Painel Administrativo</h1>
          <p className="text-body text-gray-500">Guia operacional para uso do painel novo.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-body-xl font-bold text-gray-900">{section.title}</h2>
              <ul className="mt-2 space-y-1 text-body text-gray-600">
                {section.items.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

