import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink } from 'lucide-react';
import { getAllWikiArticles } from '../content/wiki/catalog';

export default function AdminWiki() {
  const articles = getAllWikiArticles();

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-h4 font-bold text-gray-900">Wiki do Usuário</h1>
              <p className="text-body text-gray-500">
                Acesso administrativo para revisar e abrir as páginas públicas da wiki.
              </p>
            </div>
            <Link
              to="/admin"
              className="px-3 py-2 rounded-md border border-gray-300 text-body text-gray-700 hover:bg-gray-50"
            >
              Voltar ao painel
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => {
            const href = `/wiki/${article.scope}/${article.slug}`;
            return (
              <div key={href} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-body-xl font-bold text-gray-900">{article.title}</h2>
                    <p className="text-body text-gray-500 mt-1">{article.subtitle}</p>
                    <p className="text-body-xs text-gray-500 mt-2">Escopo: {article.scope.toUpperCase()}</p>
                    <p className="text-body-xs text-gray-500">Atualizado em: {article.updatedAt}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-secondary-50 text-secondary-600 flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-secondary-500 text-white text-body-xs font-bold hover:bg-secondary-700"
                  >
                    Abrir página pública
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <Link
            to="/wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-body text-gray-700 hover:bg-gray-50"
          >
            Abrir entrada principal da Wiki
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
