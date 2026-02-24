#!/usr/bin/env node

/**
 * accumulate-tokens.js
 *
 * Acumula tokens consumidos no customField "Tokens Consumidos" de cada card.
 * Busca o card atualizado antes de acumular para garantir o valor correto.
 *
 * Exit codes:
 *   0 - Sucesso
 *   2 - Erro de configuração ou execução
 *
 * Variáveis de ambiente necessárias:
 *   WEKAN_BASE_URL - URL do Wekan
 *   WEKAN_API_TOKEN ou (WEKAN_USERNAME + WEKAN_PASSWORD)
 *   WEKAN_USER_ID - ID do usuário
 *   CARDS_JSON - JSON array com metadados dos cards [{id, boardId, listId, title}]
 *   PER_CARD_TOKENS - Quantidade de tokens a acumular por card
 *
 * Uso:
 *   CARDS_JSON='[...]' PER_CARD_TOKENS=1000 node accumulate-tokens.js
 */

import { Wekan } from './dist/wekan.js';
import { findTokensField, getCurrentTokens, accumulateTokens } from './accumulate-tokens-lib.js';

const BASE_URL = process.env["WEKAN_BASE_URL"]?.replace(/\/$/, "") || "";
const TOKEN = process.env["WEKAN_API_TOKEN"] || "";
const USERNAME = process.env["WEKAN_USERNAME"] || "";
const PASSWORD = process.env["WEKAN_PASSWORD"] || "";
const USER_ID = process.env["WEKAN_USER_ID"] || "";

if (!BASE_URL || (!TOKEN && !(USERNAME && PASSWORD))) {
    console.error("Erro: Configure WEKAN_BASE_URL e WEKAN_API_TOKEN (ou WEKAN_USERNAME + WEKAN_PASSWORD)");
    process.exit(2);
}

if (!USER_ID) {
    console.error("Erro: WEKAN_USER_ID é obrigatório");
    process.exit(2);
}

const cardsJson = process.env["CARDS_JSON"] || "[]";
const perCardTokens = parseInt(process.env["PER_CARD_TOKENS"] || "0", 10);

if (isNaN(perCardTokens) || perCardTokens <= 0) {
    console.log("Nenhum token para acumular.");
    process.exit(0);
}

let cards;
try {
    cards = JSON.parse(cardsJson);
} catch (e) {
    console.error("Erro: CARDS_JSON inválido:", e.message);
    process.exit(2);
}

if (!Array.isArray(cards) || cards.length === 0) {
    console.log("Nenhum card para acumular tokens.");
    process.exit(0);
}

const wekan = new Wekan({
    baseUrl: BASE_URL,
    token: TOKEN,
    username: USERNAME,
    password: PASSWORD,
    userId: USER_ID
});

for (const card of cards) {
    try {
        // Busca o card atualizado em todas as listas do board (pode ter sido movido pelo Claude)
        const lists = await wekan.listLists(card.boardId);
        let freshCard = null;
        let currentListId = null;

        for (const list of lists) {
            try {
                freshCard = await wekan.getCard(card.boardId, list._id, card.id);
                if (freshCard) {
                    currentListId = list._id;
                    break;
                }
            } catch (e) {
                // Card não está nesta lista, continua buscando
            }
        }

        if (!freshCard || !currentListId) {
            console.error(`Card ${card.id} (${card.title}) não encontrado em nenhuma lista.`);
            continue;
        }

        // Busca definições de custom fields para encontrar "Tokens Consumidos"
        const customFieldDefs = await wekan.getCustomFields(card.boardId);
        const tokenFieldDef = findTokensField(customFieldDefs);

        if (!tokenFieldDef) {
            console.error(`Campo 'Tokens Consumidos' não encontrado no board ${card.boardId}.`);
            continue;
        }

        // Lê valor atual e acumula
        const currentValue = getCurrentTokens(freshCard.customFields, tokenFieldDef);
        const newValue = accumulateTokens(currentValue, perCardTokens);

        // Atualiza o campo com o valor acumulado
        await wekan.updateCardField(card.boardId, currentListId, card.id, 'Tokens Consumidos', String(newValue));
        console.log(`Card ${card.id} (${card.title}): ${currentValue} + ${perCardTokens} = ${newValue} tokens`);
    } catch (error) {
        console.error(`Erro ao atualizar card ${card.id} (${card.title}): ${error.message}`);
    }
}
