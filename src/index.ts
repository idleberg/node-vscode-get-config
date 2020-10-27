import {
  commands,
  Range,
  window,
  workspace
} from 'vscode';

import {
  basename,
  dirname,
  extname,
  relative
} from 'path';

import dotProp from 'dot-prop';

async function getConfig(...configNotations: string[]): Promise<unknown> {
  switch (true) {
    case configNotations.length === 0:
      return workspace.getConfiguration();

    case configNotations.length === 1:
      return getSingleConfig(configNotations[0]);

    default:
      return Promise.all(configNotations.map(async configNotation => getSingleConfig(configNotation)));
  }
}

async function getSingleConfig(configNotation?: string): Promise<unknown> {
  const config = configNotation?.length
    ? dotProp.get(workspace.getConfiguration(), configNotation)
    : workspace.getConfiguration();

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

  if (configString && /\${env:\w+}/.test(configString)) {
    configString = configString.replace(/(\${env:(\w+)})/g, process.env['$2']);
  }

  if (configString && /\${config:[\w.]+}/.test(configString)) {
    configString = configString.replace(/(\${config:(\w+)})/g, process.env['$2']);
  }

  if (configString && /\${command:[\w.]+}/.test(configString)) {
    configString = configString.replace(/(\${command:(\w+)})/g, (await commands.getCommands())['$2']);
  }

  return JSON.parse(configString);
}

function getFile(): string {
  const editor = window.activeTextEditor;

  if (!editor) {
    window.showWarningMessage('No open editors');
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
  const editor = window.activeTextEditor;

  if (!editor) {
    window.showWarningMessage('No open editors');
    return;
  }

  return String(editor.selection.active.line);
}

function getSelection(): string[] {
  return window.activeTextEditor.selections.map((selection) => {
    return window.activeTextEditor.document.getText(new Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character));
  });
}

function getWorkspaceFolder(): null | string {
  const editor = window.activeTextEditor;

  if (!editor) {
    window.showWarningMessage('No open editors');
    return;
  }

  const { uri } = workspace.getWorkspaceFolder(editor?.document?.uri);

  if (!uri.fsPath?.length) {
    window.showWarningMessage('No open workspaces');
    return;
  }

  return uri.fsPath;
}

export {
  getConfig
};
