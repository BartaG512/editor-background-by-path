/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const msg = require('./messages').messages;
const uuid = require('uuid');
const getInjectionJs = require('./get-injection-code');

class EditBackgroundByPath {
  constructor(context) {
    this.context = context;
    this.appDir = require.main ? path.dirname(require.main.filename) : globalThis._VSCODE_FILE_ROOT;
    this.base = path.join(this.appDir, 'vs', 'code');
    this.htmlFile = this.getHtmlFilePath();
    this.statusBarItem = null;
  }

  activate() {
    if (!this.appDir) {
      vscode.window.showInformationMessage(msg.unableToLocateVsCodeInstallationPath);
    }

    this.registerCommands();
    this.setupStatusBar();
    this.updateStatusBarTooltip();

    vscode.workspace.onDidChangeConfiguration(async(ex) => {
      const hasChanged = ex.affectsConfiguration('editor_background_by_path.backgrounds');

      if (!hasChanged) {
        return;
      }
      await this.cmdReinstall({ reload: false });
      this.updateStatusBarTooltip();
    });

    console.log('editor-background-by-path is active!');
    console.log('Application directory', this.appDir);
    console.log('Main HTML file', this.htmlFile);
  }

  getHtmlFilePath() {
    // List of possible folders to check for backward compatibility
    const folders = ['electron-sandbox', 'electron-browser'];
    // List of possible HTML files to check
    const fileNames = ['workbench-dev.html', 'workbench.html', 'workbench-apc-extension.html', 'workbench.esm.html'];

    let htmlFile = null;

    // Try each folder and file combination until we find an existing one
    for (const folder of folders) {
      for (const fileName of fileNames) {
        const filePath = path.join(this.base, folder, 'workbench', fileName);

        if (fs.existsSync(filePath)) {
          htmlFile = filePath;
          break;
        }
      }

      if (htmlFile) {
        break;
      }
    }
    console.log('htmlfile:', htmlFile);

    if (!htmlFile) {
      vscode.window.showInformationMessage(msg.unableToLocateVsCodeInstallationPath);
    }

    return htmlFile;
  }

  BackupFilePath(uuid) {
    // Determine the folder by checking which exists (electron-sandbox or electron-browser)
    const htmlFileDir = path.dirname(this.htmlFile);
    const folderName = path.basename(path.dirname(htmlFileDir));

    return path.join(this.base, folderName, 'workbench', `workbench.${uuid}.bak-background-perp`);
  }

  async cmdInstall(options) {
    const uuidSession = uuid.v4();
    await this.createBackup(uuidSession);
    await this.performPatch(uuidSession, options);
  }

  async cmdReinstall(options) {
    await this.uninstallImpl();
    await this.cmdInstall(options);
  }

  async cmdUninstall() {
    await this.uninstallImpl();
    this.reloadWindow();
  }

  async uninstallImpl() {
    const backupUuid = await this.getBackupUuid(this.htmlFile);

    if (!backupUuid) {
      return;
    }
    const backupPath = this.BackupFilePath(backupUuid);
    await this.restoreBackup(backupPath);
    await this.deleteBackupFiles();
  }

  async getBackupUuid(htmlFilePath) {
    try {
      const htmlContent = await fs.promises.readFile(htmlFilePath, 'utf-8');
      const m = htmlContent.match(/<!-- !! BACKGROUND-BY-PROJECT-ID ([0-9a-fA-F-]+) !! -->/);

      if (!m) {
        return null;
      }
      return m[1];
    } catch (e) {
      vscode.window.showInformationMessage(msg.somethingWrong + e);
      throw e;
    }
  }

  async restoreBackup(backupFilePath) {
    try {
      if (fs.existsSync(backupFilePath)) {
        await fs.promises.unlink(this.htmlFile);
        await fs.promises.copyFile(backupFilePath, this.htmlFile);
      }
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      throw e;
    }
  }

  async createBackup(uuidSession) {
    try {
      let html = await fs.promises.readFile(this.htmlFile, 'utf-8');
      html = this.clearExistingPatches(html);
      await fs.promises.writeFile(this.BackupFilePath(uuidSession), html, 'utf-8');
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      throw e;
    }
  }

  async deleteBackupFiles() {
    const htmlDir = path.dirname(this.htmlFile);
    const htmlDirItems = await fs.promises.readdir(htmlDir);
    for (const item of htmlDirItems) {
      if (item.endsWith('.bak-background-perp')) {
        await fs.promises.unlink(path.join(htmlDir, item));
      }
    }
  }

  async performPatch(uuidSession, options) {
    const config = vscode.workspace.getConfiguration('editor_background_by_path');
    let html = await fs.promises.readFile(this.htmlFile, 'utf-8');
    html = this.clearExistingPatches(html);
    const indicatorJS = await this.patchHtml(config.backgrounds);
    html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, '');
    html = html.replace(
      /(<\/html>)/,
      `<!-- !! BACKGROUND-BY-PROJECT-ID ${uuidSession} !! -->\n` +
      `<!-- !! BACKGROUND-BY-PROJECT-START !! -->\n${indicatorJS}<!-- !! BACKGROUND-BY-PROJECT-END !! -->\n</html>`,
    );
    try {
      await fs.promises.writeFile(this.htmlFile, html, 'utf-8');
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      this.disabledRestart();
      return;
    }

    if (options?.reload) {
      this.reloadWindow();
    }
  }

  clearExistingPatches(html) {
    html = html.replace(
      /<!-- !! BACKGROUND-BY-PROJECT-START !! -->[\s\S]*?<!-- !! BACKGROUND-BY-PROJECT-END !! -->\n*/,
      '',
    );
    html = html.replace(/<!-- !! BACKGROUND-BY-PROJECT-ID [\w-]+ !! -->\n*/g, '');
    return html;
  }

  async patchHtml(config) {
    try {
      let res = `<script data-extension="editor-background-by-path">${getInjectionJs(config)}</script>`;
      res += `<style data-extension="editor-background-by-path">
				div#bartag\\.editor-background-by-path { display: none!important; }
			</style>`;
      return res;
    } catch (e) {
      console.error(e);
      vscode.window.showWarningMessage(msg.cannotLoad('Injection config'));
      return '';
    }
  }

  reloadWindow() {
    vscode.commands.executeCommand('workbench.action.reloadWindow');
  }

  disabledRestart() {
    vscode.window.showInformationMessage(msg.disabled, msg.restartIde).then((btn) => {
      if (btn === msg.restartIde) {
        this.reloadWindow();
      }
    });
  }

  registerCommands() {
    const installCustomCSS = vscode.commands.registerCommand(
      'extension.installBackgroundCSS',
      () => {
        this.cmdInstall({ reload: true });
      },
    );
    const uninstallCustomCSS = vscode.commands.registerCommand(
      'extension.uninstallBackgroundCSS',
      this.cmdUninstall.bind(this),
    );
    const updateCustomCSS = vscode.commands.registerCommand(
      'extension.updateBackgroundCSS',
      () => {
        return this.cmdReinstall({ reload: true });
      },
    );

    this.context.subscriptions.push(installCustomCSS);
    this.context.subscriptions.push(uninstallCustomCSS);
    this.context.subscriptions.push(updateCustomCSS);
  }

  setupStatusBar() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.text = '$(paintcan) Edit Background';
    this.statusBarItem.show();
    this.context.subscriptions.push(this.statusBarItem);
  }

  updateStatusBarTooltip() {
    const config = vscode.workspace.getConfiguration('editor_background_by_path');
    this.statusBarItem.tooltip = JSON.stringify(config.backgrounds);
  }
}

let editBackgroundByPath;

function activate(context) {
  editBackgroundByPath = new EditBackgroundByPath(context);
  editBackgroundByPath.activate();
}

function deactivate() {
}

exports.activate = activate;

exports.deactivate = deactivate;
