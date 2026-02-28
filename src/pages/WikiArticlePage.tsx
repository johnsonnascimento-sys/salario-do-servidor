import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, Users } from 'lucide-react';
import { getWikiArticle } from '../content/wiki/catalog';

export default function WikiArticlePage() {
  const { scope = '', articleSlug = '' } = useParams();
  const article = getWikiArticle(scope, articleSlug);

  if (!article) {
    return <Navigate to="/wiki" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 md:p-12 border border-neutral-200 dark:border-neutral-700 shadow-xl">
        <div className="flex items-center gap-3 text-secondary mb-4">
          <BookOpen className="w-5 h-5" />
          <span className="text-body-xs font-bold uppercase tracking-wider">Wiki {article.scope}</span>
        </div>

        <h1 className="text-h2 md:text-h1 font-extrabold text-neutral-900 dark:text-white mb-3">
          {article.title}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-300 text-body-lg mb-8">
          {article.subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-body-xs font-bold uppercase tracking-wider">Publico</span>
            </div>
            <p className="text-body text-neutral-800 dark:text-neutral-100">{article.audience}</p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
              <CalendarDays className="w-4 h-4" />
              <span className="text-body-xs font-bold uppercase tracking-wider">Atualizado em</span>
            </div>
            <p className="text-body text-neutral-800 dark:text-neutral-100">{article.updatedAt}</p>
          </div>
        </div>

        <div className="space-y-10">
          {article.sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-h4 font-bold text-neutral-900 dark:text-white mb-4">{section.title}</h2>

              {section.paragraphs?.map((text) => (
                <p key={text} className="text-body-lg text-neutral-700 dark:text-neutral-200 leading-relaxed mb-4">
                  {text}
                </p>
              ))}

              {section.bullets && (
                <ul className="list-disc pl-6 space-y-3 text-body-lg text-neutral-700 dark:text-neutral-200 leading-relaxed">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              {section.steps && (
                <ol className="list-decimal pl-6 space-y-3 text-body-lg text-neutral-700 dark:text-neutral-200 leading-relaxed">
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>

        <section className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-700">
          <h2 className="text-h4 font-bold text-neutral-900 dark:text-white mb-4">Fontes oficiais</h2>
          <ul className="space-y-3">
            {article.legalRefs.map((reference) => (
              <li key={reference.href}>
                <a
                  href={reference.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline break-words text-body"
                >
                  {reference.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/wiki"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            Voltar para Wiki
          </Link>
          <Link
            to="/simulador/jmu"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-white font-bold hover:opacity-90 transition-opacity"
          >
            Ir para simulador JMU
          </Link>
        </div>
      </div>
    </div>
  );
}
