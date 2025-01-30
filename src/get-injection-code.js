const fs = require('fs');
const path = require('path');

const injectedScript = fs.readFileSync(path.resolve(__dirname, 'per-project-background.js')).toString();
function getInjectionJs(backgroundConfig) {
	return injectedScript.replace('const backgroundMap = {};', `const backgroundMap = ${JSON.stringify(backgroundConfig)}`);
}
module.exports = getInjectionJs;
