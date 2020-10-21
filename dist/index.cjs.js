'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vscode = require('vscode');
require('path');

function getConfig(extensionName) {
    var config = vscode.workspace.getConfiguration('extensionName');
}

exports.getConfig = getConfig;
