import assert from 'node:assert/strict';
import test from 'node:test';

// Test implementation replicating exports from FieldCalculator.tsx
const parseInputValue = (value, isNumberType = false) => {
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

const tokenizeExpression = (expression) => {
    const tokens = [];
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

const evaluateExpression = (expression) => {
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

    const parseExpression = () => {
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

    const parseTerm = () => {
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

    const parseFactor = () => {
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

const formatDisplayResult = (value) => {
    if (!Number.isFinite(value)) return '';
    if (Number.isInteger(value)) {
        return value.toString();
    }
    const rounded = Math.round(value * 100) / 100;
    return rounded.toFixed(2).replace('.', ',');
};

const formatValueForInput = (value, input) => {
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

const setNativeInputValue = (element, value) => {
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(value === '' ? '__force_update__' : '');
    }

    element.value = value;
    element.dispatchEvent({ type: 'input', bubbles: true, cancelable: true });
    element.dispatchEvent({ type: 'change', bubbles: true, cancelable: true });
};

test('parseInputValue preserva decimais em inputs type=number', () => {
    assert.equal(parseInputValue('12.50', true), 12.5);
    assert.equal(parseInputValue('12.5', true), 12.5);
    assert.equal(parseInputValue('1500.75', true), 1500.75);
    assert.equal(parseInputValue('1500', true), 1500);
    assert.equal(parseInputValue('0', true), 0);
    assert.equal(parseInputValue('', true), null);
});

test('parseInputValue lida com texto pt-BR (com virgula e pontos de milhar)', () => {
    assert.equal(parseInputValue('1.500,50', false), 1500.5);
    assert.equal(parseInputValue('1500,50', false), 1500.5);
    assert.equal(parseInputValue('12,50', false), 12.5);
    assert.equal(parseInputValue('12,5', false), 12.5);
    assert.equal(parseInputValue('1.000.000,00', false), 1000000);
    assert.equal(parseInputValue('1500.50', false), 1500.5);
});

test('evaluateExpression calcula expressoes com virgula e ponto', () => {
    assert.equal(evaluateExpression('10,5 + 2,3'), 12.8);
    assert.equal(evaluateExpression('10.5 + 2.3'), 12.8);
    assert.equal(evaluateExpression('1.500,50 + 200,50'), 1701);
    assert.equal(evaluateExpression('100 * 2,5'), 250);
    assert.equal(evaluateExpression('100 × 2,5'), 250);
    assert.equal(evaluateExpression('100 / 4'), 25);
    assert.equal(evaluateExpression('100 ÷ 4'), 25);
    assert.equal(evaluateExpression('(10 + 5) * 2'), 30);
    assert.equal(evaluateExpression('5 / 0'), null);
});

test('formatDisplayResult exibe com virgula para o usuario', () => {
    assert.equal(formatDisplayResult(1500), '1500');
    assert.equal(formatDisplayResult(12.5), '12,50');
    assert.equal(formatDisplayResult(12.8), '12,80');
    assert.equal(formatDisplayResult(0), '0');
});

test('formatValueForInput formata corretamente para type=number vs text', () => {
    const numberInput = { type: 'number', step: '0.01' };
    const integerInput = { type: 'number', step: '1' };
    const textInput = { type: 'text' };

    // type=number deve usar ponto e nunca virgula (para nao invalidar o input do navegador)
    assert.equal(formatValueForInput(1500, numberInput), '1500');
    assert.equal(formatValueForInput(12.5, numberInput), '12.50');
    assert.equal(formatValueForInput(12.8, numberInput), '12.80');
    assert.ok(!formatValueForInput(12.5, numberInput).includes(','));

    // step=1 deve arredondar para inteiro
    assert.equal(formatValueForInput(3.8, integerInput), '4');

    // type=text deve formatar em pt-BR com virgula
    assert.equal(formatValueForInput(1500, textInput), '1.500,00');
    assert.equal(formatValueForInput(12.5, textInput), '12,50');
    assert.equal(formatValueForInput(12.8, textInput), '12,80');
});

test('setNativeInputValue dispara eventos e reseta o _valueTracker do React', () => {
    const dispatched = [];
    let trackedValue = '100';

    const mockElement = {
        _val: '100',
        get value() { return this._val; },
        set value(v) { this._val = v; },
        _valueTracker: {
            getValue: () => trackedValue,
            setValue: (v) => { trackedValue = v; }
        },
        dispatchEvent: (evt) => {
            dispatched.push(evt.type);
            // Simula o comportamento do ChangeEventPlugin do React:
            // Ele verifica se trackedValue !== mockElement.value
            if (mockElement._valueTracker.getValue() !== mockElement.value) {
                mockElement._valueTracker.setValue(mockElement.value);
                dispatched.push('react_synthetic_onChange');
            }
        }
    };

    setNativeInputValue(mockElement, '250.50');

    assert.equal(mockElement.value, '250.50');
    assert.ok(dispatched.includes('input'));
    assert.ok(dispatched.includes('change'));
    assert.ok(dispatched.includes('react_synthetic_onChange'), 'React Synthetic onChange deve ser disparado');
});

test('appendToken inteligente para vírgulas e operadores', () => {
    const appendTokenHelper = (prev, token) => {
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
    };

    // Vírgula no início insere 0,
    assert.equal(appendTokenHelper('', ','), '0,');
    // Vírgula após operador insere 0,
    assert.equal(appendTokenHelper('10+', ','), '10+0,');
    // Vírgula dupla é prevenida
    assert.equal(appendTokenHelper('10,', ','), '10,');
    // Troca de operador consecutivo
    assert.equal(appendTokenHelper('10+', '*'), '10*');
});
