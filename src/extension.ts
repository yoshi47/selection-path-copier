import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getGitTopLevel, getGitRemoteUrl, getGitCommitHash, getDefaultBranchName, parseGithubUrl } from './gitHelper.js';

// Re-export for backward compatibility with existing tests
export { getDefaultBranchName, parseGithubUrl } from './gitHelper.js';

export function activate(context: vscode.ExtensionContext) {
	console.log('Selection Path Copier is now active!');

	const copyPathCommand = vscode.commands.registerCommand('selection-path-copier.copyPath', async () => {
		await copySelectionPath(false);
	});

	const copyPathWithCodeCommand = vscode.commands.registerCommand('selection-path-copier.copyPathWithCode', async () => {
		await copySelectionPath(true);
	});

	const copyGithubPermalinkCommand = vscode.commands.registerCommand('selection-path-copier.copyGithubPermalink', async () => {
		await copyGithubPermalink(false);
	});

	const copyGithubPermalinkWithCodeCommand = vscode.commands.registerCommand('selection-path-copier.copyGithubPermalinkWithCode', async () => {
		await copyGithubPermalink(true);
	});

	context.subscriptions.push(copyPathCommand, copyPathWithCodeCommand, copyGithubPermalinkCommand, copyGithubPermalinkWithCodeCommand);
}

export function formatLineNumber(startLine: number, endLine: number | undefined, format: string): string {
	switch (format) {
		case 'editor':
			// Editor format: file.ts:10 or file.ts:10-20
			if (endLine === undefined) {
				return `:${startLine}`;
			} else {
				return `:${startLine}-${endLine}`;
			}
		case 'parentheses':
			// Parentheses format: file.ts(10) or file.ts(10-20)
			if (endLine === undefined) {
				return `(${startLine})`;
			} else {
				return `(${startLine}-${endLine})`;
			}
		case 'github':
		default:
			// GitHub format: file.ts#L10 or file.ts#L10-20
			if (endLine === undefined) {
				return `#L${startLine}`;
			} else {
				return `#L${startLine}-${endLine}`;
			}
	}
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
	const lineNumberFormat = config.get<string>('lineNumberFormat', 'github');
	const codeFormat = config.get<string>('codeFormat', 'plain');
	
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
			lineReference = formatLineNumber(lineNumber, undefined, lineNumberFormat);
			if (includeCode) {
				codeContent = lineText;
			}
		}
	} else {
		const startLine = selection.start.line + 1;
		const endLine = selection.end.line + 1;

		if (startLine === endLine) {
			lineReference = formatLineNumber(startLine, undefined, lineNumberFormat);
		} else {
			lineReference = formatLineNumber(startLine, endLine, lineNumberFormat);
		}

		if (includeCode) {
			codeContent = document.getText(selection);
		}
	}

	let clipboardContent = `${displayPath}${lineReference}`;

	if (includeCode && codeContent) {
		const lineSeparator = includeBlankLine ? '\n\n' : '\n';

		if (codeFormat === 'markdown') {
			// Get language ID from document
			const languageId = document.languageId;
			// Remove trailing newline from code content if present
			const trimmedCode = codeContent.endsWith('\n') ? codeContent.slice(0, -1) : codeContent;
			clipboardContent = `${clipboardContent}${lineSeparator}\`\`\`${languageId}\n${trimmedCode}\n\`\`\``;
		} else {
			clipboardContent = `${clipboardContent}${lineSeparator}${codeContent}`;
		}
	}

	await vscode.env.clipboard.writeText(clipboardContent);
	
	const message = includeCode 
		? 'Path with code copied to clipboard!' 
		: 'Path copied to clipboard!';
	vscode.window.showInformationMessage(message);
}

async function copyGithubPermalink(includeCode: boolean) {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showErrorMessage('No active editor found');
		return;
	}

	const document = editor.document;
	const selection = editor.selection;
	const filePath = document.fileName;

	const gitTopLevel = await getGitTopLevel(filePath);
	if (!gitTopLevel) {
		vscode.window.showErrorMessage('File is not inside a git repository');
		return;
	}

	const remoteUrl = await getGitRemoteUrl(gitTopLevel);
	if (!remoteUrl) {
		vscode.window.showErrorMessage('Not a git repository or no remote origin found');
		return;
	}

	const githubInfo = parseGithubUrl(remoteUrl);
	if (!githubInfo) {
		vscode.window.showErrorMessage('Could not parse GitHub URL from remote origin');
		return;
	}

	const config = vscode.workspace.getConfiguration('selection-path-copier');
	const includeBlankLine = config.get<boolean>('includeBlankLine', true);
	const codeFormat = config.get<string>('codeFormat', 'plain');
	const permalinkType = config.get<string>('githubPermalinkType', 'commit');

	let ref: string;
	if (permalinkType === 'branch') {
		const branchName = await getDefaultBranchName(gitTopLevel);
		if (!branchName) {
			vscode.window.showErrorMessage('Could not determine default branch name');
			return;
		}
		ref = branchName;
	} else {
		const commitHash = await getGitCommitHash(gitTopLevel);
		if (!commitHash) {
			vscode.window.showErrorMessage('Could not get current git commit hash');
			return;
		}
		ref = commitHash;
	}

	// Resolve symlinks (e.g. macOS /tmp → /private/tmp) so path.relative works correctly
	const resolvedFilePath = fs.realpathSync(filePath);
	const relativePath = path.relative(gitTopLevel, resolvedFilePath).replace(/\\/g, '/');

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
			lineReference = `#L${startLine}-L${endLine}`;
		}

		if (includeCode) {
			codeContent = document.getText(selection);
		}
	}

	const permalinkUrl = `https://github.com/${githubInfo.owner}/${githubInfo.repo}/blob/${ref}/${relativePath}${lineReference}`;

	let clipboardContent = permalinkUrl;

	if (includeCode && codeContent) {
		const lineSeparator = includeBlankLine ? '\n\n' : '\n';

		if (codeFormat === 'markdown') {
			const languageId = document.languageId;
			// Remove trailing newline from code content if present
			const trimmedCode = codeContent.endsWith('\n') ? codeContent.slice(0, -1) : codeContent;
			clipboardContent = `${permalinkUrl}${lineSeparator}\`\`\`${languageId}\n${trimmedCode}\n\`\`\``;
		} else {
			clipboardContent = `${permalinkUrl}${lineSeparator}${codeContent}`;
		}
	}

	await vscode.env.clipboard.writeText(clipboardContent);

	const message = includeCode
		? 'GitHub permalink with code copied to clipboard!'
		: 'GitHub permalink copied to clipboard!';
	vscode.window.showInformationMessage(message);
}

export function deactivate() {}