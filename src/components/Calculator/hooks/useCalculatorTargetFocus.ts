import { useCallback, useEffect, useRef } from 'react';

export const calculatorTargetClass = 'scroll-mt-24 transition-shadow motion-reduce:transition-none data-[rubric-highlight]:rounded-xl data-[rubric-highlight]:ring-2 data-[rubric-highlight]:ring-secondary-600 data-[rubric-highlight]:ring-offset-2';

export const useCalculatorTargetFocus = () => {
    const highlighted = useRef<HTMLElement | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>();

    const clearHighlight = useCallback(() => {
        clearTimeout(timer.current);
        highlighted.current?.removeAttribute('data-rubric-highlight');
        highlighted.current = null;
    }, []);

    useEffect(() => clearHighlight, [clearHighlight]);

    return useCallback((target: HTMLElement | null, { scroll = true } = {}) => {
        if (!target || target.closest('[hidden]')) return false;

        clearHighlight();
        target.setAttribute('data-rubric-highlight', '');
        highlighted.current = target;
        const focus = target.querySelector<HTMLElement>('[data-rubric-edit]') ?? target;
        focus.focus({ preventScroll: true });
        if (scroll) target.scrollIntoView({
            block: 'start',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        });
        timer.current = setTimeout(clearHighlight, 1800);
        return true;
    }, [clearHighlight]);
};
