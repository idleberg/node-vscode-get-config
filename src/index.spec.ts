// biome-ignore-all lint/suspicious/noExplicitAny: We're testing only
// biome-ignore-all lint/suspicious/noTemplateCurlyInString: placeholder syntax

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

// Store the callback for triggering cache clear
let clearCacheCallback: (() => void) | undefined;

// Mock vscode module
vi.mock('vscode', () => ({
	window: {
		activeTextEditor: undefined,
		showWarningMessage: vi.fn(),
		onDidChangeActiveTextEditor: vi.fn((callback) => {
			clearCacheCallback = callback;
			return { dispose: vi.fn() };
		}),
	},
	workspace: {
		getConfiguration: vi.fn(),
		getWorkspaceFolder: vi.fn(),
		workspaceFolders: undefined,
	},
	Range: class Range {
		constructor(
			public startLine: number,
			public startCharacter: number,
			public endLine: number,
			public endCharacter: number,
		) {}
	},
}));

// Import after mocking
const { getConfig } = await import('./index.ts');

describe('getConfig', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clear cache by triggering the onDidChangeActiveTextEditor callback
		if (clearCacheCallback) {
			clearCacheCallback();
		}
	});

	afterEach(() => {
		(vscode.window as any).activeTextEditor = undefined;
		(vscode.workspace as any).workspaceFolders = undefined;
		vi.mocked(vscode.workspace.getWorkspaceFolder).mockReset();
		vi.mocked(vscode.workspace.getConfiguration).mockReset();
	});

	describe('basic configuration retrieval', () => {
		it('should return full configuration when no notation provided', () => {
			const mockConfig = {
				editor: { fontSize: 14 },
				terminal: { shell: '/bin/bash' },
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual(mockConfig);
		});

		it('should return empty configuration when config is empty', () => {
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({} as any);

			const result = getConfig();
			expect(result).toEqual({});
		});

		it('should return specific config section using dot notation', () => {
			const mockConfig = {
				editor: {
					fontSize: 14,
					tabSize: 2,
				},
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig('editor.fontSize');
			expect(result).toBe(14);
		});

		it('should return nested config using dot notation', () => {
			const mockConfig = {
				editor: {
					minimap: {
						enabled: true,
					},
				},
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig('editor.minimap');
			expect(result).toEqual({ enabled: true });
		});
	});

	describe('variable substitution - workspace', () => {
		beforeEach(() => {
			if (clearCacheCallback) clearCacheCallback();
		});

		it('should substitute ${workspaceFolder} variable', () => {
			const mockConfig = {
				path: '${workspaceFolder}/src',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/file.ts',
					},
				},
			};

			const mockWorkspaceFolder = {
				uri: {
					fsPath: '/workspace/project',
				},
				name: 'project',
				index: 0,
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
			vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder as any);

			const result = getConfig();
			expect(result).toEqual({
				path: '/workspace/project/src',
			});
		});

		it('should substitute ${workspaceFolderBasename} variable', () => {
			const mockConfig = {
				name: '${workspaceFolderBasename}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/my-project/file.ts',
					},
				},
			};

			const mockWorkspaceFolder = {
				uri: {
					fsPath: '/workspace/my-project',
				},
				name: 'my-project',
				index: 0,
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
			vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder as any);

			const result = getConfig();
			expect(result).toEqual({
				name: 'my-project',
			});
		});

		it('should substitute ${workspaceFolder:name} for named workspace', () => {
			const mockConfig = {
				path: '${workspaceFolder:backend}/api',
			};

			const mockWorkspaceFolders = [
				{
					uri: { fsPath: '/workspace/frontend' },
					name: 'frontend',
					index: 0,
				},
				{
					uri: { fsPath: '/workspace/backend' },
					name: 'backend',
					index: 1,
				},
			];

			(vscode.workspace as any).workspaceFolders = mockWorkspaceFolders;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				path: '/workspace/backend/api',
			});
		});

		it('should not substitute ${workspaceFolder:name} when workspace not found', () => {
			const mockConfig = {
				path: '${workspaceFolder:nonexistent}/api',
			};

			const mockWorkspaceFolders = [
				{
					uri: { fsPath: '/workspace/frontend' },
					name: 'frontend',
					index: 0,
				},
			];

			(vscode.workspace as any).workspaceFolders = mockWorkspaceFolders;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				path: '${workspaceFolder:nonexistent}/api',
			});
		});

		it('should handle multiple named workspace folder substitutions', () => {
			const mockConfig = {
				paths: [
					'${workspaceFolder:frontend}/src',
					'${workspaceFolder:backend}/api',
					'${workspaceFolder:frontend}/tests',
				],
			};

			const mockWorkspaceFolders = [
				{
					uri: { fsPath: '/workspace/frontend' },
					name: 'frontend',
					index: 0,
				},
				{
					uri: { fsPath: '/workspace/backend' },
					name: 'backend',
					index: 1,
				},
			];

			(vscode.workspace as any).workspaceFolders = mockWorkspaceFolders;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				paths: ['/workspace/frontend/src', '/workspace/backend/api', '/workspace/frontend/tests'],
			});
		});
	});

	describe('variable substitution - file', () => {
		beforeEach(() => {
			if (clearCacheCallback) clearCacheCallback();
		});

		it('should substitute ${file} variable', () => {
			const mockConfig = {
				current: '${file}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/src/index.ts',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				current: '/workspace/project/src/index.ts',
			});
		});

		it('should substitute ${relativeFile} variable', () => {
			const mockConfig = {
				relative: '${relativeFile}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/src/utils/helper.ts',
					},
				},
			};

			const mockWorkspaceFolder = {
				uri: {
					fsPath: '/workspace/project',
				},
				name: 'project',
				index: 0,
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
			vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder as any);

			const result = getConfig();
			expect(result).toEqual({
				relative: 'src/utils/helper.ts',
			});
		});

		it('should substitute ${relativeFileDirname} variable', () => {
			const mockConfig = {
				dir: '${relativeFileDirname}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/src/utils/helper.ts',
					},
				},
			};

			const mockWorkspaceFolder = {
				uri: {
					fsPath: '/workspace/project',
				},
				name: 'project',
				index: 0,
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
			vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder as any);

			const result = getConfig();
			expect(result).toEqual({
				dir: 'src/utils',
			});
		});

		it('should substitute ${fileBasename} variable', () => {
			const mockConfig = {
				basename: '${fileBasename}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/src/index.ts',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				basename: 'index.ts',
			});
		});

		it('should substitute ${fileBasenameNoExtension} variable', () => {
			const mockConfig = {
				name: '${fileBasenameNoExtension}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/src/index.ts',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				name: 'index',
			});
		});

		it('should substitute ${fileDirname} variable', () => {
			const mockConfig = {
				dirname: '${fileDirname}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/src/utils/index.ts',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				dirname: '/workspace/project/src/utils',
			});
		});

		it('should substitute ${fileExtname} variable', () => {
			const mockConfig = {
				ext: '${fileExtname}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/src/index.ts',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				ext: '.ts',
			});
		});
	});

	describe('variable substitution - editor', () => {
		beforeEach(() => {
			if (clearCacheCallback) clearCacheCallback();
		});

		it('should substitute ${lineNumber} variable', () => {
			const mockConfig = {
				line: '${lineNumber}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/file.ts',
					},
				},
				selection: {
					active: {
						line: 42,
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				line: '43',
			});
		});

		it('should substitute ${selectedText} variable with single selection', () => {
			const mockConfig = {
				text: '${selectedText}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/file.ts',
					},
					getText: vi.fn((_range) => 'selected text'),
				},
				selections: [
					{
						start: { line: 0, character: 0 },
						end: { line: 0, character: 13 },
					},
				],
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				text: 'selected text',
			});
		});

		it('should handle empty selection for ${selectedText}', () => {
			const mockConfig = {
				text: '${selectedText}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/file.ts',
					},
					getText: vi.fn((_range) => ''),
				},
				selections: [
					{
						start: { line: 0, character: 0 },
						end: { line: 0, character: 0 },
					},
				],
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				text: '${selectedText}',
			});
		});

		it('should handle multiple selections for ${selectedText}', () => {
			const mockConfig = {
				text: '${selectedText}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/file.ts',
					},
					getText: vi.fn().mockReturnValueOnce('first').mockReturnValueOnce('second'),
				},
				selections: [
					{
						start: { line: 0, character: 0 },
						end: { line: 0, character: 5 },
					},
					{
						start: { line: 1, character: 0 },
						end: { line: 1, character: 6 },
					},
				],
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				text: 'first,second',
			});
		});
	});

	describe('variable substitution - system', () => {
		it('should substitute ${cwd} variable', () => {
			const mockConfig = {
				workingDir: '${cwd}',
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				workingDir: process.cwd(),
			});
		});

		it('should substitute ${execPath} variable', () => {
			const mockConfig = {
				exec: '${execPath}',
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				exec: process.execPath,
			});
		});

		it('should substitute ${pathSeparator} variable', () => {
			const mockConfig = {
				sep: '${pathSeparator}',
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				sep: process.platform === 'win32' ? '\\' : '/',
			});
		});

		it('should substitute ${env:VAR} variable', () => {
			const mockConfig = {
				home: '${env:HOME}',
			};

			process.env.HOME = '/home/user';
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				home: '/home/user',
			});
		});

		it('should not substitute ${env:VAR} when variable does not exist', () => {
			const mockConfig = {
				nonexistent: '${env:NONEXISTENT_VAR}',
			};

			delete process.env.NONEXISTENT_VAR;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				nonexistent: '${env:NONEXISTENT_VAR}',
			});
		});

		it('should substitute ${config:VAR} variable', () => {
			const mockConfig = {
				fontSize: '${config:editor.fontSize}',
				editor: {
					fontSize: 16,
				},
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				fontSize: '16',
				editor: {
					fontSize: 16,
				},
			});
		});

		it('should not substitute ${config:VAR} when config does not exist', () => {
			const mockConfig = {
				value: '${config:nonexistent.setting}',
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				value: '${config:nonexistent.setting}',
			});
		});
	});

	describe('edge cases and error handling', () => {
		beforeEach(() => {
			if (clearCacheCallback) clearCacheCallback();
		});

		it('should handle no active editor gracefully for ${file}', () => {
			const mockConfig = {
				path: '${file}',
			};

			(vscode.window as any).activeTextEditor = undefined;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				path: '${file}',
			});
			expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No open editors');
		});

		it('should handle no workspace folder gracefully', () => {
			const mockConfig = {
				path: '${workspaceFolder}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/file.ts',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
			vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(undefined);

			const result = getConfig();
			expect(result).toEqual({
				path: '${workspaceFolder}',
			});
			expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No open workspaces');
		});

		it('should handle complex nested config with multiple substitutions', () => {
			const mockConfig = {
				paths: {
					workspace: '${workspaceFolder}',
					current: '${file}',
					relative: '${relativeFile}',
				},
				system: {
					cwd: '${cwd}',
					exec: '${execPath}',
				},
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/src/index.ts',
					},
				},
			};

			const mockWorkspaceFolder = {
				uri: {
					fsPath: '/workspace/project',
				},
				name: 'project',
				index: 0,
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
			vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder as any);

			const result = getConfig();
			expect(result).toEqual({
				paths: {
					workspace: '/workspace/project',
					current: '/workspace/project/src/index.ts',
					relative: 'src/index.ts',
				},
				system: {
					cwd: process.cwd(),
					exec: process.execPath,
				},
			});
		});

		it('should handle array values with variable substitutions', () => {
			const mockConfig = {
				items: ['${cwd}/src', '${cwd}/tests', '${cwd}/dist'],
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				items: [`${process.cwd()}/src`, `${process.cwd()}/tests`, `${process.cwd()}/dist`],
			});
		});

		it('should skip variable substitution when pattern not present', () => {
			const mockConfig = {
				simple: 'value',
				number: 42,
				boolean: true,
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				simple: 'value',
				number: 42,
				boolean: true,
			});
		});

		it('should handle workspace folder with empty fsPath', () => {
			const mockConfig = {
				path: '${workspaceFolder}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/file.ts',
					},
				},
			};

			const mockWorkspaceFolder = {
				uri: {
					fsPath: '',
				},
				name: 'project',
				index: 0,
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
			vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder as any);

			const result = getConfig();
			expect(result).toEqual({
				path: '${workspaceFolder}',
			});
		});

		it('should handle undefined config notation with empty string', () => {
			const mockConfig = {
				test: 'value',
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig('');
			expect(result).toEqual(mockConfig);
		});

		it('should substitute same variable multiple times', () => {
			const mockConfig = {
				path1: '${cwd}/src',
				path2: '${cwd}/tests',
				combined: '${cwd}/src:${cwd}/tests',
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			const cwd = process.cwd();
			expect(result).toEqual({
				path1: `${cwd}/src`,
				path2: `${cwd}/tests`,
				combined: `${cwd}/src:${cwd}/tests`,
			});
		});

		it('should handle invalid line numbers', () => {
			const mockConfig = {
				line: '${lineNumber}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/file.ts',
					},
				},
				selection: {
					active: {
						line: -1,
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			// Line number 0 (from -1 + 1) is invalid and should not be substituted
			expect(result).toEqual({
				line: '${lineNumber}',
			});
		});

		it('should handle file without extension', () => {
			const mockConfig = {
				name: '${fileBasenameNoExtension}',
				ext: '${fileExtname}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/Makefile',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				name: 'Makefile',
				ext: '',
			});
		});

		it('should not substitute variables when no workspace folders', () => {
			const mockConfig = {
				path: '${workspaceFolder:myproject}/api',
			};

			(vscode.workspace as any).workspaceFolders = undefined;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				path: '${workspaceFolder:myproject}/api',
			});
		});
	});

	describe('caching behavior', () => {
		beforeEach(() => {
			if (clearCacheCallback) clearCacheCallback();
		});

		it('should cache file-based values for performance', () => {
			const mockConfig = {
				file1: '${file}',
				file2: '${file}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/workspace/project/file.ts',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				file1: '/workspace/project/file.ts',
				file2: '/workspace/project/file.ts',
			});
		});
	});

	describe('additional edge cases for coverage', () => {
		beforeEach(() => {
			if (clearCacheCallback) clearCacheCallback();
		});

		it('should handle ${lineNumber} without editor', () => {
			const mockConfig = {
				line: '${lineNumber}',
			};

			(vscode.window as any).activeTextEditor = undefined;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				line: '${lineNumber}',
			});
		});

		it('should handle ${selectedText} without editor', () => {
			const mockConfig = {
				text: '${selectedText}',
			};

			(vscode.window as any).activeTextEditor = undefined;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				text: '${selectedText}',
			});
		});

		it('should handle ${relativeFile} when no workspace folder exists', () => {
			const mockConfig = {
				relative: '${relativeFile}',
			};

			const mockEditor = {
				document: {
					uri: {
						fsPath: '/file.ts',
					},
				},
			};

			(vscode.window as any).activeTextEditor = mockEditor;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
			vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(undefined);

			const result = getConfig();
			expect(result).toEqual({
				relative: '${relativeFile}',
			});
		});

		it('should handle ${relativeFile} when no file exists', () => {
			const mockConfig = {
				relative: '${relativeFile}',
			};

			(vscode.window as any).activeTextEditor = undefined;
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			const result = getConfig();
			expect(result).toEqual({
				relative: '${relativeFile}',
			});
		});
	});
});
