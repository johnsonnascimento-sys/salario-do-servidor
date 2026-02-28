import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, FileText, FolderTree } from 'lucide-react';
import { WIKI_CATALOG_TREE, WikiNode } from '../content/wiki/catalog';

export default function WikiHome() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<WikiNode[]>([]);

  const currentLevel = useMemo(() => {
    if (history.length === 0) return WIKI_CATALOG_TREE;
    return history[history.length - 1].children || [];
  }, [history]);

  const goBack = () => setHistory((prev) => prev.slice(0, -1));

  const onNodeClick = (node: WikiNode) => {
    if (node.type === 'article' && node.scope && node.slug) {
      navigate(`/wiki/${node.scope}/${node.slug}`);
      return;
    }

    if (node.type === 'category' && node.children && node.children.length > 0) {
      setHistory((prev) => [...prev, node]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-h1 font-black text-neutral-900 dark:text-white mb-4">Wiki</h1>
        <p className="text-body-lg text-neutral-600 dark:text-neutral-300">
          Escolha uma trilha de conteúdo: visão global das regras ou conteúdo específico por poder.
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-700 p-8 shadow-sm min-h-[420px]">
        {history.length > 0 && (
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1 text-body font-bold text-neutral-600 hover:text-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
            <span className="text-neutral-300">|</span>
            <span className="text-body font-bold text-neutral-800 dark:text-neutral-100">
              {history[history.length - 1].name}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentLevel.map((node) => {
            const isEmptyCategory = node.type === 'category' && (!node.children || node.children.length === 0);
            return (
              <button
                type="button"
                key={node.id}
                onClick={() => onNodeClick(node)}
                disabled={isEmptyCategory}
                className={`text-left group bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 transition ${
                  isEmptyCategory
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:border-secondary/40 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-secondary">
                    {node.type === 'article' ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <FolderTree className="w-5 h-5" />
                    )}
                  </div>
                  {isEmptyCategory && (
                    <span className="text-label font-bold uppercase tracking-wider text-neutral-400">Em breve</span>
                  )}
                </div>

                <h2 className="text-body-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {node.name}
                </h2>
                {node.description && (
                  <p className="text-body text-neutral-500 dark:text-neutral-300">{node.description}</p>
                )}

                {!isEmptyCategory && (
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="inline-flex items-center gap-1 text-secondary font-bold text-body-xs uppercase tracking-wider">
                      Abrir
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/beta-access#simulators"
          className="text-secondary hover:underline font-semibold"
        >
          Ir para seleção de simuladores
        </Link>
      </div>
    </div>
  );
}
