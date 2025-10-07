import * as dotProp from "dot-prop";
import { basename, dirname, extname, join, relative, sep } from "path";
import * as vscode from "vscode";

//#region src/index.ts
const REGEX_PATTERNS = {
	workspaceFolder: /\${workspaceFolder}/g,
	workspaceFolderBasename: /\${workspaceFolderBasename}/g,
	workspaceFolderNamed: /\${workspaceFolder:(?<name>[^}]+)}/g,
	file: /\${file}/g,
	relativeFile: /\${relativeFile}/g,
	relativeFileDirname: /\${relativeFileDirname}/g,
	fileBasename: /\${fileBasename}/g,
	fileBasenameNoExtension: /\${fileBasenameNoExtension}/g,
	fileDirname: /\${fileDirname}/g,
	fileExtname: /\${fileExtname}/g,
	cwd: /\${cwd}/g,
	lineNumber: /\${lineNumber}/g,
	selectedText: /\${selectedText}/g,
	execPath: /\${execPath}/g,
	pathSeparator: /\${pathSeparator}/g,
	env: /\${env:(?<name>[^}]+)}/g,
	config: /\${config:(?<name>[^}]+)}/g
};
const TEST_PATTERNS = {
	workspaceFolderNamed: /\${workspaceFolder:[^}]+}/,
	env: /\${env:[^}]+}/,
	config: /\${config:[^}]+}/
};
const cache = new Map();
function getCached(key, fn) {
	if (!cache.has(key)) {
		cache.set(key, fn());
	}
	return cache.get(key);
}
vscode.window.onDidChangeActiveTextEditor(() => {
	cache.clear();
});
async function getConfig(configNotation) {
	const config = configNotation?.length ? dotProp.getProperty(vscode.workspace.getConfiguration(), configNotation) : vscode.workspace.getConfiguration();
	return config && Object.keys(config).length ? await substituteVariables(config) : config;
}
async function substituteVariables(config) {
	let configString = JSON.stringify(config);
	const replacements = [
		{
			pattern: REGEX_PATTERNS.workspaceFolder,
			testString: "${workspaceFolder}",
			resolver: getWorkspaceFolder
		},
		{
			pattern: REGEX_PATTERNS.workspaceFolderBasename,
			testString: "${workspaceFolderBasename}",
			resolver: () => {
				const folder = getWorkspaceFolder();
				return folder ? basename(folder) : undefined;
			}
		},
		{
			pattern: REGEX_PATTERNS.file,
			testString: "${file}",
			resolver: getFile
		},
		{
			pattern: REGEX_PATTERNS.relativeFile,
			testString: "${relativeFile}",
			resolver: getRelativeFile
		},
		{
			pattern: REGEX_PATTERNS.relativeFileDirname,
			testString: "${relativeFileDirname}",
			resolver: getRelativeFileDirname
		},
		{
			pattern: REGEX_PATTERNS.fileBasename,
			testString: "${fileBasename}",
			resolver: getFileBasename
		},
		{
			pattern: REGEX_PATTERNS.fileBasenameNoExtension,
			testString: "${fileBasenameNoExtension}",
			resolver: getFileBasenameNoExtension
		},
		{
			pattern: REGEX_PATTERNS.fileDirname,
			testString: "${fileDirname}",
			resolver: getFileDirname
		},
		{
			pattern: REGEX_PATTERNS.fileExtname,
			testString: "${fileExtname}",
			resolver: getFileExtname
		},
		{
			pattern: REGEX_PATTERNS.cwd,
			testString: "${cwd}",
			resolver: () => process.cwd()
		},
		{
			pattern: REGEX_PATTERNS.lineNumber,
			testString: "${lineNumber}",
			resolver: getLineNumber,
			requiresValidation: true
		},
		{
			pattern: REGEX_PATTERNS.selectedText,
			testString: "${selectedText}",
			resolver: () => {
				const selection = getSelection().join();
				return selection || undefined;
			}
		},
		{
			pattern: REGEX_PATTERNS.execPath,
			testString: "${execPath}",
			resolver: () => process.execPath
		},
		{
			pattern: REGEX_PATTERNS.pathSeparator,
			testString: "${pathSeparator}",
			resolver: () => sep
		}
	];
	for (const replacement of replacements) {
		if (replacement.testString && !configString.includes(replacement.testString)) {
			continue;
		}
		const value = replacement.resolver();
		if (value !== undefined) {
			if (replacement.requiresValidation && !parseInt(value)) {
				continue;
			}
			configString = configString.replace(replacement.pattern, value);
		}
	}
	if (TEST_PATTERNS.workspaceFolderNamed.test(configString)) {
		configString = replaceNamedWorkspaceFolders(configString);
	}
	if (TEST_PATTERNS.env.test(configString)) {
		configString = replaceEnvironmentVariables(configString);
	}
	if (TEST_PATTERNS.config.test(configString)) {
		configString = replaceConfigVariables(configString);
	}
	return JSON.parse(configString);
}
function replaceNamedWorkspaceFolders(configString) {
	const { workspaceFolders } = vscode.workspace;
	if (!workspaceFolders) return configString;
	const matches = configString.match(REGEX_PATTERNS.workspaceFolderNamed);
	if (!matches?.length) return configString;
	let result = configString;
	const processed = new Set();
	for (const match of matches) {
		if (processed.has(match)) continue;
		processed.add(match);
		const nameMatch = match.match(/\${workspaceFolder:(?<name>[^}]+)}/);
		if (nameMatch?.groups?.name) {
			const found = workspaceFolders.find((folder) => folder.name === nameMatch.groups.name);
			if (found) {
				result = result.replaceAll(match, found.uri.fsPath);
			}
		}
	}
	return result;
}
function replaceEnvironmentVariables(configString) {
	const match = configString.match(REGEX_PATTERNS.env);
	if (!match?.[0]) return configString;
	const nameMatch = match[0].match(/\${env:(?<name>[^}]+)}/);
	if (nameMatch?.groups?.name) {
		const envValue = process.env[nameMatch.groups.name];
		if (envValue) {
			return configString.replace(REGEX_PATTERNS.env, envValue);
		}
	}
	return configString;
}
function replaceConfigVariables(configString) {
	const match = configString.match(REGEX_PATTERNS.config);
	if (!match?.[0]) return configString;
	const nameMatch = match[0].match(/\${config:(?<name>[^}]+)}/);
	if (nameMatch?.groups?.name) {
		const configuration = vscode.workspace.getConfiguration();
		const value = dotProp.getProperty(configuration, nameMatch.groups.name);
		if (value !== undefined) {
			return configString.replace(REGEX_PATTERNS.config, String(value));
		}
	}
	return configString;
}
function getFile() {
	return getCached("file", () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No open editors");
			return undefined;
		}
		return editor.document.uri.fsPath;
	});
}
function getWorkspaceFolder(appendPath = "") {
	return getCached(`workspaceFolder:${appendPath}`, () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No open editors");
			return undefined;
		}
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
		if (!workspaceFolder?.uri.fsPath?.length) {
			vscode.window.showWarningMessage("No open workspaces");
			return undefined;
		}
		return appendPath?.length ? join(workspaceFolder.uri.fsPath, appendPath) : workspaceFolder.uri.fsPath;
	});
}
function getRelativeFile() {
	return getCached("relativeFile", () => {
		const workspaceFolder = getWorkspaceFolder();
		const file = getFile();
		return workspaceFolder && file ? relative(workspaceFolder, file) : undefined;
	});
}
function getRelativeFileDirname() {
	return getCached("relativeFileDirname", () => {
		const relativeFile = getRelativeFile();
		return relativeFile ? dirname(relativeFile) : undefined;
	});
}
function getFileBasename() {
	return getCached("fileBasename", () => {
		const file = getFile();
		return file ? basename(file) : undefined;
	});
}
function getFileBasenameNoExtension() {
	return getCached("fileBasenameNoExtension", () => {
		const file = getFile();
		if (!file) return undefined;
		const ext = getFileExtname();
		return basename(file, ext);
	});
}
function getFileDirname() {
	return getCached("fileDirname", () => {
		const file = getFile();
		return file ? dirname(file) : undefined;
	});
}
function getFileExtname() {
	return getCached("fileExtname", () => {
		const file = getFile();
		return file ? extname(file) : undefined;
	});
}
function getLineNumber() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showWarningMessage("No open editors");
		return undefined;
	}
	return String(editor.selection.active.line + 1);
}
function getSelection() {
	const editor = vscode.window.activeTextEditor;
	return editor ? editor.selections.map((selection) => {
		return editor.document.getText(new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character));
	}) : [];
}

//#endregion
export { getConfig };