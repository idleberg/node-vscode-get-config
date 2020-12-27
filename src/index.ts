import 'core-js/modules/es.string.replace-all';

import vscode from 'vscode';

import {
  basename,
  dirname,
  extname,
  join,
  relative,
  sep
} from 'path';

import dotProp from 'dot-prop';

async function getConfig(...configNotations: string[]): Promise<unknown> {
  switch (true) {
    case configNotations.length === 0:
      return vscode.workspace.getConfiguration();

    case configNotations.length === 1:
      return getSingleConfig(configNotations[0]);

    default:
      return Promise.all(configNotations.map(async configNotation => getSingleConfig(configNotation)));
  }
}

async function getSingleConfig(configNotation?: string): Promise<unknown> {
  const config = configNotation?.length
    ? dotProp.get(vscode.workspace.getConfiguration(), configNotation)
    : vscode.workspace.getConfiguration();

  return config && Object.keys(config).length
    ? await substituteVariables(config)
    : config;
}

async function substituteVariables(config): Promise<unknown> {
  let configString = JSON.stringify(config);

  if (configString?.includes('${workspaceFolder}')) {
    configString = configString.replace(/\${workspaceFolder}/g, getWorkspaceFolder());
  }

  if (configString?.includes('${workspaceFolderBasename}')) {
    configString = configString.replace(/\${workspaceFolderBasename}/g, basename(getWorkspaceFolder()));
  }

  if (configString?.includes('${file}')) {
    configString = configString.replace(/\${file}/g, getFile());
  }

  if (configString?.includes('${relativeFile}')) {
    configString = configString.replace(/\${relativeFile}/g, getRelativeFile());
  }

  if (configString?.includes('${relativeFileDirname}')) {
    configString = configString.replace(/\${relativeFileDirname}/g, getRelativeFileDirname());
  }

  if (configString?.includes('${fileBasename}')) {
    configString = configString.replace(/\${fileBasename}/g, getFileBasename());
  }

  if (configString?.includes('${fileBasenameNoExtension}')) {
    configString = configString.replace(/\${fileBasenameNoExtension}/g, getFileBasenameNoExtension());
  }

  if (configString?.includes('${fileDirname}')) {
    configString = configString.replace(/\${fileDirname}/g, getFileDirname());
  }

  if (configString?.includes('${fileExtname}')) {
    configString = configString.replace(/\${fileExtname}/g, getFileExtname());
  }

  if (configString?.includes('${cwd}')) {
    configString = configString.replace(/\${cwd}/g, process.cwd());
  }

  if (configString?.includes('${lineNumber}')) {
    const lineNumber = getLineNumber();

    if (lineNumber && parseInt(lineNumber)) {
      configString = configString.replace(/\${lineNumber}/g, getLineNumber());
    }
  }

  if (configString?.includes('${selectedText}')) {
    const selectedText = getSelection().join();

    if (selectedText) {
      configString = configString.replace(/\${selectedText}/g, selectedText);
    }
  }

  if (configString?.includes('${execPath}')) {
    configString = configString.replace(/\${execPath}/g, process.execPath);
  }

  if (configString?.includes('${pathSeparator}')) {
    configString = configString.replace(/\${pathSeparator}/g, sep);
  }

  if (configString && /\${workspaceFolder:[^}]+}/.test(configString)) {
    const { workspaceFolders } = vscode.workspace;

    const regex = /\${workspaceFolder:(?<name>[^}]+)}/g;
    const matches = configString.match(regex);

    if (matches?.length) {
      matches.map(item => {

          const { groups } = item.match(/\${workspaceFolder:(?<name>[^}]+)\}/);
          if (groups.name) {
            const found = workspaceFolders.find(item => item.name === groups.name)

            if (found) {
              configString = configString.replaceAll(`\${workspaceFolder:${groups.name}}`, found.uri.fsPath);
            }
          }

        })
    }
  }

  if (configString && /\${env:[^}]+}/.test(configString)) {
    const { groups } = configString.match(/\${env:(?<name>[^}]+)\}/);

    if (groups?.name && process.env[groups.name]) {
      configString = configString.replace(/(\${env:[^}]+})/g, process.env[groups.name]);
    }
  }

  if (configString && /\${config:[^}]+}/.test(configString)) {
    const { groups } = configString.match(/\${config:(?<name>[^}]+)\}/);
    const configuration = vscode.workspace.getConfiguration();

    if (groups?.name && dotProp.get(configuration, groups.name)) {
      const pick = String(dotProp.get(configuration, groups.name));

      configString = configString.replace(/(\${config:[^}]+})/g, pick);
    }
  }

  return JSON.parse(configString);
}

function getFile(): string {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage('No open editors');
    return;
  }

  return editor.document.uri.fsPath;
}

function getRelativeFile(): string {
  const workspaceFolder = getWorkspaceFolder();

  return relative(workspaceFolder, getFile());
}

function getRelativeFileDirname(): string {
  return dirname(getRelativeFile());
}

function getFileBasename(): string {
  return basename(getFile());
}

function getFileBasenameNoExtension(): string {
  return basename(getFile(), getFileExtname());
}

function getFileDirname(): string {
  return dirname(getFile());
}

function getFileExtname(): string {
  return extname(getFile());
}

function getLineNumber(): string {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage('No open editors');
    return;
  }

  return String(editor.selection.active.line);
}

function getSelection(): string[] {
  return vscode.window.activeTextEditor.selections.map((selection) => {
    return vscode.window.activeTextEditor.document.getText(new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character));
  });
}

function getWorkspaceFolder(appendPath = ''): null | string {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage('No open editors');
    return;
  }

  const { uri } = vscode.workspace.getWorkspaceFolder(editor?.document?.uri);

  if (!uri.fsPath?.length) {
    vscode.window.showWarningMessage('No open workspaces');
    return;
  }

  return appendPath?.length
    ? join(uri.fsPath, appendPath)
    : uri.fsPath;
}

export {
  getConfig
};
