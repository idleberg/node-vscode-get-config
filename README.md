# vscode-get-config

[![npm](https://flat.badgen.net/npm/license/vscode-get-config)](https://www.npmjs.org/package/vscode-get-config)
[![npm](https://flat.badgen.net/npm/v/vscode-get-config)](https://www.npmjs.org/package/vscode-get-config)
[![CircleCI](https://flat.badgen.net/circleci/github/idleberg/node-vscode-get-config)](https://circleci.com/gh/idleberg/node-vscode-get-config)
[![David](https://flat.badgen.net/david/dep/idleberg/node-vscode-get-config)](https://david-dm.org/idleberg/node-vscode-get-config)

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
const fontConfig = await getConfig('editor.fontFamily', 'editor.fontSize');
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

This work is licensed under [The MIT License](https://opensource.org/licenses/MIT)
