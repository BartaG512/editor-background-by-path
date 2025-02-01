const fs = require('fs');
const path = require('path');

const injectedScript = fs.readFileSync(path.resolve(__dirname, 'injected-code.js')).toString();

function getInjectionJs(backgroundConfig) {
  // console.log('backgroundConfig:', backgroundConfig);
  return injectedScript.replace('const backgroundArray = [];', `const backgroundArray = ${JSON.stringify(backgroundConfig)}`);
}

module.exports = getInjectionJs;
