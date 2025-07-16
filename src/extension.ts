import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	console.log('Selection Path Copier is now active!');

	const copyPathCommand = vscode.commands.registerCommand('selection-path-copier.copyPath', async () => {
		await copySelectionPath(false);
	});

	const copyPathWithCodeCommand = vscode.commands.registerCommand('selection-path-copier.copyPathWithCode', async () => {
		await copySelectionPath(true);
	});

	context.subscriptions.push(copyPathCommand, copyPathWithCodeCommand);
}

async function copySelectionPath(includeCode: boolean) {
	const editor = vscode.window.activeTextEditor;
	
	if (!editor) {
		vscode.window.showErrorMessage('No active editor found');
		return;
	}

	const selection = editor.selection;
	if (selection.isEmpty) {
		vscode.window.showErrorMessage('No text selected');
		return;
	}

	const document = editor.document;
	const filePath = document.fileName;
	
	const config = vscode.workspace.getConfiguration('selection-path-copier');
	const pathType = config.get<string>('pathType', 'relative');
	
	let displayPath: string;
	
	if (pathType === 'relative') {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found. Using absolute path instead.');
			displayPath = filePath;
		} else {
			displayPath = path.relative(workspaceFolder.uri.fsPath, filePath);
		}
	} else {
		displayPath = filePath;
	}

	const startLine = selection.start.line + 1;
	const endLine = selection.end.line + 1;
	
	let lineReference: string;
	if (startLine === endLine) {
		lineReference = `#L${startLine}`;
	} else {
		lineReference = `#L${startLine}-${endLine}`;
	}

	let clipboardContent = `${displayPath}${lineReference}`;
	
	if (includeCode) {
		const selectedText = document.getText(selection);
		clipboardContent = `${clipboardContent}\n${selectedText}`;
	}

	await vscode.env.clipboard.writeText(clipboardContent);
	
	const message = includeCode 
		? 'Path with code copied to clipboard!' 
		: 'Path copied to clipboard!';
	vscode.window.showInformationMessage(message);
}

export function deactivate() {}