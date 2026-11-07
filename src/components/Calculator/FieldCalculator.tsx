import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator } from 'lucide-react';

const isEligibleInput = (element: EventTarget | null): element is HTMLInputElement => {
    if (!(element instanceof HTMLInputElement)) {
        return false;
    }

    if (element.disabled || element.readOnly) {
        return false;
    }

    if (element.type === 'number') {
        return true;
    }

    return element.dataset.calculator === 'true';
};

type ExpressionToken = number | '+' | '-' | '*' | '/' | '(' | ')';

const tokenizeExpression = (expression: string): ExpressionToken[] | null => {
    const tokens: ExpressionToken[] = [];
    let index = 0;

    while (index < expression.length) {
        const char = expression[index];

        if ((char >= '0' && char <= '9') || char === '.') {
            let start = index;
            let dotCount = char === '.' ? 1 : 0;
            index += 1;

            while (index < expression.length) {
                const nextChar = expression[index];
                if (nextChar >= '0' && nextChar <= '9') {
                    index += 1;
                    continue;
                }
                if (nextChar === '.') {
                    dotCount += 1;
                    if (dotCount > 1) {
                        return null;
                    }
                    index += 1;
                    continue;
                }
                break;
            }

            const numeric = Number(expression.slice(start, index));
            if (!Number.isFinite(numeric)) {
                return null;
            }
            tokens.push(numeric);
            continue;
        }

        if (char === '+' || char === '-' || char === '*' || char === '/' || char === '(' || char === ')') {
            tokens.push(char);
            index += 1;
            continue;
        }

        return null;
    }

    return tokens;
};

export const evaluateExpression = (expression: string): number | null => {
    let normalized = expression.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/');
    if (!normalized) {
        return null;
    }

    if (normalized.includes(',')) {
        normalized = normalized.replace(/\.(\d{3})(?=[.,+\-*/()]|$)/g, '$1');
        normalized = normalized.replace(/,/g, '.');
    }

    if (!/^[0-9+\-*/().]+$/.test(normalized)) {
        return null;
    }

    const tokens = tokenizeExpression(normalized);
    if (!tokens || tokens.length === 0) {
        return null;
    }

    let cursor = 0;

    const parseExpression = (): number | null => {
        let value = parseTerm();
        if (value === null) {
            return null;
        }

        while (cursor < tokens.length && (tokens[cursor] === '+' || tokens[cursor] === '-')) {
            const operator = tokens[cursor];
            cursor += 1;
            const right = parseTerm();
            if (right === null) {
                return null;
            }

            value = operator === '+' ? value + right : value - right;
        }

        return value;
    };

    const parseTerm = (): number | null => {
        let value = parseFactor();
        if (value === null) {
            return null;
        }

        while (cursor < tokens.length && (tokens[cursor] === '*' || tokens[cursor] === '/')) {
            const operator = tokens[cursor];
            cursor += 1;
            const right = parseFactor();
            if (right === null) {
                return null;
            }

            if (operator === '*') {
                value *= right;
            } else {
                if (right === 0) {
                    return null;
                }
                value /= right;
            }
        }

        return value;
    };

    const parseFactor = (): number | null => {
        if (cursor >= tokens.length) {
            return null;
        }

        const token = tokens[cursor];

        if (token === '+' || token === '-') {
            cursor += 1;
            const nested = parseFactor();
            if (nested === null) {
                return null;
            }
            return token === '-' ? -nested : nested;
        }

        if (token === '(') {
            cursor += 1;
            const nested = parseExpression();
            if (nested === null || tokens[cursor] !== ')') {
                return null;
            }
            cursor += 1;
            return nested;
        }

        if (typeof token === 'number') {
            cursor += 1;
            return token;
        }

        return null;
    };

    const rawResult = parseExpression();
    if (rawResult === null || cursor !== tokens.length || !Number.isFinite(rawResult)) {
        return null;
    }

    return Math.round(rawResult * 100) / 100;
};

export const parseInputValue = (value: string, isNumberType: boolean = false): number | null => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (isNumberType) {
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    }

    if (trimmed.includes(',')) {
        const normalized = trimmed.replace(/\./g, '').replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    const dotCount = (trimmed.match(/\./g) || []).length;
    if (dotCount > 1) {
        const normalized = trimmed.replace(/\./g, '');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatDisplayResult = (value: number): string => {
    if (!Number.isFinite(value)) return '';
    if (Number.isInteger(value)) {
        return value.toString();
    }
    const rounded = Math.round(value * 100) / 100;
    return rounded.toFixed(2).replace('.', ',');
};

export const formatValueForInput = (value: number, input: HTMLInputElement): string => {
    if (input.type === 'number') {
        if (input.step === '1') {
            return Math.round(value).toString();
        }
        if (Number.isInteger(value)) {
            return value.toString();
        }
        const rounded = Math.round(value * 100) / 100;
        return rounded.toFixed(2);
    }

    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const setNativeInputValue = (element: HTMLInputElement, value: string) => {
    const prototype = window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    const tracker = (element as any)._valueTracker;
    if (tracker) {
        tracker.setValue(value === '' ? '__force_update__' : '');
    }

    if (nativeSetter) {
        nativeSetter.call(element, value);
    } else {
        element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
};

const getAnchorPosition = (input: HTMLInputElement) => {
    const rect = input.getBoundingClientRect();
    const buttonTop = Math.max(12, rect.top - 6);
    const buttonLeft = Math.max(12, Math.min(window.innerWidth - 120, rect.right - 108));

    const panelWidth = Math.min(360, window.innerWidth - 24);
    const spaceRight = window.innerWidth - rect.right;
    const canPlaceRight = spaceRight >= panelWidth + 12;

    let panelLeft = canPlaceRight ? rect.right + 8 : rect.left - panelWidth - 8;
    if (panelLeft < 12) panelLeft = 12;
    if (panelLeft + panelWidth > window.innerWidth - 12) panelLeft = window.innerWidth - panelWidth - 12;

    let panelTop = rect.top;
    const maxTop = window.innerHeight - 420;
    if (panelTop > maxTop) panelTop = maxTop;
    if (panelTop < 12) panelTop = 12;

    return {
        buttonTop,
        buttonLeft,
        panelTop,
        panelLeft,
        panelWidth
    };
};

export const FieldCalculator: React.FC = () => {
    const [targetInput, setTargetInput] = useState<HTMLInputElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [expression, setExpression] = useState('');
    const [lastResult, setLastResult] = useState<number | null>(null);
    const [hasError, setHasError] = useState(false);
    const [viewportTick, setViewportTick] = useState(0);
    const [calculatorButtonElement, setCalculatorButtonElement] = useState<HTMLDivElement | null>(null);
    const [calculatorPanelElement, setCalculatorPanelElement] = useState<HTMLDivElement | null>(null);

    const lastTargetRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const onFocusIn = (event: FocusEvent) => {
            const target = event.target as Node | null;
            if (!target) return;

            const focusedInsideCalculator =
                (calculatorButtonElement && calculatorButtonElement.contains(target)) ||
                (calculatorPanelElement && calculatorPanelElement.contains(target));

            if (focusedInsideCalculator) {
                return;
            }

            if (isEligibleInput(event.target)) {
                setTargetInput(event.target);
                return;
            }

            setTargetInput(null);
            setIsOpen(false);
        };

        document.addEventListener('focusin', onFocusIn);
        return () => {
            document.removeEventListener('focusin', onFocusIn);
        };
    }, [calculatorButtonElement, calculatorPanelElement]);

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;

            const clickedInsideCalculator =
                (calculatorButtonElement && calculatorButtonElement.contains(target)) ||
                (calculatorPanelElement && calculatorPanelElement.contains(target));

            if (clickedInsideCalculator) {
                return;
            }

            if (isEligibleInput(event.target)) {
                return;
            }

            setIsOpen(false);
            setTargetInput(null);
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [calculatorButtonElement, calculatorPanelElement]);

    useEffect(() => {
        if (!targetInput) {
            return;
        }

        let frame = 0;
        const syncPosition = () => {
            if (!document.body.contains(targetInput)) {
                setIsOpen(false);
                setTargetInput(null);
                return;
            }

            if (frame) {
                return;
            }

            frame = window.requestAnimationFrame(() => {
                frame = 0;
                setViewportTick((value) => value + 1);
            });
        };

        window.addEventListener('scroll', syncPosition, true);
        window.addEventListener('resize', syncPosition);

        return () => {
            window.removeEventListener('scroll', syncPosition, true);
            window.removeEventListener('resize', syncPosition);
            if (frame) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, [targetInput]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('keydown', onEscape);
        };
    }, [isOpen]);

    const hasTarget = useMemo(() => {
        return Boolean(targetInput && document.body.contains(targetInput));
    }, [targetInput]);

    const anchor = useMemo(() => {
        if (!hasTarget || !targetInput) {
            return null;
        }
        return getAnchorPosition(targetInput);
    }, [hasTarget, targetInput, isOpen, viewportTick]);

    useEffect(() => {
        if (!isOpen || !targetInput) {
            lastTargetRef.current = null;
            return;
        }

        if (lastTargetRef.current !== targetInput) {
            lastTargetRef.current = targetInput;
            const initialResult = parseInputValue(targetInput.value, targetInput.type === 'number');
            setExpression(initialResult !== null ? formatDisplayResult(initialResult) : '');
            setLastResult(initialResult);
            setHasError(false);
        }
    }, [isOpen, targetInput]);

    const openCalculator = () => {
        if (!targetInput) {
            return;
        }

        const initialResult = parseInputValue(targetInput.value, targetInput.type === 'number');
        lastTargetRef.current = targetInput;
        setExpression(initialResult !== null ? formatDisplayResult(initialResult) : '');
        setLastResult(initialResult);
        setHasError(false);
        setIsOpen(true);
    };

    const appendToken = (token: string) => {
        setExpression(prev => {
            if (token === ',') {
                if (prev === '' || ['+', '-', '*', '/', '(', '×', '÷'].includes(prev.slice(-1))) {
                    return `${prev}0,`;
                }
                if (prev.endsWith(',') || prev.endsWith('.')) {
                    return prev;
                }
            }
            if (['+', '-', '*', '/', '×', '÷'].includes(token) && ['+', '-', '*', '/', '×', '÷'].includes(prev.slice(-1))) {
                return `${prev.slice(0, -1)}${token}`;
            }
            return `${prev}${token}`;
        });
        setHasError(false);
    };

    const runCalculation = () => {
        const result = evaluateExpression(expression);
        if (result === null) {
            setHasError(true);
            return null;
        }
        setHasError(false);
        setLastResult(result);
        setExpression(formatDisplayResult(result));
        return result;
    };

    const applyResult = () => {
        if (!targetInput || !document.body.contains(targetInput)) {
            return;
        }

        const calculated = evaluateExpression(expression);
        const resolved = calculated !== null ? calculated : lastResult;
        if (resolved === null) {
            setHasError(true);
            return;
        }

        setHasError(false);
        setLastResult(resolved);
        setExpression(formatDisplayResult(resolved));

        const formatted = formatValueForInput(resolved, targetInput);
        setNativeInputValue(targetInput, formatted);
        targetInput.focus();
        setIsOpen(false);
    };

    if (!hasTarget || !anchor) {
        return null;
    }

    return (
        <>
            <div
                ref={setCalculatorButtonElement}
                style={{ top: anchor.buttonTop, left: anchor.buttonLeft }}
                className="fixed z-40"
            >
                <button
                    type="button"
                    onClick={() => {
                        if (!isOpen) {
                            openCalculator();
                        } else {
                            setIsOpen(false);
                        }
                    }}
                    className="rounded-full bg-secondary p-2.5 text-white shadow-lg hover:bg-secondary-700 transition-colors"
                    aria-label={isOpen ? 'Ocultar calculadora' : 'Mostrar calculadora'}
                    title={isOpen ? 'Ocultar calculadora' : 'Mostrar calculadora'}
                >
                    <Calculator className="w-4 h-4" />
                </button>
            </div>

            {isOpen && (
                <div
                    ref={setCalculatorPanelElement}
                    style={{ top: anchor.panelTop, left: anchor.panelLeft, width: anchor.panelWidth }}
                    className="fixed z-50 rounded-2xl bg-white p-4 shadow-2xl border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-body font-bold text-neutral-700 dark:text-neutral-100">
                            Calculadora rápida
                        </h4>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            aria-label="Fechar calculadora"
                        >
                            x
                        </button>
                    </div>

                    <input
                        type="text"
                        value={expression}
                        onChange={e => {
                            setExpression(e.target.value);
                            setHasError(false);
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                runCalculation();
                            }
                        }}
                        className="mb-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-body text-neutral-700 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        placeholder="Digite a conta (ex: 1500,50 + 200)"
                    />

                    {hasError && (
                        <p className="mb-2 text-body-xs text-error-600">
                            Expressão inválida. Use apenas números e operações (+ - * /)
                        </p>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                        {/* Linha 1: Parênteses e Ações de Limpeza */}
                        <button
                            type="button"
                            onClick={() => appendToken('(')}
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                            (
                        </button>
                        <button
                            type="button"
                            onClick={() => appendToken(')')}
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                            )
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setExpression('');
                                setLastResult(null);
                                setHasError(false);
                            }}
                            className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-2 text-body-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                        >
                            Limpar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setExpression(prev => prev.slice(0, -1));
                                setHasError(false);
                            }}
                            className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-2 text-body-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                        >
                            Apagar
                        </button>

                        {/* Linha 2: 7, 8, 9, ÷ */}
                        {['7', '8', '9'].map(digit => (
                            <button
                                key={digit}
                                type="button"
                                onClick={() => appendToken(digit)}
                                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                {digit}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => appendToken('/')}
                            className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-2 text-body font-bold text-neutral-800 hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                            aria-label="Dividir"
                        >
                            ÷
                        </button>

                        {/* Linha 3: 4, 5, 6, × */}
                        {['4', '5', '6'].map(digit => (
                            <button
                                key={digit}
                                type="button"
                                onClick={() => appendToken(digit)}
                                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                {digit}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => appendToken('*')}
                            className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-2 text-body font-bold text-neutral-800 hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                            aria-label="Multiplicar"
                        >
                            ×
                        </button>

                        {/* Linha 4: 1, 2, 3, − */}
                        {['1', '2', '3'].map(digit => (
                            <button
                                key={digit}
                                type="button"
                                onClick={() => appendToken(digit)}
                                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                {digit}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => appendToken('-')}
                            className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-2 text-body font-bold text-neutral-800 hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                            aria-label="Subtrair"
                        >
                            −
                        </button>

                        {/* Linha 5: 0, ,, =, + */}
                        <button
                            type="button"
                            onClick={() => appendToken('0')}
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                            0
                        </button>
                        <button
                            type="button"
                            onClick={() => appendToken(',')}
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            aria-label="Vírgula decimal"
                        >
                            ,
                        </button>
                        <button
                            type="button"
                            onClick={runCalculation}
                            className="rounded-lg border border-secondary/40 bg-secondary/15 px-2 py-2 text-body font-bold text-secondary hover:bg-secondary/25 dark:bg-secondary/20 dark:text-secondary-300 transition-colors"
                            aria-label="Calcular resultado"
                        >
                            =
                        </button>
                        <button
                            type="button"
                            onClick={() => appendToken('+')}
                            className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-2 text-body font-bold text-neutral-800 hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                            aria-label="Somar"
                        >
                            +
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={applyResult}
                        className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-body-xs font-bold uppercase tracking-wide text-white hover:bg-primary-700 shadow-sm transition-colors"
                    >
                        Colar resultado no campo
                    </button>
                </div>
            )}
        </>
    );
};
