import { useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeftRight, Landmark, Menu, Moon, Sun } from 'lucide-react';
import type { SiteTheme } from '../MainLayout';
import logo from '../../assets/logo.png';

const SITE_LINKS = [
    { to: '/beta-access', label: 'Início' },
    { to: '/beta-access#simulators', label: 'Simuladores' },
    { to: '/quem-somos', label: 'Quem Somos' },
    { to: '/acesso', label: 'Minha Área' },
    { to: '/apoiar', label: 'Apoiar' }
];

const headerAction = 'grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800';

export function CalculatorHeader({ agencyName }: { agencyName?: string }) {
    const theme = useOutletContext<SiteTheme | undefined>();
    const menuRef = useRef<HTMLDetailsElement>(null);

    return (
        <header data-calculator-header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-t-[inherit] border-b border-neutral-200 px-4 py-1 dark:border-neutral-700 min-[960px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[960px]:gap-x-6 min-[960px]:px-5 min-[960px]:py-2">
            <h1 className="sr-only">Simulador de remuneração</h1>
            <Link to="/beta-access" className="flex min-h-11 min-w-0 items-center gap-2">
                <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
                <span className="text-body font-extrabold leading-tight tracking-tight sm:text-body-lg">Salário do <span className="gradient-text">Servidor</span></span>
            </Link>
            <Link to="/beta-access#simulators" aria-label={agencyName ? `Trocar órgão: ${agencyName}` : 'Selecionar órgão'}
                className="col-span-2 row-start-2 flex min-h-11 min-w-0 items-center gap-2 border-t border-neutral-100 text-body-sm font-semibold text-neutral-700 hover:text-secondary-800 dark:border-neutral-800 dark:text-neutral-200 dark:hover:text-secondary-300 min-[960px]:col-span-1 min-[960px]:row-start-auto min-[960px]:w-fit min-[960px]:border-l min-[960px]:border-t-0 min-[960px]:border-neutral-200 min-[960px]:pl-5">
                <Landmark className="h-4 w-4 shrink-0 text-secondary-700 dark:text-secondary-300" aria-hidden="true" />
                {agencyName && <span className="min-w-0 [overflow-wrap:anywhere]">{agencyName}</span>}
                <span className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-md bg-secondary-50 px-2 py-1.5 text-secondary-800 dark:bg-secondary-950 dark:text-secondary-200 min-[960px]:ml-2">
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                    <span className={agencyName ? 'hidden min-[960px]:inline' : ''}>{agencyName ? 'Trocar órgão' : 'Selecionar órgão'}</span>
                </span>
            </Link>
            <div className="col-start-2 row-start-1 flex items-center min-[960px]:col-start-3">
                {theme && <button type="button" className={headerAction} onClick={theme.toggleTheme}
                    aria-label={theme.isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}>
                    {theme.isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
                </button>}
                <details ref={menuRef} className="relative" onBlur={event => {
                    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
                }} onKeyDown={event => {
                    if (event.key === 'Escape' && menuRef.current?.open) {
                        event.stopPropagation();
                        menuRef.current.open = false;
                        menuRef.current.querySelector('summary')?.focus();
                    }
                }}>
                    <summary aria-label="Menu do site" className={`${headerAction} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                        <Menu size={20} aria-hidden="true" />
                    </summary>
                    <nav aria-label="Navegação do site" className="absolute right-0 top-full z-40 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        {SITE_LINKS.map(link => <Link key={link.to} to={link.to} className="flex min-h-11 items-center rounded-lg px-3 text-body-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">
                            {link.label}
                        </Link>)}
                    </nav>
                </details>
            </div>
        </header>
    );
}
