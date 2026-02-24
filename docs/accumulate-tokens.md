# Acumulacao de Tokens Consumidos

## Visao Geral

O sistema rastreia o consumo de tokens de IA (Claude) por card no Wekan, armazenando o total acumulado no campo customizado "Tokens Consumidos".

## Arquitetura

```
accumulate-tokens-lib.js   # Funcoes puras de negocio (testavel)
accumulate-tokens.js       # Script CLI que usa a lib + Wekan API
```

### accumulate-tokens-lib.js

Funcoes puras extraidas para facilitar testes unitarios:

| Funcao | Descricao |
|--------|-----------|
| `parseTokenValue(value)` | Parseia valor de token (string/number/null) para inteiro |
| `findTokensField(customFieldDefs)` | Encontra a definicao do campo "Tokens Consumidos" (case-insensitive) |
| `getCurrentTokens(cardCustomFields, tokenFieldDef)` | Obtem o valor atual de tokens de um card |
| `accumulateTokens(currentValue, tokensToAdd)` | Calcula novo valor acumulado (nunca negativo) |

### accumulate-tokens.js

Script CLI que acumula tokens em batch para multiplos cards.

**Variaveis de ambiente:**
- `WEKAN_BASE_URL` - URL do Wekan
- `WEKAN_API_TOKEN` ou (`WEKAN_USERNAME` + `WEKAN_PASSWORD`)
- `WEKAN_USER_ID` - ID do usuario
- `CARDS_JSON` - JSON array com metadados dos cards `[{id, boardId, listId, title}]`
- `PER_CARD_TOKENS` - Quantidade de tokens a acumular por card

**Exemplo de uso:**
```bash
CARDS_JSON='[{"id":"abc","boardId":"def","listId":"ghi","title":"Card 1"}]' \
PER_CARD_TOKENS=5000 \
node accumulate-tokens.js
```

**Comportamento:**
1. Para cada card, busca o card atualizado em todas as listas do board (pode ter sido movido)
2. Encontra a definicao do campo "Tokens Consumidos"
3. Le o valor atual do campo
4. Acumula: `novoValor = valorAtual + tokensParaAdicionar`
5. Atualiza o campo no Wekan

## Integracao com jarbas-dev

O `start.sh` do jarbas-dev calcula tokens de duas fontes e acumula no campo:

```
TOTAL_POR_CARD = JARBAS_CORE_TOKENS + JARBAS_DEV_PER_CARD

Onde:
- JARBAS_CORE_TOKENS: tokens da sessao jarbas-core (por card, via HTTP API)
- JARBAS_DEV_PER_CARD: tokens da sessao Claude local / numero de cards
```

O valor e ACUMULADO (somado ao existente), nao substituido.
