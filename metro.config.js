const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const previousResolveRequest = defaultConfig.resolver?.resolveRequest;

// O sql.js/dist/sql-asm.js (Emscripten) contém ramos de código para Node.js com
// require('fs'), require('path') e require('crypto'). O Metro resolve todo require()
// de forma estática, então quebra com "Unable to resolve module fs" mesmo que esse
// ramo nunca rode no Hermes. Aqui trocamos esses módulos por um módulo vazio,
// somente quando quem pede é o próprio sql.js.
const NODE_BUILTINS = new Set(['fs', 'path', 'crypto']);
const SQLJS_PATH = /[\\/]node_modules[\\/]sql\.js[\\/]/;

const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (
        NODE_BUILTINS.has(moduleName) &&
        SQLJS_PATH.test(context.originModulePath)
      ) {
        return {type: 'empty'};
      }
      if (previousResolveRequest) {
        return previousResolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
