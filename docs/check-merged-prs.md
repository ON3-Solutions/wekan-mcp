# check-merged-prs

Script que verifica cards na lista "Merge" de todos os quadros do Wekan e, quando todas as PRs associadas estao merged no GitHub, move o card para "Pendente de Testes".

## Fluxo de execucao

1. Autentica no Wekan (token ou username/password)
2. Lista todos os boards do usuario
3. Para cada board, encontra as listas "Merge" e "Pendente de Testes"
4. Para cada card na lista "Merge":
   - Obtem detalhes completos do card
   - **Verifica se o usuario (Jarbas) esta nos assignees do card** - se nao estiver, pula o card
   - Extrai URLs de PR do campo customizado "PR"
   - Verifica o estado de cada PR via GitHub CLI (`gh pr view`)
   - Se TODAS as PRs estao MERGED, move o card para "Pendente de Testes"

## Verificacao de assignees

O script verifica se o usuario configurado em `WEKAN_USER_ID` esta presente no array `assignees` do card antes de realizar qualquer movimentacao. Isso garante que:

- Se o Jarbas for desmarcado de um card antes do merge ser concluido, o card NAO sera movido automaticamente
- Apenas cards onde o Jarbas esta ativamente atribuido serao movimentados

A funcao `isUserAssignedToCard(card, userId)` em `check-merged-prs-lib.js` encapsula essa logica.

## Arquivos

- `check-merged-prs.js` - Script principal (entry point)
- `check-merged-prs-lib.js` - Funcoes puras extraidas para testabilidade
- `check-merged-prs-lib.test.js` - Testes unitarios

## Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `WEKAN_BASE_URL` | Sim | URL da instancia Wekan |
| `WEKAN_API_TOKEN` | Sim* | Token de API do Wekan |
| `WEKAN_USERNAME` | Sim* | Usuario para login |
| `WEKAN_PASSWORD` | Sim* | Senha para login |
| `WEKAN_USER_ID` | Sim | ID do usuario no Wekan |

*Obrigatorio fornecer `WEKAN_API_TOKEN` ou `WEKAN_USERNAME` + `WEKAN_PASSWORD`.

## Funcoes exportadas (check-merged-prs-lib.js)

### `extractPrUrls(prField)`
Extrai URLs de PRs do GitHub de uma string. Suporta multiplas URLs separadas por virgula ou espaco.

### `getCustomFieldValue(cardCustomFields, fieldDefinitions, fieldName)`
Obtem o valor de um campo customizado pelo nome, mapeando IDs para nomes.

### `isUserAssignedToCard(card, userId)`
Verifica se um usuario esta no array `assignees` de um card. Retorna `false` para cards sem assignees ou com valores null/undefined.
