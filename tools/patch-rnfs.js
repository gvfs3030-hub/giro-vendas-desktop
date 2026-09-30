const fs = require('fs');

const p = 'node_modules/@dr.pogodin/react-native-fs/package.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));

j.dependencies = Object.assign({}, j.dependencies, {
  'react-native-windows': '0.84.0',
});
j.devDependencies = Object.assign({}, j.devDependencies, {
  'react-native-windows': '0.84.0',
});

fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log('Patch aplicado em', p);
