const {builtinModules} = require('module');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const previousResolveRequest = defaultConfig.resolver?.resolveRequest;

// O sql.js/dist/sql-asm.js (Emscripten) contém um ramo de código para Node.js com
// require("node:fs"), require("node:path"), require("node:crypto") etc. O Metro resolve
// todo require() de forma estática, então quebra com "Unable to resolve module node:fs"
// mesmo que esse ramo nunca rode no Hermes. Aqui trocamos qualquer módulo nativo do Node
// (com ou sem o prefixo "node:") por um módulo vazio, somente quando quem pede é o sql.js.
const NODE_BUILTINS = new Set(builtinModules);
const SQLJS_PATH = /[\\/]node_modules[\\/]sql\.js[\\/]/;

function isNodeBuiltin(name) {
  const bare = name.startsWith('node:') ? name.slice(5) : name;
  return NODE_BUILTINS.has(bare);
}

const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (
        isNodeBuiltin(moduleName) &&
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
