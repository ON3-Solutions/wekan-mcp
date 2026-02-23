#!/usr/bin/env node

/**
 * check-merged-prs.js
 *
 * Verifica cards na lista "Merge" de todos os quadros do Wekan.
 * Se o PR associado ao card estiver merged no GitHub, move o card para "Pendente de Testes".
 *
 * Variáveis de ambiente necessárias:
 *   WEKAN_BASE_URL - URL do Wekan
 *   WEKAN_API_TOKEN ou (WEKAN_USERNAME + WEKAN_PASSWORD)
 *   WEKAN_USER_ID - ID do usuário
 *
 * Uso:
 *   node check-merged-prs.js
 */

import { Wekan } from './dist/wekan.js';
import { execSync } from 'child_process';
import { extractPrUrls, getCustomFieldValue, isUserAssignedToCard } from './check-merged-prs-lib.js';

// Configuração
const BASE_URL = process.env["WEKAN_BASE_URL"]?.replace(/\/$/, "") || "";
const TOKEN = process.env["WEKAN_API_TOKEN"] || "";
const USERNAME = process.env["WEKAN_USERNAME"] || "";
const PASSWORD = process.env["WEKAN_PASSWORD"] || "";
const USER_ID = process.env["WEKAN_USER_ID"] || "";

// Validação
if (!BASE_URL || (!TOKEN && !(USERNAME && PASSWORD))) {
    console.error("[ERROR] Configure WEKAN_BASE_URL e WEKAN_API_TOKEN (ou WEKAN_USERNAME + WEKAN_PASSWORD)");
    process.exit(2);
}

if (!USER_ID) {
    console.error("[ERROR] WEKAN_USER_ID é obrigatório");
    process.exit(2);
}

// Verifica se gh está disponível
try {
    execSync('gh auth status', { stdio: 'pipe' });
} catch {
    console.error("[ERROR] gh (GitHub CLI) não está autenticado. Execute 'gh auth login' primeiro.");
    process.exit(2);
}

const wekan = new Wekan({
    baseUrl: BASE_URL,
    token: TOKEN,
    username: USERNAME,
    password: PASSWORD,
    userId: USER_ID
});

/**
 * Obtém o estado de um PR no GitHub
 * @param {string} prUrl - URL do PR (ex: https://github.com/owner/repo/pull/123)
 * @returns {string} - Estado do PR (MERGED, OPEN, CLOSED, INVALID_URL, ERROR)
 */
function getPrState(prUrl) {
    // Valida formato da URL
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
        return 'INVALID_URL';
    }

    try {
        const result = execSync(`gh pr view "${prUrl}" --json state -q '.state'`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return result.trim();
    } catch {
        return 'ERROR';
    }
}

/**
 * Verifica o estado de múltiplas PRs
 * @param {Array<string>} prUrls - Array de URLs de PRs
 * @returns {{allMerged: boolean, results: Array<{url: string, state: string}>}}
 */
function checkMultiplePrs(prUrls) {
    const results = [];
    let allMerged = true;

    for (const url of prUrls) {
        const state = getPrState(url);
        results.push({ url, state });

        if (state !== 'MERGED') {
            allMerged = false;
        }
    }

    return { allMerged, results };
}

// Contadores
let totalCards = 0;
let mergedCards = 0;
let movedCards = 0;
let skippedCards = 0;

console.log("==========================================");
console.log(`[INFO] Iniciando verificação de PRs mergeadas`);
console.log(`[INFO] Usuário: ${USERNAME || 'token-based'}`);
console.log(`[INFO] User ID: ${USER_ID}`);
console.log("==========================================");

try {
    // Lista todos os boards
    console.log("[INFO] Obtendo lista de quadros...");
    const boards = await wekan.listBoards(USER_ID);

    if (!boards || boards.length === 0) {
        console.log("[INFO] Nenhum quadro encontrado.");
        process.exit(0);
    }

    for (const board of boards) {
        console.log(`[INFO] Processando quadro: ${board.title} (${board._id})`);

        // Lista as listas do board
        const lists = await wekan.listLists(board._id);

        if (!lists || lists.length === 0) {
            console.log(`[INFO]   Nenhuma lista encontrada no quadro ${board.title}`);
            continue;
        }

        // Encontra lista "Merge"
        const mergeList = lists.find(l => l.title.toLowerCase().includes('merge'));
        if (!mergeList) {
            console.log(`[INFO]   Lista 'Merge' não encontrada no quadro ${board.title}`);
            continue;
        }
        console.log(`[INFO]   Lista 'Merge' encontrada (ID: ${mergeList._id})`);

        // Encontra lista "Pendente de Testes"
        const pendenteList = lists.find(l =>
            l.title.toLowerCase().includes('pendente') &&
            l.title.toLowerCase().includes('teste')
        );
        if (!pendenteList) {
            console.log(`[INFO]   Lista 'Pendente de Testes' não encontrada no quadro ${board.title} - pulando`);
            continue;
        }
        console.log(`[INFO]   Lista 'Pendente de Testes' encontrada (ID: ${pendenteList._id})`);

        // Obtém campos customizados do board
        const customFields = await wekan.getCustomFields(board._id);

        // Lista cards da lista "Merge"
        const cards = await wekan.listCards(board._id, mergeList._id);

        if (!cards || cards.length === 0) {
            console.log(`[INFO]   Nenhum card na lista 'Merge'`);
            continue;
        }

        for (const card of cards) {
            totalCards++;

            // Obtém detalhes completos do card
            const fullCard = await wekan.getCard(board._id, mergeList._id, card._id);

            console.log(`[INFO]     Verificando card: ${card.title} (ID: ${card._id})`);

            // Verifica se Jarbas (USER_ID) está nos assignees do card
            if (!isUserAssignedToCard(fullCard, USER_ID)) {
                console.log(`[INFO]       Jarbas não está nos assignees - pulando`);
                skippedCards++;
                continue;
            }

            // Extrai valor do campo PR
            const prUrl = getCustomFieldValue(fullCard.customFields, customFields, 'PR');

            if (!prUrl) {
                console.log(`[INFO]       Campo PR vazio - pulando`);
                skippedCards++;
                continue;
            }

            // Extrai todas as URLs de PR do campo
            const prUrls = extractPrUrls(prUrl);

            if (prUrls.length === 0) {
                console.log(`[INFO]       Campo PR não contém URLs válidas: "${prUrl}"`);
                skippedCards++;
                continue;
            }

            console.log(`[INFO]       ${prUrls.length} PR(s) encontrada(s):`);

            // Verifica todas as PRs
            const { allMerged, results } = checkMultiplePrs(prUrls);

            // Log detalhado de cada PR
            for (const { url, state } of results) {
                const statusIcon = state === 'MERGED' ? '✓' : '✗';
                console.log(`[INFO]         ${statusIcon} ${url} → ${state}`);
            }

            if (allMerged) {
                mergedCards++;
                console.log(`[SUCCESS]       Todas as ${prUrls.length} PR(s) estão MERGED!`);

                // Move o card para "Pendente de Testes"
                console.log(`[INFO]       Movendo card para 'Pendente de Testes'...`);

                try {
                    await wekan.moveCard(board._id, mergeList._id, card._id, {
                        listId: pendenteList._id
                    });
                    movedCards++;
                    console.log(`[SUCCESS]       Card movido com sucesso!`);
                } catch (err) {
                    console.log(`[ERROR]       Falha ao mover card: ${err.message}`);
                }
            } else {
                // Identifica quais PRs ainda não foram merged
                const pendingPrs = results.filter(r => r.state !== 'MERGED');
                console.log(`[INFO]       Card mantido na lista 'Merge' - ${pendingPrs.length} PR(s) pendente(s):`);
                for (const { url, state } of pendingPrs) {
                    console.log(`[INFO]         - ${url} (${state})`);
                }
                skippedCards++;
            }
        }
    }

    // Resumo final
    console.log("==========================================");
    console.log("[INFO] Verificação concluída!");
    console.log(`[INFO]   Total de cards na lista 'Merge': ${totalCards}`);
    console.log(`[INFO]   Cards com PR merged: ${mergedCards}`);
    console.log(`[INFO]   Cards movidos: ${movedCards}`);
    console.log(`[INFO]   Cards ignorados: ${skippedCards}`);
    console.log("==========================================");

    process.exit(0);

} catch (error) {
    console.error(`[ERROR] Erro durante execução: ${error.message}`);
    process.exit(2);
}
