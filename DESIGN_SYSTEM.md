# 🎨 Design System - Salário do Servidor

> **IMPORTANTE**: Este documento define a identidade visual do projeto. Siga estas diretrizes em TODAS as alterações de UI.

---

## 📊 Cores

### Sistema de Cores Completo

O projeto utiliza um sistema de cores completo com 7 famílias de cores, cada uma com 11 tonalidades (50-950) para máxima flexibilidade.

### Paleta Principal

#### Primary (Teal) - Cor da Marca
Uso: Destaques, links, ícones, estados ativos, elementos interativos

| Token | Hex | Exemplo de Uso |
|-------|-----|----------------|
| `primary-50` | `#f0fdfa` | Backgrounds muito claros, hover states |
| `primary-100` | `#ccfbf1` | Backgrounds claros |
| `primary-200` | `#99f6e4` | Borders suaves |
| `primary-300` | `#5eead4` | Elementos secundários |
| `primary-400` | `#2dd4bf` | Hover states |
| `primary-500` / `primary` | `#14b8a6` | **COR PRINCIPAL** - Elementos primários |
| `primary-600` | `#0d9488` | Estados ativos |
| `primary-700` | `#0f766e` | Textos em backgrounds claros |
| `primary-800` | `#115e59` | Textos escuros |
| `primary-900` | `#134e4a` | Textos muito escuros |
| `primary-950` | `#042f2e` | Backgrounds muito escuros |

```tsx
// Exemplos de uso
className="text-primary"           // Texto principal
className="bg-primary-50"          // Background claro
className="border-primary-200"     // Border suave
className="hover:bg-primary-500"   // Hover state
```

#### Secondary (Blue) - Cor Secundária
Uso: Botões principais, gradientes, CTAs, elementos de destaque

| Token | Hex | Exemplo de Uso |
|-------|-----|----------------|
| `secondary-50` | `#eff6ff` | Backgrounds muito claros |
| `secondary-100` | `#dbeafe` | Backgrounds claros |
| `secondary-200` | `#bfdbfe` | Borders, dividers |
| `secondary-300` | `#93c5fd` | Elementos terciários |
| `secondary-400` | `#60a5fa` | Hover states |
| `secondary-500` | `#3b82f6` | Elementos secundários |
| `secondary-600` / `secondary` | `#2563eb` | **COR SECUNDÁRIA** - CTAs, botões |
| `secondary-700` | `#1d4ed8` | Estados ativos |
| `secondary-800` | `#1e40af` | Textos em backgrounds claros |
| `secondary-900` | `#1e3a8a` | Textos escuros |
| `secondary-950` | `#172554` | Backgrounds escuros |

#### Neutral (Slate) - Escala de Cinzas
Uso: Textos, backgrounds, bordas, elementos estruturais

| Token | Hex | Exemplo de Uso |
|-------|-----|----------------|
| `neutral-50` | `#f8fafc` | Background claro padrão |
| `neutral-100` | `#f1f5f9` | Backgrounds alternativos |
| `neutral-200` | `#e2e8f0` | Borders, dividers |
| `neutral-300` | `#cbd5e1` | Borders mais escuros |
| `neutral-400` | `#94a3b8` | Placeholders, textos desabilitados |
| `neutral-500` | `#64748b` | Textos secundários |
| `neutral-600` | `#475569` | Textos normais |
| `neutral-700` | `#334155` | Textos importantes |
| `neutral-800` | `#1e293b` | Backgrounds escuros |
| `neutral-900` | `#0f172a` | Background modo escuro, textos muito escuros |
| `neutral-950` | `#020617` | Backgrounds mais escuros possível |

### Cores Semânticas

#### Success (Green) - Sucesso
Uso: Confirmações, valores positivos, status de sucesso

| Token | Hex | Exemplo de Uso |
|-------|-----|----------------|
| `success-50` | `#f0fdf4` | Backgrounds de sucesso |
| `success-500` / `success` | `#22c55e` | **COR DE SUCESSO** |
| `success-600` | `#16a34a` | Estados ativos |
| `success-700` | `#15803d` | Textos |

```tsx
className="text-success"           // Texto de sucesso
className="bg-success-50"          // Background de sucesso
className="border-success-500"     // Border de sucesso
```

#### Warning (Orange) - Aviso
Uso: Alertas, avisos não críticos, ações que requerem atenção

| Token | Hex | Exemplo de Uso |
|-------|-----|----------------|
| `warning-50` | `#fff7ed` | Backgrounds de aviso |
| `warning-500` / `warning` | `#f97316` | **COR DE AVISO** |
| `warning-600` | `#ea580c` | Estados ativos |
| `warning-700` | `#c2410c` | Textos |

#### Error (Red) - Erro
Uso: Erros, valores negativos, ações destrutivas, validações

| Token | Hex | Exemplo de Uso |
|-------|-----|----------------|
| `error-50` | `#fef2f2` | Backgrounds de erro |
| `error-500` / `error` | `#ef4444` | **COR DE ERRO** |
| `error-600` | `#dc2626` | Estados ativos |
| `error-700` | `#b91c1c` | Textos |

```tsx
className="text-error"             // Texto de erro
className="bg-error-50"            // Background de erro
className="border-error-500"       // Border de erro
```

#### Info (Sky Blue) - Informação
Uso: Mensagens informativas, dicas, tooltips, notificações neutras

| Token | Hex | Exemplo de Uso |
|-------|-----|----------------|
| `info-50` | `#f0f9ff` | Backgrounds informativos |
| `info-500` / `info` | `#0ea5e9` | **COR DE INFO** |
| `info-600` | `#0284c7` | Estados ativos |
| `info-700` | `#0369a1` | Textos |

### Gradientes

```css
/* Gradiente da Marca (Brand) - Primary → Secondary */
.brand-gradient {
  background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%);
}

/* Texto com Gradiente */
.brand-gradient-text {
  background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Gradiente de Sucesso */
.success-gradient {
  background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
}

/* Gradiente de Aviso */
.warning-gradient {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
}
```

```tsx
// Uso em componentes
className="bg-gradient-to-r from-secondary-600 to-primary-500"
className="bg-gradient-to-br from-success-500 to-success-600"
```

---

## 🔤 Tipografia

### Fonte Principal
- **Família**: `Plus Jakarta Sans`
- **Importação**: Google Fonts (já no `index.html`)
- **Token Tailwind**: `font-display`
- **Características**: Moderna, legível, geométrica, ideal para interfaces

### Sistema de Tamanhos Tipográficos

O sistema utiliza uma escala tipográfica completa com tokens semânticos para diferentes contextos.

#### Display (Hero, Landing Pages)

| Token | Tamanho | Line Height | Weight | Exemplo de Uso |
|-------|---------|-------------|--------|----------------|
| `text-display-2xl` | 4.5rem (72px) | 1.1 | 900 | Hero sections, títulos principais |
| `text-display-xl` | 3.75rem (60px) | 1.15 | 900 | Títulos de destaque |
| `text-display-lg` | 3rem (48px) | 1.2 | 800 | Títulos de seção principais |
| `text-display-md` | 2.25rem (36px) | 1.25 | 800 | Títulos de página |
| `text-display-sm` | 1.875rem (30px) | 1.3 | 700 | Subtítulos grandes |

```tsx
<h1 className="text-display-md text-neutral-900 dark:text-white">
  Título da Página
</h1>
```

#### Headings (Hierarquia de Títulos)

| Token | Tamanho | Line Height | Weight | Exemplo de Uso |
|-------|---------|-------------|--------|----------------|
| `text-h1` | 2.25rem (36px) | 2.5rem | 800 | H1 - Título principal da página |
| `text-h2` | 1.875rem (30px) | 2.25rem | 700 | H2 - Seções principais |
| `text-h3` | 1.5rem (24px) | 2rem | 700 | H3 - Subseções |
| `text-h4` | 1.25rem (20px) | 1.75rem | 600 | H4 - Títulos de cards |
| `text-h5` | 1.125rem (18px) | 1.75rem | 600 | H5 - Títulos menores |
| `text-h6` | 1rem (16px) | 1.5rem | 600 | H6 - Títulos mínimos |

```tsx
<h2 className="text-h2 text-neutral-900 dark:text-white mb-4">
  Seção Principal
</h2>

<h3 className="text-h3 text-neutral-800 dark:text-neutral-100 mb-3">
  Subseção
</h3>
```

#### Body (Textos Comuns)

| Token | Tamanho | Line Height | Exemplo de Uso |
|-------|---------|-------------|----------------|
| `text-body-xl` | 1.125rem (18px) | 1.75rem | Textos de destaque, introduções |
| `text-body-lg` | 1rem (16px) | 1.5rem | Textos normais grandes |
| `text-body` | 0.875rem (14px) | 1.25rem | **PADRÃO** - Textos normais |
| `text-body-sm` | 0.75rem (12px) | 1rem | Textos pequenos, legendas |
| `text-body-xs` | 0.625rem (10px) | 1rem | Textos muito pequenos |

```tsx
<p className="text-body text-neutral-600 dark:text-neutral-300">
  Texto padrão do parágrafo
</p>

<span className="text-body-sm text-neutral-500">
  Legenda ou texto secundário
</span>
```

#### Labels (Rótulos e Metadados)

| Token | Tamanho | Line Height | Weight | Características | Exemplo de Uso |
|-------|---------|-------------|--------|----------------|----------------|
| `text-label-lg` | 0.875rem (14px) | 1.25rem | 600 | uppercase, tracking-wide | Labels grandes |
| `text-label` | 0.75rem (12px) | 1rem | 600 | uppercase, tracking-wider | **PADRÃO** - Labels normais |
| `text-label-sm` | 0.625rem (10px) | 1rem | 700 | uppercase, tracking-widest | Labels pequenos, metadados |

```tsx
<label className="text-label text-neutral-500 uppercase tracking-wider mb-1.5 block">
  Nome do Campo
</label>

<span className="text-label-sm text-neutral-400 uppercase tracking-widest">
  Categoria
</span>
```

### Hierarquia de Títulos (Uso Prático)

| Contexto | Classes Recomendadas |
|----------|---------------------|
| **Título da Página Principal** | `text-h1 font-extrabold text-neutral-900 dark:text-white` |
| **Seção Principal** | `text-h2 font-bold text-neutral-800 dark:text-neutral-100` |
| **Card/Grupo** | `text-h4 font-bold text-neutral-700 dark:text-neutral-200` |
| **Subseção em Card** | `text-label text-neutral-500 dark:text-neutral-400 uppercase tracking-widest` |
| **Texto Normal** | `text-body text-neutral-600 dark:text-neutral-300` |
| **Texto Secundário** | `text-body-sm text-neutral-500 dark:text-neutral-400` |
| **Legenda/Metadado** | `text-body-xs text-neutral-400 dark:text-neutral-500` |

### Pesos de Fonte (Font Weights)

| Token | Valor | Uso |
|-------|-------|-----|
| `font-normal` | 400 | Textos normais |
| `font-medium` | 500 | Destaque suave |
| `font-semibold` | 600 | Subtítulos, labels |
| `font-bold` | 700 | Títulos, botões |
| `font-extrabold` | 800 | Títulos principais |
| `font-black` | 900 | Display, hero sections |

---

## 🎭 Ícones

### Biblioteca Oficial
> ⚠️ **Usar APENAS Lucide React**. NÃO usar Material Symbols.

```tsx
import { Heart, Settings, ArrowLeft } from 'lucide-react';

// Tamanhos padrão
<Heart className="w-4 h-4" />  // Pequeno (botões)
<Heart className="w-5 h-5" />  // Médio (navegação)
<Heart className="w-6 h-6" />  // Grande (destaque)
<Heart className="w-8 h-8" />  // Extra grande (hero)
```

### Ícones Mais Usados

| Contexto | Ícone |
|----------|-------|
| Voltar | `ArrowLeft` |
| Configurações | `Settings` |
| Doação/Apoio | `Heart` |
| Modo Claro | `Sun` |
| Modo Escuro | `Moon` |
| Email | `Mail` |
| Localização | `MapPin` |
| Menu | `Menu` |
| Fechar | `X` |
| Copiar | `Copy` |
| Confirmação | `Check` |
| Adicionar | `Plus`, `PlusCircle` |
| Remover | `Trash2`, `X` |
| Dinheiro | `DollarSign` |
| Lista | `List` |
| Recibo | `Receipt` |

---

## 🔘 Botões

### Classes Utilitárias (index.css)

```tsx
// Botão Base
<button className="btn btn-md btn-primary">
  Ação Principal
</button>

// Variantes de Tamanho
className="btn btn-sm"   // Pequeno
className="btn btn-md"   // Médio (padrão)
className="btn btn-lg"   // Grande

// Variantes de Estilo
className="btn btn-primary"    // Gradiente azul→teal, branco
className="btn btn-secondary"  // Branco com borda
className="btn btn-ghost"      // Transparente, hover sutil
className="btn btn-danger"     // Vermelho para ações destrutivas
```

### Botão de Destaque (Apoiar)

```tsx
<Link 
  to="/apoiar" 
  className="btn btn-sm bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-bold hover:shadow-lg hover:shadow-rose-500/30 transition-all"
>
  <Heart className="w-4 h-4" />
  Apoiar
</Link>
```

---

## 🃏 Cards

### Card Padrão

```tsx
<div className="card p-6">
  {/* Conteúdo */}
</div>

// Ou manualmente:
<div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card">
```

### Card com Título de Seção

```tsx
<div className="card p-6">
  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
    <Settings className="w-4 h-4" />
    Título da Seção
  </h3>
  {/* Conteúdo */}
</div>
```

---

## 📐 Espaçamento

### Sistema de Espaçamento

O projeto utiliza a escala padrão do Tailwind (0-96) para spacing consistente.

#### Escala de Espaçamento Base

| Token | Valor (rem) | Pixels | Uso Comum |
|-------|-------------|--------|-----------|
| `0` | 0 | 0px | Reset |
| `0.5` | 0.125rem | 2px | Micro spacing |
| `1` | 0.25rem | 4px | Spacing mínimo |
| `1.5` | 0.375rem | 6px | Entre label e input |
| `2` | 0.5rem | 8px | Padding pequeno |
| `3` | 0.75rem | 12px | Padding médio |
| `4` | 1rem | 16px | **Padrão** - Gap entre elementos |
| `5` | 1.25rem | 20px | Padding maior |
| `6` | 1.5rem | 24px | Padding de cards |
| `8` | 2rem | 32px | Gap entre cards |
| `10` | 2.5rem | 40px | Seções |
| `12` | 3rem | 48px | Seções maiores |
| `16` | 4rem | 64px | Separação de seções |
| `20` | 5rem | 80px | Espaçamento grande |
| `24` | 6rem | 96px | Hero sections |

### Container Principal

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Conteúdo */}
</div>

// Ou usando a classe utilitária:
<div className="container-app">
```

### Breakpoints e Max-Width

| Breakpoint | Min Width | Container Max-Width | Uso |
|------------|-----------|---------------------|-----|
| `xs` | 475px | 100% | Mobile pequeno |
| `sm` | 640px | 640px | Mobile |
| `md` | 768px | 768px | Tablet |
| `lg` | 1024px | 1024px | Desktop pequeno |
| `xl` | 1280px | 1280px | Desktop |
| `2xl` | 1536px | 1536px | Desktop grande |

```tsx
// Responsive spacing
className="px-4 sm:px-6 lg:px-8"
className="py-8 md:py-12 lg:py-16"
```

### Gaps Padrão (Uso Prático)

| Contexto | Gap | Exemplo |
|----------|-----|---------|
| **Entre cards principais** | `gap-8` (32px) | Grid de cards |
| **Entre items em card** | `gap-4` (16px) ou `gap-6` (24px) | Elementos internos |
| **Entre label e input** | `gap-1.5` (6px) | Forms |
| **Grid de formulário** | `gap-4` (16px) ou `gap-6` (24px) | Form layouts |
| **Entre seções** | `gap-12` (48px) ou `gap-16` (64px) | Separação visual |
| **Padding de cards** | `p-6` (24px) | Espaçamento interno |
| **Padding de botões** | `px-4 py-2` (16px/8px) | Botões normais |
| **Padding de inputs** | `px-4 py-3` (16px/12px) | Campos de input |

```tsx
// Grid de cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {/* Cards */}
</div>

// Card com padding interno
<div className="card p-6 space-y-4">
  {/* Conteúdo com gap vertical */}
</div>

// Form com spacing
<form className="space-y-6">
  <div className="space-y-1.5">
    <label className="text-label">Nome</label>
    <input className="input" />
  </div>
</form>
```

---

## 🎚️ Z-Index (Camadas de Profundidade)

### Sistema de Camadas Semântico

O projeto utiliza um sistema de z-index organizado semanticamente para evitar conflitos.

| Token | Valor | Uso | Exemplo |
|-------|-------|-----|---------|
| `z-base` | 0 | Camada base padrão | Elementos normais |
| `z-dropdown` | 60 | Dropdowns, menus | Select customizado |
| `z-sticky` | 70 | Elementos sticky/fixed | Sidebar fixa |
| `z-header` | 75 | Header fixo | Navbar |
| `z-modal` | 80 | Modais, overlays | Diálogos |
| `z-popover` | 85 | Popovers sobre modais | Tooltips em modais |
| `z-tooltip` | 90 | Tooltips | Dicas contextuais |
| `z-toast` | 100 | Notificações toast | Alertas flutuantes |

```tsx
// Header fixo
<header className="fixed top-0 z-header">
  {/* Conteúdo */}
</header>

// Sidebar sticky
<aside className="sticky top-0 z-sticky">
  {/* Conteúdo */}
</aside>

// Modal
<div className="fixed inset-0 z-modal">
  <div className="overlay" />
  <div className="modal-content" />
</div>

// Toast notification
<div className="fixed top-4 right-4 z-toast">
  {/* Notificação */}
</div>
```

### Hierarquia Visual (Resumo)

```
Base (0) → Dropdown (60) → Sticky (70) → Header (75) → Modal (80) → Popover (85) → Tooltip (90) → Toast (100)
```

---

## 🎬 Animações e Transições

### Animações Predefinidas

O sistema inclui animações reutilizáveis para interações comuns.

#### Fade In (Aparecer Suavemente)

```tsx
<div className="animate-fade-in">
  {/* Conteúdo aparece suavemente */}
</div>

// CSS gerado:
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-in;
}
```

#### Slide Up (Deslizar para Cima)

```tsx
<div className="animate-slide-up">
  {/* Conteúdo desliza de baixo para cima */}
</div>

// CSS gerado:
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-slide-up {
  animation: slideUp 0.5s ease-out;
}
```

#### Slide Down (Deslizar para Baixo)

```tsx
<div className="animate-slide-down">
  {/* Conteúdo desliza de cima para baixo */}
</div>

// CSS gerado:
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-slide-down {
  animation: slideDown 0.5s ease-out;
}
```

### Transições Customizadas

| Token | Duração | Timing Function | Uso |
|-------|---------|-----------------|-----|
| `transition-fast` | 150ms | ease-in-out | Hover rápido |
| `transition-base` | 200ms | ease-in-out | **Padrão** |
| `transition-slow` | 300ms | ease-in-out | Animações suaves |
| `transition-slower` | 500ms | ease-in-out | Modais, overlays |

```tsx
// Botão com hover rápido
<button className="transition-fast hover:bg-primary-600">
  Click
</button>

// Card com transição suave
<div className="transition-slow hover:shadow-card-hover hover:scale-105">
  {/* Card */}
</div>

// Modal com fade lento
<div className="transition-slower opacity-0 data-[open]:opacity-100">
  {/* Modal */}
</div>
```

### Uso Prático de Transições

```tsx
// Botão padrão
className="transition-all duration-200 hover:bg-primary-600 hover:shadow-lg"

// Card interativo
className="transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"

// Input com focus
className="transition-all focus:ring-2 focus:ring-secondary focus:border-transparent"

// Accordion/Collapse
className="transition-all duration-500 data-[open]:max-h-96 max-h-0 overflow-hidden"
```

---

## 🌗 Modo Escuro

### Sistema de Cores para Dark Mode

O projeto utiliza a escala `neutral` (slate) para garantir consistência entre modos claro e escuro.

#### Padrão de Backgrounds

| Contexto | Light Mode | Dark Mode | Classes |
|----------|-----------|-----------|---------|
| **Background principal** | `neutral-50` | `neutral-900` | `bg-neutral-50 dark:bg-neutral-900` |
| **Background de cards** | `white` | `neutral-800` | `bg-white dark:bg-neutral-800` |
| **Background alternativo** | `neutral-100` | `neutral-800` | `bg-neutral-100 dark:bg-neutral-800` |
| **Background hover** | `neutral-100` | `neutral-700` | `hover:bg-neutral-100 dark:hover:bg-neutral-700` |
| **Background desabilitado** | `neutral-100` | `neutral-900` | `bg-neutral-100 dark:bg-neutral-900` |

```tsx
// Background principal da página
className="min-h-screen bg-neutral-50 dark:bg-neutral-900"

// Card
className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card"

// Input
className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
```

#### Padrão de Textos

| Contexto | Light Mode | Dark Mode | Classes |
|----------|-----------|-----------|---------|
| **Texto primário** | `neutral-900` | `white` | `text-neutral-900 dark:text-white` |
| **Texto secundário** | `neutral-700` | `neutral-100` | `text-neutral-700 dark:text-neutral-100` |
| **Texto normal** | `neutral-600` | `neutral-300` | `text-neutral-600 dark:text-neutral-300` |
| **Texto suave** | `neutral-500` | `neutral-400` | `text-neutral-500 dark:text-neutral-400` |
| **Texto desabilitado** | `neutral-400` | `neutral-500` | `text-neutral-400 dark:text-neutral-500` |

```tsx
// Título
className="text-h2 text-neutral-900 dark:text-white"

// Texto normal
className="text-body text-neutral-600 dark:text-neutral-300"

// Label
className="text-label text-neutral-500 dark:text-neutral-400"
```

#### Padrão de Bordas

| Contexto | Light Mode | Dark Mode | Classes |
|----------|-----------|-----------|---------|
| **Border padrão** | `neutral-200` | `neutral-700` | `border-neutral-200 dark:border-neutral-700` |
| **Border suave** | `neutral-100` | `neutral-800` | `border-neutral-100 dark:border-neutral-800` |
| **Border forte** | `neutral-300` | `neutral-600` | `border-neutral-300 dark:border-neutral-600` |
| **Divider** | `neutral-200` | `neutral-700` | `border-t border-neutral-200 dark:border-neutral-700` |

```tsx
// Card com borda
className="border border-neutral-200 dark:border-neutral-700"

// Divider
className="border-t border-neutral-200 dark:border-neutral-700 my-6"
```

### Cores de Marca no Dark Mode

As cores de marca (primary, secondary) e semânticas (success, warning, error, info) **permanecem as mesmas** em ambos os modos, pois já possuem contraste adequado.

```tsx
// ✅ CORRETO - Cores de marca não mudam
className="text-primary"              // Funciona em ambos os modos
className="bg-secondary-600"          // Funciona em ambos os modos
className="text-success"              // Funciona em ambos os modos

// ❌ ERRADO - Não precisa de variante dark
className="text-primary dark:text-primary-400"  // Desnecessário
```

---

## 📝 Inputs

### Input Padrão

```tsx
<input 
  className="input"
  placeholder="Placeholder..."
/>

// Ou manualmente:
<input 
  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
/>
```

### Select

```tsx
<select className="input">
  <option>Opção 1</option>
</select>
```

---

## 🎯 Border Radius (Arredondamento)

### Sistema de Border Radius

O projeto utiliza arredondamentos generosos para uma estética moderna e amigável.

| Token | Valor | Uso | Exemplo |
|-------|-------|-----|---------|
| `rounded-none` | 0px | Elementos sem arredondamento | Dividers |
| `rounded-sm` | 0.125rem (2px) | Arredondamento mínimo | Badges pequenos |
| `rounded` | 0.25rem (4px) | Arredondamento padrão | — |
| `rounded-md` | 0.375rem (6px) | Arredondamento médio | — |
| `rounded-lg` | 0.5rem (8px) | **Botões pequenos** | Botões secundários |
| `rounded-xl` | 0.75rem (12px) | **Inputs e botões** | Campos de formulário |
| `rounded-2xl` | 1rem (16px) | **Cards padrão** | Cards, containers |
| `rounded-3xl` | 1.5rem (24px) | Cards especiais | Hero cards |
| `rounded-full` | 9999px | **Pills, avatares** | Badges, chips |

### Padrões de Uso

| Componente | Border Radius | Classes |
|------------|---------------|---------|
| **Cards principais** | 2xl (16px) | `rounded-2xl` |
| **Cards de destaque** | 3xl (24px) | `rounded-3xl` |
| **Inputs** | xl (12px) | `rounded-xl` |
| **Botões primários** | xl (12px) | `rounded-xl` |
| **Botões secundários** | lg (8px) | `rounded-lg` |
| **Badges/Pills** | full (circular) | `rounded-full` |
| **Accordions** | 2xl (16px) | `rounded-2xl` |
| **Modais** | 2xl (16px) | `rounded-2xl` |
| **Dropdowns** | xl (12px) | `rounded-xl` |
| **Imagens/Avatares** | full (circular) | `rounded-full` |

```tsx
// Card padrão
<div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
  {/* Conteúdo */}
</div>

// Input
<input className="input rounded-xl" />

// Botão primário
<button className="btn btn-primary rounded-xl">
  Ação
</button>

// Badge
<span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-label">
  Novo
</span>
```

---

## 🌊 Sombras (Shadows)

### Sistema de Sombras

As sombras seguem uma hierarquia de profundidade para criar senso de elevação.

#### Sombras Customizadas

| Token | Uso | Contexto |
|-------|-----|----------|
| `shadow-card` | Elevação padrão de cards | Cards em repouso |
| `shadow-card-hover` | Elevação de cards em hover | Cards interativos |
| `shadow-modal` | Elevação de modais | Diálogos, overlays |

```css
/* Definições em tailwind.config.js */
boxShadow: {
  'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  'card-hover': '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
  'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
}
```

#### Sombras do Tailwind (Padrão)

| Classe | Uso | Exemplo |
|--------|-----|---------|
| `shadow-sm` | Sombra muito suave | Hover de inputs |
| `shadow` | Sombra padrão | Elementos elevados |
| `shadow-md` | Sombra média | Dropdowns |
| `shadow-lg` | Sombra grande | Botões de destaque |
| `shadow-xl` | Sombra extra grande | Modais |
| `shadow-2xl` | Sombra máxima | Hero sections |
| `shadow-none` | Sem sombra | Reset |

### Sombras Coloridas

Para botões e elementos de destaque, use sombras coloridas para criar efeito de "glow".

```tsx
// Botão primário com glow
<button className="bg-secondary-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 transition-all">
  Ação Principal
</button>

// Botão de sucesso com glow
<button className="bg-success-500 text-white px-6 py-3 rounded-xl shadow-lg shadow-success/25 hover:shadow-xl hover:shadow-success/30 transition-all">
  Confirmar
</button>

// Card interativo
<div className="card shadow-card hover:shadow-card-hover transition-all cursor-pointer">
  {/* Conteúdo */}
</div>
```

### Padrões de Uso

| Componente | Sombra | Hover | Classes |
|------------|--------|-------|---------|
| **Cards** | `shadow-card` | `shadow-card-hover` | `shadow-card hover:shadow-card-hover transition-all` |
| **Inputs** | `shadow-sm` | `shadow` | `shadow-sm focus:shadow` |
| **Botões primários** | `shadow-lg shadow-secondary/25` | `shadow-xl shadow-secondary/30` | Ver exemplo acima |
| **Dropdowns** | `shadow-md` | — | `shadow-md` |
| **Modais** | `shadow-modal` | — | `shadow-modal` |
| **Floating elements** | `shadow-xl` | — | `shadow-xl` |

---

## 🎨 Exemplos de Componentes Completos

### Card de Resultado (Exemplo Real)

```tsx
<div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-card p-6">
  {/* Header */}
  <h3 className="text-label text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
    <DollarSign className="w-4 h-4" />
    Resultado Final
  </h3>

  {/* Valor principal */}
  <div className="mb-6">
    <p className="text-body-sm text-neutral-500 dark:text-neutral-400 mb-1">
      Salário Líquido
    </p>
    <p className="text-display-md font-black text-neutral-900 dark:text-white brand-gradient-text">
      R$ 8.500,00
    </p>
  </div>

  {/* Detalhes */}
  <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-700 pt-4">
    <div className="flex justify-between items-center">
      <span className="text-body text-neutral-600 dark:text-neutral-300">Bruto</span>
      <span className="text-body font-semibold text-neutral-900 dark:text-white">
        R$ 10.000,00
      </span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-body text-neutral-600 dark:text-neutral-300">PSS</span>
      <span className="text-body font-semibold text-error">
        - R$ 1.200,00
      </span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-body text-neutral-600 dark:text-neutral-300">IRRF</span>
      <span className="text-body font-semibold text-error">
        - R$ 300,00
      </span>
    </div>
  </div>
</div>
```

### Formulário Completo

```tsx
<form className="space-y-6">
  {/* Seção */}
  <div className="card p-6">
    <h3 className="text-h4 text-neutral-800 dark:text-neutral-100 mb-6">
      Dados Básicos
    </h3>

    {/* Grid de campos */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Campo de texto */}
      <div className="space-y-1.5">
        <label className="text-label text-neutral-600 dark:text-neutral-300 block">
          Nome Completo
        </label>
        <input
          type="text"
          className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl py-3 px-4 text-body text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all shadow-sm"
          placeholder="Digite seu nome"
        />
      </div>

      {/* Select */}
      <div className="space-y-1.5">
        <label className="text-label text-neutral-600 dark:text-neutral-300 block">
          Cargo
        </label>
        <select className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl py-3 px-4 text-body text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all shadow-sm">
          <option>Selecione...</option>
          <option>Analista</option>
          <option>Técnico</option>
        </select>
      </div>
    </div>

    {/* Botões */}
    <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
      <button
        type="submit"
        className="flex-1 bg-gradient-to-r from-secondary-600 to-primary-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 transition-all"
      >
        Calcular
      </button>
      <button
        type="button"
        className="px-6 py-3 rounded-xl font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all"
      >
        Limpar
      </button>
    </div>
  </div>
</form>
```

### Botões com Ícones

```tsx
// Botão primário com ícone
<button className="bg-gradient-to-r from-secondary-600 to-primary-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 transition-all flex items-center gap-2">
  <FileText className="w-5 h-5" />
  Exportar PDF
</button>

// Botão secundário com ícone
<button className="bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-6 py-3 rounded-xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all flex items-center gap-2">
  <TableIcon className="w-5 h-5" />
  Exportar Excel
</button>

// Botão de sucesso
<button className="bg-success-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-success/25 hover:shadow-xl hover:shadow-success/30 transition-all flex items-center gap-2">
  <Check className="w-5 h-5" />
  Confirmar
</button>

// Botão de erro/destrutivo
<button className="bg-error-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-error/25 hover:shadow-xl hover:shadow-error/30 transition-all flex items-center gap-2">
  <Trash2 className="w-5 h-5" />
  Excluir
</button>
```

### Badge/Chip

```tsx
// Badge de status
<span className="inline-flex items-center gap-1.5 bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 px-3 py-1 rounded-full text-label font-semibold">
  <Check className="w-3 h-3" />
  Ativo
</span>

<span className="inline-flex items-center gap-1.5 bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 px-3 py-1 rounded-full text-label font-semibold">
  <AlertCircle className="w-3 h-3" />
  Pendente
</span>

<span className="inline-flex items-center gap-1.5 bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 px-3 py-1 rounded-full text-label font-semibold">
  <X className="w-3 h-3" />
  Inativo
</span>

// Badge de categoria
<span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-3 py-1 rounded-full text-label">
  Benefícios
</span>
```

### Modal/Dialog

```tsx
<div className="fixed inset-0 z-modal flex items-center justify-center p-4">
  {/* Overlay */}
  <div className="absolute inset-0 bg-neutral-900/50 dark:bg-neutral-950/70 backdrop-blur-sm" />

  {/* Modal */}
  <div className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-modal max-w-md w-full p-6 animate-fade-in">
    {/* Header */}
    <div className="flex items-start justify-between mb-4">
      <h2 className="text-h3 text-neutral-900 dark:text-white">
        Confirmar Ação
      </h2>
      <button className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Conteúdo */}
    <p className="text-body text-neutral-600 dark:text-neutral-300 mb-6">
      Tem certeza que deseja realizar esta ação? Esta operação não pode ser desfeita.
    </p>

    {/* Ações */}
    <div className="flex gap-3">
      <button className="flex-1 bg-error-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-error-600 transition-all">
        Confirmar
      </button>
      <button className="flex-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2.5 rounded-xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all">
        Cancelar
      </button>
    </div>
  </div>
</div>
```

### Toast/Notification

```tsx
<div className="fixed top-4 right-4 z-toast animate-slide-down">
  {/* Success toast */}
  <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl border-l-4 border-success-500 p-4 min-w-[320px]">
    <div className="flex items-start gap-3">
      <div className="bg-success-100 dark:bg-success-900/30 p-2 rounded-lg">
        <Check className="w-5 h-5 text-success-600 dark:text-success-400" />
      </div>
      <div className="flex-1">
        <h4 className="text-body font-semibold text-neutral-900 dark:text-white mb-1">
          Sucesso!
        </h4>
        <p className="text-body-sm text-neutral-600 dark:text-neutral-300">
          Operação realizada com sucesso.
        </p>
      </div>
      <button className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
</div>
```

---

## 📁 Estrutura de Arquivos CSS

```
src/
├── index.css          # Design system e classes utilitárias
├── tailwind.config.js # Tokens de cor e fonte
└── components/
    ├── Accordion.tsx  # Componente reutilizável
    └── Inputs.tsx     # Componentes de input
```

---

## ✅ Checklist de Revisão de UI

Antes de finalizar qualquer alteração de UI, verifique:

### Cores
- [ ] Usando tokens de cor (`primary`, `secondary`, `neutral`, etc.) não hardcoded
- [ ] Cores semânticas (`success`, `warning`, `error`, `info`) para estados
- [ ] Escala de tonalidades apropriada (50-950)
- [ ] Dark mode com variantes `dark:` para neutral/slate
- [ ] Cores de marca (primary/secondary) sem variante dark (já tem contraste)

### Tipografia
- [ ] Fonte `Plus Jakarta Sans` aplicada (herda de body)
- [ ] Tokens de tamanho semânticos (`text-h1`, `text-body`, `text-label`)
- [ ] Pesos de fonte consistentes (`font-bold`, `font-semibold`)
- [ ] Line heights adequados (já incluídos nos tokens)
- [ ] Uppercase + tracking-widest para labels

### Espaçamento
- [ ] Usando escala Tailwind (4, 6, 8, 12, 16)
- [ ] Gap consistente entre elementos (gap-4, gap-6, gap-8)
- [ ] Padding de cards padrão (p-6)
- [ ] Espaçamento responsivo quando necessário (p-4 sm:p-6)

### Componentes
- [ ] Border-radius consistente (cards: rounded-2xl, inputs: rounded-xl)
- [ ] Sombras apropriadas (shadow-card para cards)
- [ ] Ícones usando Lucide React (não Material Symbols)
- [ ] Transições suaves (transition-all duration-200)
- [ ] Z-index semântico quando necessário

### Acessibilidade
- [ ] Contraste adequado (textos dark: neutral-600+, light: neutral-300-)
- [ ] Focus states visíveis (focus:ring-2)
- [ ] Hover states indicativos
- [ ] Labels associados a inputs
- [ ] ARIA labels quando necessário

### Modo Escuro
- [ ] Backgrounds: `bg-white dark:bg-neutral-800`
- [ ] Textos: `text-neutral-600 dark:text-neutral-300`
- [ ] Bordas: `border-neutral-200 dark:border-neutral-700`
- [ ] Testado em ambos os modos

---

## 🚫 O que NÃO fazer

### Ícones

```tsx
// ❌ ERRADO: Material Symbols
<span className="material-symbols-outlined">favorite</span>

// ✅ CORRETO: Lucide React
<Heart className="w-5 h-5" />
```

### Cores

```tsx
// ❌ ERRADO: Cores hardcoded (valores arbitrários)
className="text-blue-600"
className="bg-indigo-700"
className="text-[#3b82f6]"

// ✅ CORRETO: Tokens semânticos do design system
className="text-secondary"
className="bg-primary-500"
className="text-success"

// ❌ ERRADO: Escala de cor errada
className="text-slate-600"  // Use neutral-600

// ✅ CORRETO: Usar a escala neutral
className="text-neutral-600"
```

### Tipografia

```tsx
// ❌ ERRADO: Tamanhos arbitrários
className="text-[14px]"
className="text-base"  // Genérico demais

// ✅ CORRETO: Tokens semânticos
className="text-body"
className="text-h3"
className="text-label"

// ❌ ERRADO: Line-height manual desnecessário
className="text-2xl leading-8"

// ✅ CORRETO: Usar tokens que já incluem line-height
className="text-h2"
```

### Border Radius

```tsx
// ❌ ERRADO: Border-radius inconsistente
className="rounded-md"   // Card 1
className="rounded-3xl"  // Card 2
className="rounded-lg"   // Card 3

// ✅ CORRETO: Padrão consistente
className="rounded-2xl"  // Todos os cards
className="rounded-xl"   // Todos os inputs
className="rounded-full" // Todos os badges
```

### Espaçamento

```tsx
// ❌ ERRADO: Valores arbitrários
className="p-[20px]"
className="gap-[24px]"
className="mb-[16px]"

// ✅ CORRETO: Escala do Tailwind
className="p-6"     // 24px
className="gap-6"   // 24px
className="mb-4"    // 16px

// ❌ ERRADO: Espaçamento inconsistente
<div className="p-5">   // Card 1
<div className="p-7">   // Card 2

// ✅ CORRETO: Padrão consistente
<div className="p-6">   // Todos os cards
```

### Dark Mode

```tsx
// ❌ ERRADO: Cores de marca com variante dark desnecessária
className="text-primary dark:text-primary-400"  // Primary já funciona em ambos

// ✅ CORRETO: Primary/Secondary sem variante dark
className="text-primary"
className="bg-secondary-600"

// ❌ ERRADO: Esquecer variante dark para neutral
className="bg-white text-neutral-900"

// ✅ CORRETO: Sempre incluir dark: para neutral/backgrounds
className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
```

### Z-Index

```tsx
// ❌ ERRADO: Valores arbitrários
className="z-[999]"
className="z-50"  // Não semântico

// ✅ CORRETO: Tokens semânticos
className="z-modal"
className="z-tooltip"
className="z-sticky"
```

### Transições

```tsx
// ❌ ERRADO: Sem transição ou transição genérica
className="hover:bg-primary-600"  // Mudança abrupta

// ✅ CORRETO: Transição suave
className="hover:bg-primary-600 transition-all duration-200"

// ❌ ERRADO: Duração inconsistente
className="transition-all duration-150"  // Componente 1
className="transition-all duration-500"  // Componente 2 (mesmo contexto)

// ✅ CORRETO: Duração padrão consistente
className="transition-all duration-200"  // Padrão para hover
className="transition-all duration-300"  // Padrão para animações maiores
```

---

## 📊 Tokens de Referência Rápida

### Cores Principais
- `primary` - Teal (#14b8a6)
- `secondary` - Blue (#2563eb)
- `neutral-{50-950}` - Escala de cinzas
- `success` - Green (#22c55e)
- `warning` - Orange (#f97316)
- `error` - Red (#ef4444)
- `info` - Sky Blue (#0ea5e9)

### Tipografia
- `text-display-{sm,md,lg,xl,2xl}` - Hero/Landing
- `text-h{1-6}` - Hierarquia de títulos
- `text-body-{xs,sm,lg,xl}` - Textos comuns
- `text-label-{sm,lg}` - Labels e metadados

### Espaçamento Comum
- `p-6` - Padding de cards (24px)
- `gap-4` - Gap pequeno (16px)
- `gap-6` - Gap médio (24px)
- `gap-8` - Gap entre cards (32px)

### Border Radius
- `rounded-2xl` - Cards (16px)
- `rounded-xl` - Inputs/Botões (12px)
- `rounded-full` - Badges/Avatares

### Z-Index
- `z-sticky` (70) - Sidebar fixa
- `z-modal` (80) - Modais
- `z-tooltip` (90) - Tooltips
- `z-toast` (100) - Notificações

---

---

**Última atualização:** 25/01/2026
**Versão:** 1.1.0
**Status:** Sistema de Design Tokens Completo e Documentado
