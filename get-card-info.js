#!/usr/bin/env node

/**
 * get-card-info.js
 *
 * Retorna informações de um card específico: uuid, contagem de comentários do Jarbas e listId.
 * Busca o card em todas as listas do board (pode ter sido movido).
 *
 * Exit codes:
 *   0 - Sucesso (JSON impresso no stdout)
 *   2 - Erro de configuração ou execução
 *
 * Variáveis de ambiente necessárias:
 *   WEKAN_BASE_URL - URL do Wekan
 *   WEKAN_API_TOKEN ou (WEKAN_USERNAME + WEKAN_PASSWORD)
 *   WEKAN_USER_ID - ID do usuário (Jarbas)
 *   CARD_ID - ID do card
 *   BOARD_ID - ID do board
 *
 * Uso:
 *   CARD_ID=xxx BOARD_ID=yyy node get-card-info.js
 */

import { Wekan } from './dist/wekan.js';

const BASE_URL = process.env["WEKAN_BASE_URL"]?.replace(/\/$/, "") || "";
const TOKEN = process.env["WEKAN_API_TOKEN"] || "";
const USERNAME = process.env["WEKAN_USERNAME"] || "";
const PASSWORD = process.env["WEKAN_PASSWORD"] || "";
const USER_ID = process.env["WEKAN_USER_ID"] || "";
const CARD_ID = process.env["CARD_ID"] || "";
const BOARD_ID = process.env["BOARD_ID"] || "";

if (!BASE_URL || (!TOKEN && !(USERNAME && PASSWORD))) {
    console.error("Erro: Configure WEKAN_BASE_URL e WEKAN_API_TOKEN (ou WEKAN_USERNAME + WEKAN_PASSWORD)");
    process.exit(2);
}

if (!USER_ID || !CARD_ID || !BOARD_ID) {
    console.error("Erro: WEKAN_USER_ID, CARD_ID e BOARD_ID são obrigatórios");
    process.exit(2);
}

const wekan = new Wekan({
    baseUrl: BASE_URL,
    token: TOKEN,
    username: USERNAME,
    password: PASSWORD,
    userId: USER_ID
});

try {
    // Buscar card em todas as listas do board (pode ter sido movido)
    const lists = await wekan.listLists(BOARD_ID);
    let freshCard = null;
    let currentListId = null;

    for (const list of lists) {
        try {
            freshCard = await wekan.getCard(BOARD_ID, list._id, CARD_ID);
            if (freshCard) {
                currentListId = list._id;
                break;
            }
        } catch (e) {
            // Card não está nesta lista, continua buscando
        }
    }

    if (!freshCard || !currentListId) {
        console.log(JSON.stringify({ uuid: "", jarbasCommentCount: 0, listId: "" }));
        process.exit(0);
    }

    // Resolver UUID do customField
    const customFieldDefs = await wekan.getCustomFields(BOARD_ID);
    const fieldIdToName = {};
    customFieldDefs.forEach(cf => { fieldIdToName[cf._id] = cf.name; });

    let uuid = "";
    const cardCustomFields = freshCard.customFields || [];
    for (const cf of cardCustomFields) {
        const fieldName = fieldIdToName[cf._id] || cf._id;
        if (fieldName === 'uuid') {
            uuid = cf.value || "";
            break;
        }
    }

    // Contar comentários do Jarbas (authorId === USER_ID)
    const comments = await wekan.getCardComments(BOARD_ID, CARD_ID);
    const jarbasCommentCount = comments.filter(c => (c.userId || c.authorId) === USER_ID).length;

    console.log(JSON.stringify({ uuid, jarbasCommentCount, listId: currentListId }));
    process.exit(0);
} catch (error) {
    console.error("Erro ao obter info do card:", error.message);
    process.exit(2);
}
