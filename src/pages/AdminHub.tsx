import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Layers, Building2, Users } from 'lucide-react';

const cards = [
  {
    title: 'Regras Globais',
    description: 'IR, PSS, deducoes e tabelas universais.',
    to: '/admin/global',
    icon: Database,
  },
  {
    title: 'Regras por Poder',
    description: 'Bases salariais e regras por carreira/poder.',
    to: '/admin/power',
    icon: Layers,
  },
  {
    title: 'Orgaos',
    description: 'Overrides especificos por orgao.',
    to: '/admin/org',
    icon: Building2,
  },
  {
    title: 'Usuarios',
    description: 'CRUD de usuarios, allowlist beta e reset de senha.',
    to: '/admin/users',
    icon: Users,
  },
];

export default function AdminHub() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-h4 font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-body text-gray-500">Escolha a area que deseja administrar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className="group bg-white dark:bg-neutral-900 border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-secondary-50 text-secondary-600 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-body-xl font-bold text-gray-900 group-hover:text-secondary-600 transition">
                    {card.title}
                  </h2>
                </div>
                <p className="text-body text-gray-500">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
