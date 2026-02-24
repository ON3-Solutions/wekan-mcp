# Testes

O projeto utiliza [Vitest](https://vitest.dev/) como framework de testes unitarios.

## Comandos

```bash
npm run test           # Executa todos os testes
npm run test:watch     # Executa em modo watch
npm run test:coverage  # Executa com relatorio de cobertura
```

## Estrutura

Os testes ficam no mesmo diretorio do arquivo fonte, com sufixo `.test.js` ou `.test.ts`:

```
check-merged-prs-lib.js       # Codigo fonte
check-merged-prs-lib.test.js  # Testes
```

## Cobertura

A cobertura e configurada em `vitest.config.mts`. Os thresholds minimos sao:

| Metrica | Threshold |
|---------|-----------|
| Statements | 70% |
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |

Arquivos incluidos na cobertura:
- `check-merged-prs-lib.js` - Funcoes puras de negocio (PRs mergeadas)
- `accumulate-tokens-lib.js` - Funcoes puras de negocio (acumulacao de tokens)

## Configuracao

O arquivo `vitest.config.mts` na raiz do projeto define:
- Ambiente: Node.js
- Globals habilitados (describe, it, expect sem import)
- Provider de cobertura: v8
