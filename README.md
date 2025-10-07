# vscode-get-config

[![License](https://img.shields.io/github/license/idleberg/vscode-get-config?color=blue&style=for-the-badge)](https://github.com/idleberg/vscode-get-config/blob/main/LICENSE)
[![Version: npm](https://img.shields.io/npm/v/vscode-get-config?style=for-the-badge)](https://www.npmjs.org/package/vscode-get-config)
![GitHub branch check runs](https://img.shields.io/github/check-runs/idleberg/vscode-get-config/main?style=for-the-badge)

A simple wrapper for `vscode.workspace.getConfiguration()` provided by the Visual Studio Code API

Features:

- supports dot notation
- supports variable substitution

**Note:** By default, variable substitution is supported only by a handful of settings ([see details](https://code.visualstudio.com/docs/editor/variables-reference#_is-variable-substitution-supported-in-user-and-workspace-settings))

## Installation

`npm install vscode-get-config -S`

## Usage

```ts
getConfig(section?: string)
```

**Example:**

```js
import { getConfig } from 'vscode-get-config';

const { fontFamily, fontSize } = await getConfig('editor');
```

### Variable Substitution

Most of Visual Studio Code's [ variables](https://code.visualstudio.com/docs/editor/variables-reference) will be substituted used in a configuration value

- all predefined variables
    - `${workspaceFolder}`
    - `${workspaceFolderBasename}`
    - `${file}`
    - `${relativeFile}`
    - `${relativeFileDirname}`
    - `${fileBasename}`
    - `${fileBasenameNoExtension}`
    - `${fileDirname}`
    - `${fileExtname}`
    - `${cwd}`
    - `${lineNumber}`
    - `${selectedText}`
    - `${execPath}`
    - `${pathSeparator}`
    - <strike>`${defaultBuildTask}`</strike>

- environment variables, e.g. `${env:USERNAME}`
- configuration variables, e.g. `${config:editor.fontSize}` 

## License

This work is licensed under [The MIT License](LICENSE).
