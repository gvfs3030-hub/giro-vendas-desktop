# Giro Vendas — Desktop (Windows)

Versão para Windows do Giro Vendas, construída a partir do app mobile (React Native + Expo),
usando **React Native for Windows** em vez de Expo. Todas as telas (`app/`) e a lógica de negócio
(`src/`) vieram do app original; o que mudou fica isolado em `src/platform/` — a camada que troca
cada peça exclusiva de celular por um equivalente de Windows.

## Antes de tudo: leia isto

Eu não tenho uma máquina Windows para compilar e rodar este projeto de ponta a ponta — meu ambiente
aqui é um Linux sem acesso ao Visual Studio. Por isso, tudo que eu consegui **testar de verdade**
(lógica pura, em Node, com testes automatizados reais) está sólido e com 54 testes passando. Mas a
etapa final — abrir o projeto no Visual Studio e compilar para Windows pela primeira vez — depende
de módulos nativos que só existem no Windows, e essa parte **eu não consegui validar com as próprias
mãos**. Vou ser direto sobre onde está o risco, em vez de fingir que está tudo garantido.

### O que está sólido (testado com 54 testes automatizados)
- **Roteador** (`src/platform/router.tsx` + `routerCore.ts`): substitui o expo-router. 10 testes
  cobrindo navegação, parâmetros, voltar, e a barra lateral.
- **Banco de dados** (`sqliteCompat.ts` + `sqlJsEngine.ts`): substitui o expo-sqlite usando **sql.js**
  (SQLite compilado para JavaScript puro — não é um módulo nativo, então não depende de nada
  específico do Windows). 10 testes, incluindo **as 86 consultas SQL reais de todas as telas do
  app**, rodando contra o schema de verdade.
- **Geração de PDF** (`pdfBuilders.ts` + `printing.ts`): substitui expo-print/expo-sharing usando
  **pdf-lib** (também JavaScript puro). 13 testes que abrem o PDF gerado de verdade e conferem o
  texto e a posição de cada linha (não só "o PDF foi criado").
- **Configurações/backup** (`storage.ts`): substitui o AsyncStorage. 11 testes, incluindo gravação
  atômica e recuperação de queda no meio de uma gravação.
- **Gráficos** (`charts.tsx` + `chartMath.ts`): substitui react-native-chart-kit desenhando só com
  `<View>` (sem depender de react-native-svg). 10 testes de geometria.
- **Registro de rotas**: um teste confirma que **toda tela que existe em `app/` está registrada**
  e que **todo lugar do código que navega para algum caminho tem uma rota correspondente** — isso
  pega esquecimentos automaticamente.

Rode `npm test` a qualquer momento para conferir (não precisa de Windows nem de `node_modules` do
React Native — só Node 20+).

### O que é risco real, ainda não comprovado em Windows
A única peça onde não encontrei uma biblioteca com suporte a Windows 100% confirmado é o **acesso a
arquivos** (`src/platform/fs.ts`), usado para salvar o banco de dados, o backup e os PDFs em disco.
Usei `@dr.pogodin/react-native-fs`, que anuncia suporte a Windows, mas a própria documentação do
pacote observa que o app de exemplo deles atualmente falha ao compilar para Windows por bugs no
react-native-windows. Pode funcionar bem no seu caso (é o pacote mais próximo de "solução padrão"
que existe hoje) ou pode dar problema — não tenho como confirmar sem uma máquina Windows.

**Por isso todo o resto do app conversa com o disco só através de uma interface pequena
(`FileAdapter`, em `src/platform/fileAdapter.ts`)** — se esse pacote não funcionar direito no seu
setup, o conserto fica isolado em reescrever `src/platform/fs.ts` (um arquivo só). Nenhuma tela,
nenhuma lógica de negócio, nenhum dos outros módulos de `platform/` precisa mudar.

## Ordem recomendada para montar o projeto

Não recomendo colar o app inteiro no Visual Studio de primeira. Sugiro validar em 3 passos —
cada um isola um risco diferente, então se algo falhar você sabe exatamente onde:

1. **"Hello World" do react-native-windows puro** — confirma que o Visual Studio, os workloads e o
   toolchain estão certos, sem nenhuma dependência nossa envolvida.
2. **Smoke test do `fs.ts`** — uma tela mínima que só grava e lê um arquivo, para confirmar que
   `@dr.pogodin/react-native-fs` funciona no seu ambiente antes de depender dele no banco de dados
   inteiro.
3. **App completo** — só depois dos dois primeiros passarem.

Os comandos abaixo assumem PowerShell, Node 20+, e Visual Studio 2026 com os workloads de
desenvolvimento **Desktop com C++** e **Desenvolvimento universal do Windows** instalados (o
instalador do Visual Studio mostra esses nomes).

### Passo 1 — Hello World

```powershell
npx @react-native-community/cli init GiroHelloWorld --version 0.84.1
cd GiroHelloWorld
npx react-native-windows-init --overwrite
npx react-native run-windows
```

Se uma janela abrir com o template padrão do React Native, o ambiente está correto. Se travar aqui,
o problema é do toolchain (Visual Studio/SDK), não deste projeto — vale conferir a documentação
oficial: https://microsoft.github.io/react-native-windows/docs/getting-started

### Passo 2 — smoke test de arquivos

Dentro do mesmo `GiroHelloWorld`:

```powershell
npm install @dr.pogodin/react-native-fs
```

Troque o conteúdo de `App.tsx` por:

```tsx
import React, {useState} from 'react';
import {View, Text, Button} from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';

export default function App() {
  const [status, setStatus] = useState('...');
  const test = async () => {
    try {
      const path = RNFS.DocumentDirectoryPath + '\\teste.txt';
      await RNFS.writeFile(path, 'funcionou', 'utf8');
      const back = await RNFS.readFile(path, 'utf8');
      setStatus(`OK: "${back}" em ${path}`);
    } catch (e: any) {
      setStatus('ERRO: ' + e.message);
    }
  };
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <Button title="Testar arquivo" onPress={test} />
      <Text style={{marginTop: 16}}>{status}</Text>
    </View>
  );
}
```

`npx react-native run-windows` de novo, clique no botão. Se aparecer "OK: ...", o `fs.ts` deste
projeto deve funcionar sem ajuste nenhum. **Se der erro, me mostre a mensagem** — o conserto é
trocar só o conteúdo de `src/platform/fs.ts` para usar outra biblioteca (a interface `FileAdapter`
já isola exatamente essa troca).

### Passo 3 — o app completo

```powershell
npx @react-native-community/cli init GiroVendasDesktop --version 0.84.1
cd GiroVendasDesktop
npx react-native-windows-init --overwrite
```

Isso cria um projeto novo com a pasta `windows/` (o projeto do Visual Studio) já configurada para a
versão certa do react-native-windows — gerar essa pasta é justamente o que eu não consigo fazer
daqui, porque ela tem arquivos de projeto binários/específicos do Visual Studio.

Agora copie por cima os arquivos deste pacote (que eu já preparei):
- `App.tsx` (substitui o gerado pelo `init`)
- as pastas `app/`, `src/`, `tools/`
- `package.json` → **mescle** as `dependencies` com o `package.json` que o `init` gerou (ele já traz
  `react`, `react-native` e `react-native-windows` nas versões certas; adicione as outras:
  `sql.js`, `pdf-lib`, `@dr.pogodin/react-native-fs`, `react-native-toast-message`,
  `react-native-vector-icons`)
- `tsconfig.test.json`

```powershell
npm install
```

### Ícones (Ionicons)

O app usa `src/platform/icons.tsx`, que desenha os ícones a partir da fonte Ionicons. Copie o
arquivo de fonte para dentro do projeto Windows:

```powershell
copy node_modules\react-native-vector-icons\Fonts\Ionicons.ttf windows\GiroVendasDesktop\Assets\Ionicons.ttf
```

(o nome da pasta depois de `windows\` é o nome do seu projeto — o `init` mostra esse nome no
final). Depois, no arquivo `windows\GiroVendasDesktop\GiroVendasDesktop.vcxproj`, adicione o `.ttf`
como conteúdo copiado para a saída — o guia oficial de fontes customizadas do RNW mostra o passo a
passo exato, com screenshots do Visual Studio:
https://microsoft.github.io/react-native-windows/docs/fonts

### Rodando

```powershell
npx react-native run-windows
```

## Empacotando para distribuir (MSIX / instalador)

O `react-native-windows-init` já deixa o projeto pronto para gerar um pacote MSIX pelo próprio
Visual Studio (botão direito no projeto → **Publish** → **Create App Packages**). Como vimos antes:
publicar na Microsoft Store é gratuito hoje em dia (cadastro de desenvolvedor sem taxa desde
set/2025); e mesmo sem publicar na Store, dá para gerar o `.msix`/`.appx` e distribuir por fora —
o Windows vai pedir para o usuário confiar no instalador (sem certificado de assinatura, o que é
opcional e pago à parte).

## O que eu mudaria se este fosse ficar só no celular (contexto)

Como pediu na conversa anterior, os 3 ajustes de UX do app mobile (assinatura removida, teclado não
cobre mais campos, botão flutuante não cola mais na barra do Android) já estão aplicados na base de
código que virou este projeto — ou seja, o app mobile original também já saiu daqui corrigido.

## Estrutura

```
App.tsx                    ponto de entrada (equivalente ao app/_layout.tsx do celular)
app/                        as mesmas telas do celular (client-add, products, new-sale/, etc.)
src/
  components/Sidebar.tsx    barra lateral (substitui as abas + o menu "Mais" do celular)
  contexts/                 iguais ao celular (Theme, AppState, SaleWizard)
  database/database.ts      igual ao celular (usa a mesma sqliteCompat por baixo)
  platform/                 TUDO que é específico de desktop mora aqui
    router.tsx, routerCore.ts     roteador próprio (substitui expo-router)
    routes.tsx                    registro de rotas (URL → tela)
    sqliteCompat.ts, sqlJsEngine.ts   banco (substitui expo-sqlite)
    fs.ts, fileAdapter.ts, base64.ts  arquivos (substitui expo-file-system) — RISCO, ver acima
    storage.ts                    key-value (substitui AsyncStorage)
    pdfBuilders.ts, printing.ts    PDF (substitui expo-print/expo-sharing)
    charts.tsx, chartMath.ts      gráficos (substitui react-native-chart-kit)
    icons.tsx                     ícones (substitui @expo/vector-icons)
    insets.ts                     margens de segurança (sempre zero no desktop)
tools/
  tests/*.test.ts            54 testes (rodam em Node puro, sem Windows)
  run-tests.sh               roda tudo: ./tools/run-tests.sh
```

## Dúvidas que vão aparecer

- **`Alert.alert` e `react-native-toast-message` funcionam no Windows?** Prováveis de funcionar (são
  componentes que só usam `View`/`Text`/`Animated`, sem módulo nativo próprio), mas eu não consegui
  testar na prática — é o tipo de coisa que aparece já no Passo 1/2 acima.
- **Por que sql.js e pdf-lib e não bibliotecas nativas?** Justamente para *não* depender de módulos
  nativos nessas duas peças — sql.js e pdf-lib são JavaScript puro, então funcionam em qualquer
  motor JS (Hermes incluso) sem depender de nada específico do Windows. O único módulo nativo que
  sobrou de verdade é o de arquivos (`fs.ts`), que é onde concentrei o aviso de risco acima.
