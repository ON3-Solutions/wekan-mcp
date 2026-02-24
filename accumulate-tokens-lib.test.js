import { describe, it, expect } from 'vitest';
import { parseTokenValue, findTokensField, getCurrentTokens, accumulateTokens } from './accumulate-tokens-lib.js';

describe('parseTokenValue', () => {
    it('deve retornar 0 para null, undefined e string vazia', () => {
        expect(parseTokenValue(null)).toBe(0);
        expect(parseTokenValue(undefined)).toBe(0);
        expect(parseTokenValue('')).toBe(0);
    });

    it('deve parsear string numérica corretamente', () => {
        expect(parseTokenValue('1000')).toBe(1000);
        expect(parseTokenValue('0')).toBe(0);
        expect(parseTokenValue('999999')).toBe(999999);
    });

    it('deve parsear número diretamente', () => {
        expect(parseTokenValue(500)).toBe(500);
        expect(parseTokenValue(0)).toBe(0);
    });

    it('deve retornar 0 para valores não numéricos', () => {
        expect(parseTokenValue('abc')).toBe(0);
        expect(parseTokenValue('não é número')).toBe(0);
        expect(parseTokenValue(NaN)).toBe(0);
    });

    it('deve truncar valores decimais (parseInt behavior)', () => {
        expect(parseTokenValue('1500.75')).toBe(1500);
        expect(parseTokenValue(1500.75)).toBe(1500);
    });

    it('deve lidar com strings com espaços ou caracteres extras', () => {
        expect(parseTokenValue('  100  ')).toBe(100);
        expect(parseTokenValue('100abc')).toBe(100);
    });
});

describe('findTokensField', () => {
    const fieldDefs = [
        { _id: 'field1', name: 'PR' },
        { _id: 'field2', name: 'uuid' },
        { _id: 'field3', name: 'Tokens Consumidos' },
        { _id: 'field4', name: 'Downstream' },
    ];

    it('deve encontrar o campo "Tokens Consumidos" (case-insensitive)', () => {
        expect(findTokensField(fieldDefs)).toEqual({ _id: 'field3', name: 'Tokens Consumidos' });
    });

    it('deve encontrar o campo com case diferente', () => {
        const defs = [{ _id: 'f1', name: 'tokens consumidos' }];
        expect(findTokensField(defs)).toEqual({ _id: 'f1', name: 'tokens consumidos' });

        const defsUpper = [{ _id: 'f2', name: 'TOKENS CONSUMIDOS' }];
        expect(findTokensField(defsUpper)).toEqual({ _id: 'f2', name: 'TOKENS CONSUMIDOS' });
    });

    it('deve retornar null quando o campo não existe', () => {
        const defs = [{ _id: 'f1', name: 'PR' }, { _id: 'f2', name: 'uuid' }];
        expect(findTokensField(defs)).toBeNull();
    });

    it('deve retornar null para input inválido', () => {
        expect(findTokensField(null)).toBeNull();
        expect(findTokensField(undefined)).toBeNull();
        expect(findTokensField('not an array')).toBeNull();
        expect(findTokensField([])).toBeNull();
    });

    it('deve retornar null quando item não tem propriedade name', () => {
        const defs = [{ _id: 'f1' }, { _id: 'f2', name: null }];
        expect(findTokensField(defs)).toBeNull();
    });
});

describe('getCurrentTokens', () => {
    const tokenFieldDef = { _id: 'field3', name: 'Tokens Consumidos' };

    it('deve retornar o valor atual de tokens do card', () => {
        const cardFields = [
            { _id: 'field1', value: 'https://github.com/org/repo/pull/1' },
            { _id: 'field3', value: '5000' },
        ];
        expect(getCurrentTokens(cardFields, tokenFieldDef)).toBe(5000);
    });

    it('deve retornar 0 quando o campo não existe no card', () => {
        const cardFields = [
            { _id: 'field1', value: 'valor' },
        ];
        expect(getCurrentTokens(cardFields, tokenFieldDef)).toBe(0);
    });

    it('deve retornar 0 quando cardCustomFields é vazio', () => {
        expect(getCurrentTokens([], tokenFieldDef)).toBe(0);
    });

    it('deve retornar 0 para inputs inválidos', () => {
        expect(getCurrentTokens(null, tokenFieldDef)).toBe(0);
        expect(getCurrentTokens(undefined, tokenFieldDef)).toBe(0);
        expect(getCurrentTokens([{ _id: 'field3', value: '100' }], null)).toBe(0);
        expect(getCurrentTokens([{ _id: 'field3', value: '100' }], {})).toBe(0);
    });

    it('deve parsear valor numérico armazenado como string', () => {
        const cardFields = [{ _id: 'field3', value: '12345' }];
        expect(getCurrentTokens(cardFields, tokenFieldDef)).toBe(12345);
    });

    it('deve retornar 0 quando o valor é null ou vazio', () => {
        expect(getCurrentTokens([{ _id: 'field3', value: null }], tokenFieldDef)).toBe(0);
        expect(getCurrentTokens([{ _id: 'field3', value: '' }], tokenFieldDef)).toBe(0);
    });
});

describe('accumulateTokens', () => {
    it('deve somar tokens corretamente', () => {
        expect(accumulateTokens(5000, 1000)).toBe(6000);
        expect(accumulateTokens(0, 500)).toBe(500);
        expect(accumulateTokens(100, 0)).toBe(100);
    });

    it('deve retornar 0 quando ambos são 0', () => {
        expect(accumulateTokens(0, 0)).toBe(0);
    });

    it('deve lidar com valores grandes', () => {
        expect(accumulateTokens(1000000, 500000)).toBe(1500000);
    });

    it('deve tratar NaN e valores inválidos como 0', () => {
        expect(accumulateTokens(NaN, 100)).toBe(100);
        expect(accumulateTokens(100, NaN)).toBe(100);
        expect(accumulateTokens(NaN, NaN)).toBe(0);
    });

    it('deve tratar null e undefined como 0', () => {
        expect(accumulateTokens(null, 100)).toBe(100);
        expect(accumulateTokens(100, null)).toBe(100);
        expect(accumulateTokens(undefined, 100)).toBe(100);
        expect(accumulateTokens(100, undefined)).toBe(100);
    });

    it('nunca deve retornar valor negativo', () => {
        expect(accumulateTokens(-100, 50)).toBe(0);
        expect(accumulateTokens(50, -100)).toBe(0);
        expect(accumulateTokens(-50, -50)).toBe(0);
    });
});
