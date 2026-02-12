#!/usr/bin/env node

/**
 * get-pending-cards-json.js
 *
 * Retorna os cards pendentes como JSON com metadados (id, boardId, listId, title).
 *
 * Exit codes:
 *   0 - Sucesso (JSON impresso no stdout)
 *   2 - Erro de configuração ou execução
 *
 * Variáveis de ambiente necessárias:
 *   WEKAN_BASE_URL - URL do Wekan
 *   WEKAN_API_TOKEN ou (WEKAN_USERNAME + WEKAN_PASSWORD)
 *   WEKAN_USER_ID - ID do usuário
 *
 * Uso:
 *   CARDS_JSON=$(node get-pending-cards-json.js)
 */

import { Wekan } from './dist/wekan.js';

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

const wekan = new Wekan({
    baseUrl: BASE_URL,
    token: TOKEN,
    username: USERNAME,
    password: PASSWORD,
    userId: USER_ID
});

try {
    const cards = await wekan.getMyPendingCards(USER_ID, {});
    const metadata = (cards || []).map(c => ({
        id: c.id,
        boardId: c.board.id,
        listId: c.list.id,
        title: c.title
    }));
    console.log(JSON.stringify(metadata));
    process.exit(0);
} catch (error) {
    console.error("Erro ao obter cards pendentes:", error.message);
    process.exit(2);
}
