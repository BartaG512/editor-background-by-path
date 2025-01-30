exports.messages = {
	admin: "Run VS Code with admin privileges so the changes can be applied.",
	enabled:
		"Editor Background By Path enabled. Restart to take effect. " +
		"If Code complains about it is corrupted, CLICK DON'T SHOW AGAIN. " +
		"See README for more detail.",
	disabled: "Editor Background By Path disabled and reverted to default. Restart to take effect.",
	already_disabled: "Editor Background By Path.",
	somethingWrong: "Something went wrong: ",
	restartIde: "Restart Visual Studio Code",
	unableToLocateVsCodeInstallationPath:
		"Unable to locate the installation path of VSCode. This extension may not function correctly.",
	cannotLoad: url => `Cannot load '${url}'. Skipping.`
};
