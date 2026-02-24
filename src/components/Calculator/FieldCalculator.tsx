import React, { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';

const KEYBOARD_KEYS = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '(', ')', '+'];

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

const evaluateExpression = (expression: string): number | null => {
    const normalized = expression.replace(/\s+/g, '').replace(/,/g, '.');
    if (!normalized) {
        return null;
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

const parseInputValue = (value: string): number | null => {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim();
    if (!normalized) {
        return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatResult = (value: number) => {
    if (Number.isInteger(value)) {
        return value.toString();
    }
    return value.toFixed(2);
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
            return;
        }

        const initialResult = parseInputValue(targetInput.value);
        setExpression(initialResult !== null ? formatResult(initialResult) : '');
        setLastResult(initialResult);
        setHasError(false);
    }, [isOpen, targetInput]);

    const openCalculator = () => {
        if (!targetInput) {
            return;
        }

        const initialResult = parseInputValue(targetInput.value);
        setExpression(initialResult !== null ? formatResult(initialResult) : '');
        setLastResult(initialResult);
        setHasError(false);
        setIsOpen(true);
    };

    const appendToken = (token: string) => {
        setExpression(prev => `${prev}${token}`);
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
        setExpression(formatResult(result));
        return result;
    };

    const applyResult = () => {
        if (!targetInput) {
            return;
        }

        const resolved = lastResult ?? runCalculation();
        if (resolved === null) {
            return;
        }

        targetInput.value = formatResult(resolved);
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
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
                    className="rounded-full bg-secondary p-2.5 text-white shadow-lg hover:bg-secondary-700"
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
                            Calculadora rapida
                        </h4>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
                        className="mb-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-body text-neutral-700 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        placeholder="Digite a conta"
                    />

                    {hasError && (
                        <p className="mb-2 text-body-xs text-error-600">
                            Expressão inválida. Use apenas números e + - * /
                        </p>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                        {KEYBOARD_KEYS.map(key => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => appendToken(key)}
                                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                            >
                                {key}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                setExpression('');
                                setLastResult(null);
                                setHasError(false);
                            }}
                            className="col-span-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body-xs font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                        >
                            Limpar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setExpression(prev => prev.slice(0, -1));
                                setHasError(false);
                            }}
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-body-xs font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                        >
                            Apagar
                        </button>
                        <button
                            type="button"
                            onClick={runCalculation}
                            className="rounded-lg border border-secondary/30 bg-secondary/10 px-2 py-2 text-body font-bold text-secondary hover:bg-secondary/20"
                        >
                            =
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={applyResult}
                        className="mt-3 w-full rounded-xl bg-primary px-4 py-2 text-body-xs font-bold uppercase tracking-wide text-white hover:bg-primary-700"
                    >
                        Colar resultado no campo
                    </button>
                </div>
            )}
        </>
    );
};
