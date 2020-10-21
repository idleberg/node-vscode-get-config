import { workspace } from 'vscode';
import 'path';

function getConfig(extensionName) {
    var config = workspace.getConfiguration('extensionName');
}

export { getConfig };
