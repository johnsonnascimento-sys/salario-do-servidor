/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}"
    ],
    darkMode: "class",
    theme: {
        extend: {
            // ========================================
            // CORES DO DESIGN SYSTEM
            // ========================================
            colors: {
                // Cores Primárias (Teal - Brand)
                primary: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#2dd4bf',
                    500: '#14b8a6',  // DEFAULT - Cor principal
                    600: '#0d9488',
                    700: '#0f766e',
                    800: '#115e59',
                    900: '#134e4a',
                    950: '#042f2e',
                    DEFAULT: '#14b8a6',
                },

                // Cores Secundárias (Blue - Ações)
                secondary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',  // DEFAULT - Botões e CTAs
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                    DEFAULT: '#2563eb',
                },

                // Cores Neutras (Slate - UI Base)
                neutral: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },

                // Cores Semânticas
                success: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',  // DEFAULT
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                    DEFAULT: '#22c55e',
                },

                warning: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',  // DEFAULT
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                    DEFAULT: '#f59e0b',
                },

                error: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',  // DEFAULT
                    600: '#dc2626',
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                    DEFAULT: '#ef4444',
                },

                info: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',  // DEFAULT
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    DEFAULT: '#0ea5e9',
                },

                // Aliases para compatibilidade
                "navy-dark": "#0f172a",
                "background-light": "#f8fafc",
                "background-dark": "#0f172a",
            },

            // ========================================
            // TIPOGRAFIA
            // ========================================
            fontFamily: {
                // Fonte Display (Títulos, Headings)
                display: ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],

                // Fonte Body (Textos, Parágrafos)
                sans: ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],

                // Fonte Mono (Código, Números)
                mono: ["JetBrains Mono", "Fira Code", "monospace"],
            },

            // Escala Tipográfica Completa
            fontSize: {
                // Display (Extra Large)
                'display-2xl': ['4.5rem', { lineHeight: '1.1', fontWeight: '900', letterSpacing: '-0.02em' }],  // 72px
                'display-xl': ['3.75rem', { lineHeight: '1.1', fontWeight: '900', letterSpacing: '-0.02em' }],  // 60px
                'display-lg': ['3rem', { lineHeight: '1.2', fontWeight: '900', letterSpacing: '-0.01em' }],     // 48px

                // Headings
                'h1': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '800' }],      // 36px
                'h2': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],    // 30px
                'h3': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],         // 24px
                'h4': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],     // 20px
                'h5': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],    // 18px
                'h6': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],         // 16px

                // Body Text
                'body-xl': ['1.125rem', { lineHeight: '1.75rem' }],                  // 18px
                'body-lg': ['1rem', { lineHeight: '1.5rem' }],                       // 16px
                'body': ['0.875rem', { lineHeight: '1.25rem' }],                     // 14px - DEFAULT
                'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],                  // 14px (alias de body)
                'body-xs': ['0.875rem', { lineHeight: '1.25rem' }],                  // 14px (alias de body)

                // Labels & Captions
                'label': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }], // 14px
                'caption': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }], // 14px

                // Overline (Small caps)
                'overline': ['0.625rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }],
            },

            // Letter Spacing
            letterSpacing: {
                'tighter': '-0.05em',
                'tight': '-0.025em',
                'normal': '0',
                'wide': '0.025em',
                'wider': '0.05em',
                'widest': '0.1em',
            },

            // Line Height
            lineHeight: {
                'none': '1',
                'tight': '1.25',
                'snug': '1.375',
                'normal': '1.5',
                'relaxed': '1.625',
                'loose': '2',
            },

            // ========================================
            // ESPAÇAMENTOS
            // ========================================
            spacing: {
                '0': '0',
                'px': '1px',
                '0.5': '0.125rem',   // 2px
                '1': '0.25rem',      // 4px
                '1.5': '0.375rem',   // 6px
                '2': '0.5rem',       // 8px
                '2.5': '0.625rem',   // 10px
                '3': '0.75rem',      // 12px
                '3.5': '0.875rem',   // 14px
                '4': '1rem',         // 16px
                '5': '1.25rem',      // 20px
                '6': '1.5rem',       // 24px
                '7': '1.75rem',      // 28px
                '8': '2rem',         // 32px
                '9': '2.25rem',      // 36px
                '10': '2.5rem',      // 40px
                '11': '2.75rem',     // 44px
                '12': '3rem',        // 48px
                '14': '3.5rem',      // 56px
                '16': '4rem',        // 64px
                '20': '5rem',        // 80px
                '24': '6rem',        // 96px
                '28': '7rem',        // 112px
                '32': '8rem',        // 128px
                '36': '9rem',        // 144px
                '40': '10rem',       // 160px
                '44': '11rem',       // 176px
                '48': '12rem',       // 192px
                '52': '13rem',       // 208px
                '56': '14rem',       // 224px
                '60': '15rem',       // 240px
                '64': '16rem',       // 256px
                '72': '18rem',       // 288px
                '80': '20rem',       // 320px
                '96': '24rem',       // 384px
            },

            // Container Max Widths
            maxWidth: {
                '8xl': '90rem',      // 1440px
                '9xl': '96rem',      // 1536px
                'container': '1280px',
            },

            // ========================================
            // BORDER RADIUS
            // ========================================
            borderRadius: {
                'none': '0',
                'sm': '0.125rem',    // 2px
                'DEFAULT': '0.25rem', // 4px
                'md': '0.375rem',    // 6px
                'lg': '0.5rem',      // 8px
                'xl': '0.75rem',     // 12px
                '2xl': '1rem',       // 16px
                '3xl': '1.5rem',     // 24px
                'full': '9999px',

                // Aliases semânticos
                'card': '1rem',      // 16px - Cards
                'input': '0.75rem',  // 12px - Inputs
                'button-sm': '0.5rem',   // 8px - Botões pequenos
                'button-md': '0.75rem',  // 12px - Botões médios
                'button-lg': '0.75rem',  // 12px - Botões grandes
            },

            // ========================================
            // SOMBRAS
            // ========================================
            boxShadow: {
                'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'DEFAULT': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
                'none': 'none',

                // Aliases semânticos
                'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                'floating': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            },

            // ========================================
            // TRANSITIONS
            // ========================================
            transitionDuration: {
                '75': '75ms',
                '100': '100ms',
                '150': '150ms',
                '200': '200ms',   // DEFAULT - Rápido
                '300': '300ms',   // Médio
                '500': '500ms',   // Lento
                '700': '700ms',
                '1000': '1000ms',
            },

            transitionTimingFunction: {
                'DEFAULT': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'linear': 'linear',
                'in': 'cubic-bezier(0.4, 0, 1, 1)',
                'out': 'cubic-bezier(0, 0, 0.2, 1)',
                'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            },

            // ========================================
            // Z-INDEX (Layers Organizados)
            // ========================================
            zIndex: {
                '0': '0',
                '10': '10',
                '20': '20',
                '30': '30',
                '40': '40',
                '50': '50',     // Fixed elements
                '60': '60',     // Dropdowns
                '70': '70',     // Sticky headers
                '80': '80',     // Modals
                '90': '90',     // Tooltips
                '100': '100',   // Notifications
                'auto': 'auto',
                'base': '0',
                'dropdown': '60',
                'sticky': '70',
                'fixed': '50',
                'modal': '80',
                'popover': '90',
                'tooltip': '90',
                'toast': '100',
            },

            // ========================================
            // BREAKPOINTS CUSTOMIZADOS
            // ========================================
            screens: {
                'xs': '480px',    // Extra small (phones)
                'sm': '640px',    // Small (large phones)
                'md': '768px',    // Medium (tablets)
                'lg': '1024px',   // Large (desktops)
                'xl': '1280px',   // Extra large (large desktops)
                '2xl': '1536px',  // 2X Extra large (ultra-wide)
            },

            // ========================================
            // ANIMAÇÕES
            // ========================================
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
                'fade-in': 'fadeIn 0.5s ease-in',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-down': 'slideDown 0.5s ease-out',
            },

            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
