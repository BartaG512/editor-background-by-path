const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");
const msg = require("./messages").messages;
const uuid = require("uuid");
const fetch = require("node-fetch");
const Url = require("url");
const getInjectionJs = require("./get-injection-code");

function activate(context) {
	const appDir = require.main
		? path.dirname(require.main.filename)
		: globalThis._VSCODE_FILE_ROOT;
	if (!appDir) {
		vscode.window.showInformationMessage(msg.unableToLocateVsCodeInstallationPath);
	}

	const base = path.join(appDir, "vs", "code");
	let htmlFile = path.join(base, "electron-sandbox", "workbench", "workbench.html");

	if (!fs.existsSync(htmlFile)) {
		htmlFile = path.join(base, "electron-sandbox", "workbench", "workbench-apc-extension.html");
	}
	if (!fs.existsSync(htmlFile)) {
		htmlFile = path.join(base, "electron-sandbox", "workbench", "workbench.esm.html");
	}
	if (!fs.existsSync(htmlFile)) {
		vscode.window.showInformationMessage(msg.unableToLocateVsCodeInstallationPath);
	}
	const BackupFilePath = uuid =>
		path.join(base, "electron-sandbox", "workbench", `workbench.${uuid}.bak-background-perp`);

	async function cmdInstall() {
		const uuidSession = uuid.v4();
		await createBackup(uuidSession);
		await performPatch(uuidSession);
	}

	async function cmdReinstall() {
		await uninstallImpl();
		await cmdInstall();
	}

	async function cmdUninstall() {
		await uninstallImpl();
		reloadWindow();
	}

	async function uninstallImpl() {
		const backupUuid = await getBackupUuid(htmlFile);
		if (!backupUuid) return;
		const backupPath = BackupFilePath(backupUuid);
		await restoreBackup(backupPath);
		await deleteBackupFiles();
	}

	async function getBackupUuid(htmlFilePath) {
		try {
			const htmlContent = await fs.promises.readFile(htmlFilePath, "utf-8");
			const m = htmlContent.match(
				/<!-- !! BACKGROUND-BY-PROJECT-ID ([0-9a-fA-F-]+) !! -->/
			);
			if (!m) return null;
			else return m[1];
		} catch (e) {
			vscode.window.showInformationMessage(msg.somethingWrong + e);
			throw e;
		}
	}

	async function createBackup(uuidSession) {
		try {
			let html = await fs.promises.readFile(htmlFile, "utf-8");
			html = clearExistingPatches(html);
			await fs.promises.writeFile(BackupFilePath(uuidSession), html, "utf-8");
		} catch (e) {
			vscode.window.showInformationMessage(msg.admin);
			throw e;
		}
	}

	async function restoreBackup(backupFilePath) {
		try {
			if (fs.existsSync(backupFilePath)) {
				await fs.promises.unlink(htmlFile);
				await fs.promises.copyFile(backupFilePath, htmlFile);
			}
		} catch (e) {
			vscode.window.showInformationMessage(msg.admin);
			throw e;
		}
	}

	async function deleteBackupFiles() {
		const htmlDir = path.dirname(htmlFile);
		const htmlDirItems = await fs.promises.readdir(htmlDir);
		for (const item of htmlDirItems) {
			if (item.endsWith(".bak-background-perp")) {
				await fs.promises.unlink(path.join(htmlDir, item));
			}
		}
	}

	async function performPatch(uuidSession) {

		const config = vscode.workspace.getConfiguration("editor_background_by_path");
		let html = await fs.promises.readFile(htmlFile, "utf-8");
		html = clearExistingPatches(html);

		const indicatorJS = await patchHtml(config.background_map);
		html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, "");


		html = html.replace(
			/(<\/html>)/,
			`<!-- !! BACKGROUND-BY-PROJECT-ID ${uuidSession} !! -->\n` +
				"<!-- !! BACKGROUND-BY-PROJECT-START !! -->\n" +
				indicatorJS +
				"<!-- !! BACKGROUND-BY-PROJECT-END !! -->\n</html>"
		);
		try {
			await fs.promises.writeFile(htmlFile, html, "utf-8");
		} catch (e) {
			vscode.window.showInformationMessage(msg.admin);
			disabledRestart();
			return;
		}
		reloadWindow();
	}
	function clearExistingPatches(html) {
		html = html.replace(
			/<!-- !! BACKGROUND-BY-PROJECT-START !! -->[\s\S]*?<!-- !! BACKGROUND-BY-PROJECT-END !! -->\n*/,
			""
		);
		html = html.replace(/<!-- !! BACKGROUND-BY-PROJECT-ID [\w-]+ !! -->\n*/g, "");
		return html;
	}

	async function patchHtml(config) {
		// Copy the resource to a staging directory inside the extension dir

		try {
			return `<script>${getInjectionJs(config)}</script>`;
		} catch (e) {
			console.error(e);
			vscode.window.showWarningMessage(msg.cannotLoad('Injection config'));
			return "";
		}
	}

	function reloadWindow() {
		// reload vscode-window
		vscode.commands.executeCommand("workbench.action.reloadWindow");
	}

	function disabledRestart() {
		vscode.window.showInformationMessage(msg.disabled, msg.restartIde).then(btn => {
			if (btn === msg.restartIde) {
				reloadWindow();
			}
		});
	}

	const installCustomCSS = vscode.commands.registerCommand(
		"extension.installBackgroundCSS",
		cmdInstall
	);
	const uninstallCustomCSS = vscode.commands.registerCommand(
		"extension.uninstallBackgroundCSS",
		cmdUninstall
	);
	const updateCustomCSS = vscode.commands.registerCommand(
		"extension.updateBackgroundCSS",
		cmdReinstall
	);

	context.subscriptions.push(installCustomCSS);
	context.subscriptions.push(uninstallCustomCSS);
	context.subscriptions.push(updateCustomCSS);

	vscode.workspace.onDidChangeConfiguration(async ex => {
		const hasChanged = ex.affectsConfiguration("editor_background_by_path.background_map");
		if (!hasChanged) {
			return;
		}
		await cmdReinstall();
	});

	console.log("editor-background-by-path is active!");
	console.log("Application directory", appDir);
	console.log("Main HTML file", htmlFile);
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;
