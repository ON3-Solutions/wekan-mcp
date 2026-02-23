import { describe, it, expect } from 'vitest';
import { extractPrUrls, getCustomFieldValue, isUserAssignedToCard } from './check-merged-prs-lib.js';

describe('extractPrUrls', () => {
    it('deve retornar array vazio para input null/undefined/vazio', () => {
        expect(extractPrUrls(null)).toEqual([]);
        expect(extractPrUrls(undefined)).toEqual([]);
        expect(extractPrUrls('')).toEqual([]);
    });

    it('deve extrair uma URL de PR válida', () => {
        const input = 'https://github.com/owner/repo/pull/123';
        expect(extractPrUrls(input)).toEqual(['https://github.com/owner/repo/pull/123']);
    });

    it('deve extrair múltiplas URLs de PR', () => {
        const input = 'https://github.com/owner/repo1/pull/1, https://github.com/owner/repo2/pull/2';
        expect(extractPrUrls(input)).toEqual([
            'https://github.com/owner/repo1/pull/1',
            'https://github.com/owner/repo2/pull/2',
        ]);
    });

    it('deve extrair URLs de PR com texto ao redor', () => {
        const input = 'PR aberta em https://github.com/org/proj/pull/42 aguardando review';
        expect(extractPrUrls(input)).toEqual(['https://github.com/org/proj/pull/42']);
    });

    it('deve retornar array vazio para texto sem URLs de PR', () => {
        expect(extractPrUrls('apenas texto sem URL')).toEqual([]);
        expect(extractPrUrls('https://github.com/owner/repo/issues/123')).toEqual([]);
    });

    it('deve aceitar URLs http e https', () => {
        const input = 'http://github.com/owner/repo/pull/1 https://github.com/owner/repo/pull/2';
        expect(extractPrUrls(input)).toEqual([
            'http://github.com/owner/repo/pull/1',
            'https://github.com/owner/repo/pull/2',
        ]);
    });
});

describe('getCustomFieldValue', () => {
    const fieldDefinitions = [
        { _id: 'field1', name: 'PR' },
        { _id: 'field2', name: 'uuid' },
        { _id: 'field3', name: 'Tokens Consumidos' },
    ];

    it('deve retornar o valor do campo customizado pelo nome', () => {
        const cardCustomFields = [
            { _id: 'field1', value: 'https://github.com/owner/repo/pull/123' },
            { _id: 'field2', value: 'abc-123' },
        ];
        expect(getCustomFieldValue(cardCustomFields, fieldDefinitions, 'PR'))
            .toBe('https://github.com/owner/repo/pull/123');
    });

    it('deve retornar null quando o campo não existe no card', () => {
        const cardCustomFields = [
            { _id: 'field2', value: 'abc-123' },
        ];
        expect(getCustomFieldValue(cardCustomFields, fieldDefinitions, 'PR')).toBeNull();
    });

    it('deve retornar null quando o nome do campo não existe nas definições', () => {
        const cardCustomFields = [
            { _id: 'field1', value: 'valor' },
        ];
        expect(getCustomFieldValue(cardCustomFields, fieldDefinitions, 'CampoInexistente')).toBeNull();
    });

    it('deve retornar null para inputs null/undefined', () => {
        expect(getCustomFieldValue(null, fieldDefinitions, 'PR')).toBeNull();
        expect(getCustomFieldValue(undefined, fieldDefinitions, 'PR')).toBeNull();
        expect(getCustomFieldValue([], null, 'PR')).toBeNull();
        expect(getCustomFieldValue([], undefined, 'PR')).toBeNull();
    });
});

describe('isUserAssignedToCard', () => {
    const userId = 'user-jarbas-123';

    it('deve retornar true quando o usuário está nos assignees', () => {
        const card = { assignees: ['user-other', 'user-jarbas-123', 'user-another'] };
        expect(isUserAssignedToCard(card, userId)).toBe(true);
    });

    it('deve retornar false quando o usuário NÃO está nos assignees', () => {
        const card = { assignees: ['user-other', 'user-another'] };
        expect(isUserAssignedToCard(card, userId)).toBe(false);
    });

    it('deve retornar false quando assignees está vazio', () => {
        const card = { assignees: [] };
        expect(isUserAssignedToCard(card, userId)).toBe(false);
    });

    it('deve retornar false quando assignees não existe no card', () => {
        const card = {};
        expect(isUserAssignedToCard(card, userId)).toBe(false);
    });

    it('deve retornar false quando card é null/undefined', () => {
        expect(isUserAssignedToCard(null, userId)).toBe(false);
        expect(isUserAssignedToCard(undefined, userId)).toBe(false);
    });

    it('deve retornar true quando o usuário é o único assignee', () => {
        const card = { assignees: ['user-jarbas-123'] };
        expect(isUserAssignedToCard(card, userId)).toBe(true);
    });
});
