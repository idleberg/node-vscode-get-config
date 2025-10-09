import { basename, dirname, extname, join, relative, sep } from 'node:path';
import * as dotProp from 'dot-prop';
import * as vscode from 'vscode';

// Pre-compiled regex patterns for better performance
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
	config: /\${config:(?<name>[^}]+)}/g,
} as const;

// Test patterns (non-global) for checking existence
const TEST_PATTERNS = {
	workspaceFolderNamed: /\${workspaceFolder:[^}]+}/,
	env: /\${env:[^}]+}/,
	config: /\${config:[^}]+}/,
} as const;

// Variable resolver functions
type VariableResolver = () => string | undefined;

interface VariableReplacement {
	pattern: RegExp;
	testString?: string;
	resolver: VariableResolver;
	requiresValidation?: boolean;
}

// Lazy initialization cache for expensive operations
const cache = new Map<string, string | undefined>();

function getCached<T>(key: string, fn: () => T): T {
	if (!cache.has(key)) {
		// biome-ignore lint/suspicious/noExplicitAny: tbd
		cache.set(key, fn() as any);
	}
	return cache.get(key) as T;
}

// Clear cache when active editor changes
vscode.window.onDidChangeActiveTextEditor(() => {
	cache.clear();
});

export async function getConfig<T = vscode.WorkspaceConfiguration | typeof dotProp.getProperty>(
	configNotation?: string,
): Promise<T> {
	const config = configNotation?.length
		? dotProp.getProperty(vscode.workspace.getConfiguration(), configNotation)
		: vscode.workspace.getConfiguration();

	return config && Object.keys(config).length ? ((await substituteVariables(config)) as T) : (config as T);
}

async function substituteVariables(config: vscode.WorkspaceConfiguration): Promise<unknown> {
	let configString = JSON.stringify(config);

	// Define all variable replacements with their resolvers
	const replacements: VariableReplacement[] = [
		{
			pattern: REGEX_PATTERNS.workspaceFolder,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${workspaceFolder}',
			resolver: getWorkspaceFolder,
		},
		{
			pattern: REGEX_PATTERNS.workspaceFolderBasename,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${workspaceFolderBasename}',
			resolver: () => {
				const folder = getWorkspaceFolder();
				return folder ? basename(folder) : undefined;
			},
		},
		{
			pattern: REGEX_PATTERNS.file,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${file}',
			resolver: getFile,
		},
		{
			pattern: REGEX_PATTERNS.relativeFile,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${relativeFile}',
			resolver: getRelativeFile,
		},
		{
			pattern: REGEX_PATTERNS.relativeFileDirname,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${relativeFileDirname}',
			resolver: getRelativeFileDirname,
		},
		{
			pattern: REGEX_PATTERNS.fileBasename,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${fileBasename}',
			resolver: getFileBasename,
		},
		{
			pattern: REGEX_PATTERNS.fileBasenameNoExtension,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${fileBasenameNoExtension}',
			resolver: getFileBasenameNoExtension,
		},
		{
			pattern: REGEX_PATTERNS.fileDirname,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${fileDirname}',
			resolver: getFileDirname,
		},
		{
			pattern: REGEX_PATTERNS.fileExtname,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${fileExtname}',
			resolver: getFileExtname,
		},
		{
			pattern: REGEX_PATTERNS.cwd,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${cwd}',
			resolver: () => process.cwd(),
		},
		{
			pattern: REGEX_PATTERNS.lineNumber,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${lineNumber}',
			resolver: getLineNumber,
			requiresValidation: true,
		},
		{
			pattern: REGEX_PATTERNS.selectedText,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${selectedText}',
			resolver: () => {
				const selection = getSelection().join();
				return selection || undefined;
			},
		},
		{
			pattern: REGEX_PATTERNS.execPath,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${execPath}',
			resolver: () => process.execPath,
		},
		{
			pattern: REGEX_PATTERNS.pathSeparator,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Allowed placeholder syntax
			testString: '${pathSeparator}',
			resolver: () => sep,
		},
	];

	// Process simple replacements
	for (const replacement of replacements) {
		if (replacement.testString && !configString.includes(replacement.testString)) {
			continue; // Skip if pattern not present
		}

		const value = replacement.resolver();
		if (value !== undefined) {
			if (replacement.requiresValidation && !Number.parseInt(value, 10)) {
				continue; // Skip invalid line numbers
			}
			configString = configString.replace(replacement.pattern, value);
		}
	}

	// Handle complex replacements with named workspaces
	if (TEST_PATTERNS.workspaceFolderNamed.test(configString)) {
		configString = replaceNamedWorkspaceFolders(configString);
	}

	// Handle environment variables
	if (TEST_PATTERNS.env.test(configString)) {
		configString = replaceEnvironmentVariables(configString);
	}

	// Handle config variables
	if (TEST_PATTERNS.config.test(configString)) {
		configString = replaceConfigVariables(configString);
	}

	return JSON.parse(configString);
}

function replaceNamedWorkspaceFolders(configString: string): string {
	const { workspaceFolders } = vscode.workspace;
	if (!workspaceFolders) return configString;

	const matches = configString.match(REGEX_PATTERNS.workspaceFolderNamed);
	if (!matches?.length) return configString;

	let result = configString;
	const processed = new Set<string>();

	for (const match of matches) {
		if (processed.has(match)) continue; // Skip duplicates
		processed.add(match);

		const nameMatch = match.match(/\${workspaceFolder:(?<name>[^}]+)}/);
		if (nameMatch?.groups?.name) {
			const found = workspaceFolders.find((folder) => folder.name === nameMatch.groups?.name);
			if (found) {
				result = result.replaceAll(match, found.uri.fsPath);
			}
		}
	}

	return result;
}

function replaceEnvironmentVariables(configString: string): string {
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

function replaceConfigVariables(configString: string): string {
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

function getFile(): string | undefined {
	return getCached('file', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No open editors');
			return undefined;
		}
		return editor.document.uri.fsPath;
	});
}

function getWorkspaceFolder(appendPath = ''): string | undefined {
	return getCached(`workspaceFolder:${appendPath}`, () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No open editors');
			return undefined;
		}

		const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
		if (!workspaceFolder?.uri.fsPath?.length) {
			vscode.window.showWarningMessage('No open workspaces');
			return undefined;
		}

		return appendPath?.length ? join(workspaceFolder.uri.fsPath, appendPath) : workspaceFolder.uri.fsPath;
	});
}

function getRelativeFile(): string | undefined {
	return getCached('relativeFile', () => {
		const workspaceFolder = getWorkspaceFolder();
		const file = getFile();
		return workspaceFolder && file ? relative(workspaceFolder, file) : undefined;
	});
}

function getRelativeFileDirname(): string | undefined {
	return getCached('relativeFileDirname', () => {
		const relativeFile = getRelativeFile();
		return relativeFile ? dirname(relativeFile) : undefined;
	});
}

function getFileBasename(): string | undefined {
	return getCached('fileBasename', () => {
		const file = getFile();
		return file ? basename(file) : undefined;
	});
}

function getFileBasenameNoExtension(): string | undefined {
	return getCached('fileBasenameNoExtension', () => {
		const file = getFile();
		if (!file) return undefined;
		const ext = getFileExtname();
		return basename(file, ext);
	});
}

function getFileDirname(): string | undefined {
	return getCached('fileDirname', () => {
		const file = getFile();
		return file ? dirname(file) : undefined;
	});
}

function getFileExtname(): string | undefined {
	return getCached('fileExtname', () => {
		const file = getFile();
		return file ? extname(file) : undefined;
	});
}

function getLineNumber(): string | undefined {
	// Don't cache line number as it changes frequently
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showWarningMessage('No open editors');
		return undefined;
	}
	return String(editor.selection.active.line + 1);
}

function getSelection(): string[] {
	// Don't cache selection as it changes frequently
	const editor = vscode.window.activeTextEditor;
	return editor
		? editor.selections.map((selection) => {
				return editor.document.getText(
					new vscode.Range(
						selection.start.line,
						selection.start.character,
						selection.end.line,
						selection.end.character,
					),
				);
			})
		: [];
}
