'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vscode = require('vscode');
var path = require('path');

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var isObj = value => {
	const type = typeof value;
	return value !== null && (type === 'object' || type === 'function');
};

const disallowedKeys = new Set([
	'__proto__',
	'prototype',
	'constructor'
]);

const isValidPath = pathSegments => !pathSegments.some(segment => disallowedKeys.has(segment));

function getPathSegments(path) {
	const pathArray = path.split('.');
	const parts = [];

	for (let i = 0; i < pathArray.length; i++) {
		let p = pathArray[i];

		while (p[p.length - 1] === '\\' && pathArray[i + 1] !== undefined) {
			p = p.slice(0, -1) + '.';
			p += pathArray[++i];
		}

		parts.push(p);
	}

	if (!isValidPath(parts)) {
		return [];
	}

	return parts;
}

var dotProp = {
	get(object, path, value) {
		if (!isObj(object) || typeof path !== 'string') {
			return value === undefined ? object : value;
		}

		const pathArray = getPathSegments(path);
		if (pathArray.length === 0) {
			return;
		}

		for (let i = 0; i < pathArray.length; i++) {
			object = object[pathArray[i]];

			if (object === undefined || object === null) {
				// `object` is either `undefined` or `null` so we want to stop the loop, and
				// if this is not the last bit of the path, and
				// if it did't return `undefined`
				// it would return `null` if `object` is `null`
				// but we want `get({foo: null}, 'foo.bar')` to equal `undefined`, or the supplied value, not `null`
				if (i !== pathArray.length - 1) {
					return value;
				}

				break;
			}
		}

		return object;
	},

	set(object, path, value) {
		if (!isObj(object) || typeof path !== 'string') {
			return object;
		}

		const root = object;
		const pathArray = getPathSegments(path);

		for (let i = 0; i < pathArray.length; i++) {
			const p = pathArray[i];

			if (!isObj(object[p])) {
				object[p] = {};
			}

			if (i === pathArray.length - 1) {
				object[p] = value;
			}

			object = object[p];
		}

		return root;
	},

	delete(object, path) {
		if (!isObj(object) || typeof path !== 'string') {
			return false;
		}

		const pathArray = getPathSegments(path);

		for (let i = 0; i < pathArray.length; i++) {
			const p = pathArray[i];

			if (i === pathArray.length - 1) {
				delete object[p];
				return true;
			}

			object = object[p];

			if (!isObj(object)) {
				return false;
			}
		}
	},

	has(object, path) {
		if (!isObj(object) || typeof path !== 'string') {
			return false;
		}

		const pathArray = getPathSegments(path);
		if (pathArray.length === 0) {
			return false;
		}

		// eslint-disable-next-line unicorn/no-for-loop
		for (let i = 0; i < pathArray.length; i++) {
			if (isObj(object)) {
				if (!(pathArray[i] in object)) {
					return false;
				}

				object = object[pathArray[i]];
			} else {
				return false;
			}
		}

		return true;
	}
};

function getConfig(configNotation) {
    return __awaiter(this, void 0, void 0, function () {
        var config, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    config = (configNotation === null || configNotation === void 0 ? void 0 : configNotation.length) ? dotProp.get(vscode.workspace.getConfiguration(), configNotation)
                        : vscode.workspace.getConfiguration();
                    if (!Object.keys(config).length) return [3 /*break*/, 2];
                    return [4 /*yield*/, substituteVariables(config)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = config;
                    _b.label = 3;
                case 3: return [2 /*return*/, _a];
            }
        });
    });
}
function substituteVariables(config) {
    return __awaiter(this, void 0, void 0, function () {
        var configString, lineNumber, selectedText, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    configString = JSON.stringify(config);
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${workspaceFolder}')) {
                        configString = configString.replace(/\${workspaceFolder}/g, getWorkspaceFolder());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${workspaceFolderBasename}')) {
                        configString = configString.replace(/\${workspaceFolderBasename}/g, path.basename(getWorkspaceFolder()));
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${file}')) {
                        configString = configString.replace(/\${file}/g, getFile());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${relativeFile}')) {
                        configString = configString.replace(/\${relativeFile}/g, getRelativeFile());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${relativeFileDirname}')) {
                        configString = configString.replace(/\${relativeFileDirname}/g, getRelativeFileDirname());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${fileBasename}')) {
                        configString = configString.replace(/\${fileBasename}/g, getFileBasename());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${fileBasenameNoExtension}')) {
                        configString = configString.replace(/\${fileBasenameNoExtension}/g, getFileBasenameNoExtension());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${fileDirname}')) {
                        configString = configString.replace(/\${fileDirname}/g, getFileDirname());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${fileExtname}')) {
                        configString = configString.replace(/\${fileExtname}/g, getFileExtname());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${cwd}')) {
                        configString = configString.replace(/\${cwd}/g, process.cwd());
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${lineNumber}')) {
                        lineNumber = getLineNumber();
                        if (lineNumber && parseInt(lineNumber)) {
                            configString = configString.replace(/\${lineNumber}/g, getLineNumber());
                        }
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${selectedText}')) {
                        selectedText = getSelection().join();
                        if (selectedText) {
                            configString = configString.replace(/\${selectedText}/g, selectedText);
                        }
                    }
                    if (configString === null || configString === void 0 ? void 0 : configString.includes('${execPath}')) {
                        configString = configString.replace(/\${execPath}/g, process.execPath);
                    }
                    if (configString && /\${env:\w+}/.test(configString)) {
                        configString = configString.replace(/(\${env:(\w+)})/g, process.env['$2']);
                    }
                    if (configString && /\${config:[\w.]+}/.test(configString)) {
                        configString = configString.replace(/(\${config:(\w+)})/g, process.env['$2']);
                    }
                    if (!(configString && /\${command:[\w.]+}/.test(configString))) return [3 /*break*/, 2];
                    _b = (_a = configString).replace;
                    _c = [/(\${command:(\w+)})/g];
                    return [4 /*yield*/, vscode.commands.getCommands()];
                case 1:
                    configString = _b.apply(_a, _c.concat([(_d.sent())['$2']]));
                    _d.label = 2;
                case 2: return [2 /*return*/, JSON.parse(configString)];
            }
        });
    });
}
function getFile() {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No open editors');
        return;
    }
    return editor.document.uri.fsPath;
}
function getRelativeFile() {
    var workspaceFolder = getWorkspaceFolder();
    return path.relative(workspaceFolder, getFile());
}
function getRelativeFileDirname() {
    return path.dirname(getRelativeFile());
}
function getFileBasename() {
    return path.basename(getFile());
}
function getFileBasenameNoExtension() {
    return path.basename(getFile(), getFileExtname());
}
function getFileDirname() {
    return path.dirname(getFile());
}
function getFileExtname() {
    return path.extname(getFile());
}
function getLineNumber() {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No open editors');
        return;
    }
    return String(editor.selection.active.line);
}
function getSelection() {
    return vscode.window.activeTextEditor.selections.map(function (selection) {
        return vscode.window.activeTextEditor.document.getText(new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character));
    });
}
function getWorkspaceFolder() {
    var _a, _b;
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No open editors');
        return;
    }
    var uri = vscode.workspace.getWorkspaceFolder((_a = editor === null || editor === void 0 ? void 0 : editor.document) === null || _a === void 0 ? void 0 : _a.uri).uri;
    if (!((_b = uri.fsPath) === null || _b === void 0 ? void 0 : _b.length)) {
        vscode.window.showWarningMessage('No open workspaces');
        return;
    }
    return uri.fsPath;
}

exports.getConfig = getConfig;
