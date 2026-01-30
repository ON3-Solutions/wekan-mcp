#!/usr/bin/env node

/**
 * has-pending-cards.js
 *
 * Verifica se existem cards pendentes no Wekan.
 *
 * Exit codes:
 *   0 - Existem cards pendentes (continuar execução)
 *   1 - Não existem cards pendentes (abortar execução)
 *   2 - Erro de configuração ou execução
 *
 * Variáveis de ambiente necessárias:
 *   WEKAN_BASE_URL - URL do Wekan
 *   WEKAN_API_TOKEN ou (WEKAN_USERNAME + WEKAN_PASSWORD)
 *   WEKAN_USER_ID - ID do usuário
 *
 * Uso:
 *   node has-pending-cards.js
 *
 *   # No shell script:
 *   if node has-pending-cards.js; then
 *       echo "Existem cards pendentes"
 *   else
 *       echo "Nenhum card pendente"
 *   fi
 */

import { Wekan } from './dist/wekan.js';

const BASE_URL = process.env["WEKAN_BASE_URL"]?.replace(/\/$/, "") || "";
const TOKEN = process.env["WEKAN_API_TOKEN"] || "";
const USERNAME = process.env["WEKAN_USERNAME"] || "";
const PASSWORD = process.env["WEKAN_PASSWORD"] || "";
const USER_ID = process.env["WEKAN_USER_ID"] || "";

// Validação de configuração
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

    if (cards && cards.length > 0) {
        console.log(`${cards.length} card(s) pendente(s) encontrado(s)`);
        process.exit(0); // Existem cards - continuar
    } else {
        console.log("Nenhum card pendente encontrado");
        process.exit(1); // Não existem cards - abortar
    }
} catch (error) {
    console.error("Erro ao verificar cards pendentes:", error.message);
    process.exit(2);
}
