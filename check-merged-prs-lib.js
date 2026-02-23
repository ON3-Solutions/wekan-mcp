/**
 * check-merged-prs-lib.js
 *
 * Funções puras extraídas de check-merged-prs.js para facilitar testes unitários.
 */

/**
 * Extrai URLs de PRs de uma string (pode conter múltiplas URLs separadas por vírgula/espaço)
 * @param {string} prField - Valor do campo PR
 * @returns {Array<string>} - Array de URLs válidas de PRs
 */
export function extractPrUrls(prField) {
    if (!prField) return [];

    // Regex para encontrar todas as URLs de PRs no GitHub
    const prRegex = /https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/g;
    const matches = prField.match(prRegex);

    return matches || [];
}

/**
 * Extrai o valor de um campo customizado pelo nome
 * @param {Array} cardCustomFields - Array de campos customizados do card
 * @param {Array} fieldDefinitions - Definições de campos do board
 * @param {string} fieldName - Nome do campo a buscar
 * @returns {string|null} - Valor do campo ou null
 */
export function getCustomFieldValue(cardCustomFields, fieldDefinitions, fieldName) {
    if (!cardCustomFields || !fieldDefinitions) return null;

    const fieldDef = fieldDefinitions.find(f => f.name === fieldName);
    if (!fieldDef) return null;

    const field = cardCustomFields.find(f => f._id === fieldDef._id);
    return field?.value || null;
}

/**
 * Verifica se um usuário está nos assignees de um card
 * @param {object} card - Card do Wekan (com campo assignees)
 * @param {string} userId - ID do usuário a verificar
 * @returns {boolean} - true se o usuário está nos assignees
 */
export function isUserAssignedToCard(card, userId) {
    const assignees = card?.assignees || [];
    return assignees.includes(userId);
}
