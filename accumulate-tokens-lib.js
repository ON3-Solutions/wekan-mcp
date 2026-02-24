/**
 * accumulate-tokens-lib.js
 *
 * Funções puras para lógica de acumulação de tokens consumidos.
 * Extraídas para facilitar testes unitários (mesmo padrão de check-merged-prs-lib.js).
 */

/**
 * Parseia um valor de token de um campo customizado (pode ser string, number, null, etc.)
 * @param {any} value - O valor bruto do campo
 * @returns {number} - Valor inteiro parseado, 0 se inválido
 */
export function parseTokenValue(value) {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Encontra a definição do campo "Tokens Consumidos" nas definições de campos customizados
 * @param {Array} customFieldDefs - Array de definições de campos customizados
 * @returns {object|null} - A definição do campo ou null
 */
export function findTokensField(customFieldDefs) {
    if (!Array.isArray(customFieldDefs)) return null;
    return customFieldDefs.find(f => f.name && f.name.toLowerCase() === 'tokens consumidos') || null;
}

/**
 * Obtém o valor atual de tokens de um card a partir dos seus campos customizados
 * @param {Array} cardCustomFields - Array de campos customizados do card [{_id, value}]
 * @param {object} tokenFieldDef - A definição do campo "Tokens Consumidos" (com _id)
 * @returns {number} - Valor atual de tokens, 0 se não encontrado
 */
export function getCurrentTokens(cardCustomFields, tokenFieldDef) {
    if (!Array.isArray(cardCustomFields) || !tokenFieldDef || !tokenFieldDef._id) return 0;
    const field = cardCustomFields.find(cf => cf._id === tokenFieldDef._id);
    if (!field) return 0;
    return parseTokenValue(field.value);
}

/**
 * Calcula o novo valor acumulado de tokens
 * @param {number} currentValue - Valor atual de tokens
 * @param {number} tokensToAdd - Tokens a adicionar
 * @returns {number} - Novo valor acumulado (nunca negativo)
 */
export function accumulateTokens(currentValue, tokensToAdd) {
    const current = typeof currentValue === 'number' && !isNaN(currentValue) ? currentValue : 0;
    const toAdd = typeof tokensToAdd === 'number' && !isNaN(tokensToAdd) ? tokensToAdd : 0;
    const result = current + toAdd;
    return result < 0 ? 0 : result;
}
