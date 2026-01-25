import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sun, Moon, Heart, Mail, MapPin } from 'lucide-react';
import logo from '../assets/logo.png';

const MainLayout: React.FC = () => {
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

    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-neutral-900 dark:text-neutral-100 min-h-screen flex flex-col transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3">
                            <Link to="/beta-access" className="flex items-center gap-3">
                                <img src={logo} alt="Salário do Servidor" className="w-16 h-16 object-contain" />
                                <span className="text-h4 font-extrabold tracking-tight text-neutral-800 dark:text-white">
                                    Salário do <span className="gradient-text">Servidor</span>
                                </span>
                            </Link>
                        </div>

                        <nav className="hidden md:flex items-center gap-10">
                            <Link to="/beta-access" className="text-body font-semibold text-neutral-600 dark:text-neutral-300 hover:text-secondary dark:hover:text-primary transition-colors">Início</Link>
                            <Link to="/beta-access#simulators" className="text-body font-semibold text-neutral-600 dark:text-neutral-300 hover:text-secondary dark:hover:text-primary transition-colors">Simuladores</Link>
                            <Link to="/quem-somos" className="text-body font-semibold text-neutral-600 dark:text-neutral-300 hover:text-secondary dark:hover:text-primary transition-colors">Quem Somos</Link>
                        </nav>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full hover:bg-neutral-100 dark:bg-transparent dark:hover:bg-neutral-800 transition-colors"
                            >
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <Link to="/apoiar" className="btn btn-sm bg-gradient-to-r from-error-500 to-pink-500 text-white rounded-full font-bold hover:shadow-lg hover:shadow-error-500/30 transition-all">
                                <Heart className="w-4 h-4" />
                                Apoiar
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-navy-dark text-neutral-400 pt-20 pb-10 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <img src={logo} alt="Salário do Servidor" className="w-16 h-16 object-contain" />
                                <span className="text-h4 font-bold tracking-tight text-white">
                                    Salário do <span className="gradient-text">Servidor</span>
                                </span>
                            </div>
                            <p className="text-body leading-relaxed max-w-xs">
                                A ferramenta mais completa e precisa para simulação de remunerações no serviço público brasileiro.
                            </p>
                            <div className="flex gap-4">
                                <a className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-secondary hover:text-white transition-all" href="#">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path></svg>
                                </a>
                                <a className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-secondary hover:text-white transition-all" href="#">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path></svg>
                                </a>
                                <a className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-secondary hover:text-white transition-all" href="#">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"></path></svg>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-6 text-body-xl">Sobre o Site</h4>
                            <ul className="space-y-4 text-body">
                                <li><Link to="/quem-somos" className="hover:text-primary transition-colors">Quem Somos</Link></li>
                                <li><Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade e Termos</Link></li>
                                <li><Link to="/apoiar" className="hover:text-primary transition-colors">Apoiar o Projeto</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-6 text-body-xl">Links Úteis</h4>
                            <ul className="space-y-4 text-body">
                                <li><a className="hover:text-primary transition-colors" href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer">Portal da Transparência</a></li>
                                <li><a className="hover:text-primary transition-colors" href="https://www.gov.br/receitafederal" target="_blank" rel="noopener noreferrer">Receita Federal</a></li>
                                <li><a className="hover:text-primary transition-colors" href="https://www.in.gov.br" target="_blank" rel="noopener noreferrer">Diário Oficial</a></li>
                                <li><a className="hover:text-primary transition-colors" href="https://www.planalto.gov.br/legislacao" target="_blank" rel="noopener noreferrer">Legislação Federal</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-6 text-body-xl">Contato</h4>
                            <ul className="space-y-4 text-body">
                                <li className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-primary" />
                                    contato@salariodoservidor.com.br
                                </li>
                                <li className="flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    São Paulo, SP
                                </li>
                                <li>
                                    <Link to="/apoiar" className="flex items-center gap-3 hover:text-primary transition-colors group">
                                        <Heart className="w-5 h-5 text-error-400 group-hover:scale-110 transition-transform" />
                                        Apoie o Projeto
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-10 border-t border-neutral-800 text-center md:flex md:justify-between md:text-left items-center">
                        <p className="text-body-xs text-neutral-500 mb-4 md:mb-0">
                            © 2026 Salário do Servidor. Todos os direitos reservados.
                            <span className="block md:inline mt-1 md:mt-0 md:ml-2 opacity-50">Dados meramente ilustrativos, sempre confira com seu órgão oficial.</span>
                        </p>
                        <div className="flex justify-center md:justify-end gap-6 text-body-xs font-semibold">
                            <Link to="/privacidade" className="hover:text-white transition-colors">Privacidade e Termos</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
