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

	const document = editor.document;
	const selection = editor.selection;
	const filePath = document.fileName;
	
	const config = vscode.workspace.getConfiguration('selection-path-copier');
	const pathType = config.get<string>('pathType', 'relative');
	const includeBlankLine = config.get<boolean>('includeBlankLine', true);
	
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

	let lineReference = '';
	let codeContent = '';

	if (selection.isEmpty) {
		const cursorPosition = editor.selection.active;
		const lineNumber = cursorPosition.line + 1;
		const lineText = document.lineAt(cursorPosition.line).text;
		
		if (lineText.trim() !== '') {
			lineReference = `#L${lineNumber}`;
			if (includeCode) {
				codeContent = lineText;
			}
		}
	} else {
		const startLine = selection.start.line + 1;
		const endLine = selection.end.line + 1;
		
		if (startLine === endLine) {
			lineReference = `#L${startLine}`;
		} else {
			lineReference = `#L${startLine}-${endLine}`;
		}
		
		if (includeCode) {
			codeContent = document.getText(selection);
		}
	}

	let clipboardContent = `${displayPath}${lineReference}`;

	if (includeCode && codeContent) {
		const lineSeparator = includeBlankLine ? '\n\n' : '\n';
		clipboardContent = `${clipboardContent}${lineSeparator}${codeContent}`;
	}

	await vscode.env.clipboard.writeText(clipboardContent);
	
	const message = includeCode 
		? 'Path with code copied to clipboard!' 
		: 'Path copied to clipboard!';
	vscode.window.showInformationMessage(message);
}

export function deactivate() {}