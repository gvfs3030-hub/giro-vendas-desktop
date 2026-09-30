#!/usr/bin/env sh
# Roda os testes de lógica pura (roteador, banco, PDF) com Node + ts-node.
# Não precisa de Windows nem do React Native: só de Node 22+ e ts-node/pdf-lib instalados.
cd "$(dirname "$0")/.."
NODE_PATH="${NODE_PATH:-$(npm root -g)}" TS_NODE_PROJECT=tsconfig.test.json TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node10","ignoreDeprecations":"6.0"}' \
  node --no-warnings -r ts-node/register/transpile-only --test tools/tests/*.test.ts
