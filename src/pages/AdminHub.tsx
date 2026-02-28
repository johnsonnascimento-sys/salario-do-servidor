import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Layers, Building2, BookOpen } from 'lucide-react';
import { AdminService } from '../services/admin/AdminService';

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
    title: 'Wiki do Usuario',
    description: 'Acesso as paginas da wiki publica do PJU.',
    to: '/admin/wiki',
    icon: BookOpen,
  },
];

export default function AdminHub() {
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<{
    ok: boolean;
    missingGlobal: string[];
    missingPower: string[];
    orgIssues: string[];
  } | null>(null);

  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    setDiagResult(null);
    try {
      const [globals, powers, orgs] = await Promise.all([
        AdminService.listGlobalConfigs(),
        AdminService.listPowerConfigs(),
        AdminService.listOrgConfigs(),
      ]);

      const requiredGlobal = ['dependent_deduction', 'pss_tables', 'ir_deduction'];
      const requiredPower = [
        'cj1_integral_base',
        'adjustment_schedule',
        'salary_bases',
        'aq_rules',
        'gratification_percentages',
        'benefits',
        'dailies_rules',
        'payroll_rules',
        'career_catalog',
      ];
      const requiredOrgs = ['jmu'];

      const globalKeys = new Set(globals.map((item) => item.config_key));
      const powerKeys = new Set(
        powers.filter((item) => item.power_name === 'PJU').map((item) => item.config_key),
      );
      const orgMap = new Map(orgs.map((item) => [item.org_slug, item]));

      const missingGlobal = requiredGlobal.filter((key) => !globalKeys.has(key));
      const missingPower = requiredPower.filter((key) => !powerKeys.has(key));

      const orgIssues: string[] = [];
      requiredOrgs.forEach((slug) => {
        const org = orgMap.get(slug);
        if (!org) {
          orgIssues.push(`Orgao ${slug} nao encontrado.`);
          return;
        }
        if (org.power_name !== 'PJU') {
          orgIssues.push(`Orgao ${slug} com power_name ${org.power_name}.`);
        }
      });

      setDiagResult({
        ok: missingGlobal.length === 0 && missingPower.length === 0 && orgIssues.length === 0,
        missingGlobal,
        missingPower,
        orgIssues,
      });
    } catch (err) {
      setDiagError((err as Error).message || 'Erro ao executar diagnostico.');
    } finally {
      setDiagLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-h4 font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-body text-gray-500">Escolha a area que deseja administrar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="mt-10 bg-white dark:bg-neutral-900 border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-body-xl font-bold text-gray-900">Diagnostico rapido (PJU)</h2>
              <p className="text-body text-gray-500">
                Verifica se global_config, power_config e org_config estao completos para o PJU.
              </p>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={diagLoading}
              className="px-4 py-2 rounded-md text-body text-white bg-secondary-500 hover:bg-secondary-700 disabled:opacity-60"
            >
              {diagLoading ? 'Verificando...' : 'Rodar diagnostico'}
            </button>
          </div>

          {diagError && (
            <div className="mt-4 text-body text-error-600 font-medium">{diagError}</div>
          )}

          {diagResult && (
            <div className="mt-4">
              {diagResult.ok ? (
                <div className="text-body text-success-600 font-medium">
                  Tudo certo! Nenhuma pendencia encontrada.
                </div>
              ) : (
                <div className="space-y-3 text-body text-gray-600">
                  {diagResult.missingGlobal.length > 0 && (
                    <div>
                      <div className="font-bold text-gray-900">Global faltando:</div>
                      <div>{diagResult.missingGlobal.join(', ')}</div>
                    </div>
                  )}
                  {diagResult.missingPower.length > 0 && (
                    <div>
                      <div className="font-bold text-gray-900">Power (PJU) faltando:</div>
                      <div>{diagResult.missingPower.join(', ')}</div>
                    </div>
                  )}
                  {diagResult.orgIssues.length > 0 && (
                    <div>
                      <div className="font-bold text-gray-900">Problemas em org_config:</div>
                      <div>{diagResult.orgIssues.join(' | ')}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
