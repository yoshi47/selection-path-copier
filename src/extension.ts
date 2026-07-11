import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getGitTopLevel, getGitRemoteUrl, getGitCommitHash, getDefaultBranchName, parseGithubUrl } from './gitHelper.js';

// Re-export for backward compatibility with existing tests
export { getDefaultBranchName, parseGithubUrl } from './gitHelper.js';

export type PathType = 'relative' | 'absolute';
export type LineNumberFormat = 'github' | 'editor' | 'parentheses';
export type CodeFormat = 'plain' | 'markdown';
export type StatusBarDisplayMode = 'full' | 'compact' | 'iconOnly';
export type StatusBarClickAction = 'copyPath' | 'copyPathWithCode' | 'copyGithubPermalink' | 'copyGithubPermalinkWithCode';
export type GithubPermalinkType = 'commit' | 'branch';

export const PATH_TYPES: readonly PathType[] = ['relative', 'absolute'];
export const LINE_NUMBER_FORMATS: readonly LineNumberFormat[] = ['github', 'editor', 'parentheses'];
export const CODE_FORMATS: readonly CodeFormat[] = ['plain', 'markdown'];
export const STATUS_BAR_DISPLAY_MODES: readonly StatusBarDisplayMode[] = ['full', 'compact', 'iconOnly'];
export const STATUS_BAR_CLICK_ACTIONS: readonly StatusBarClickAction[] = ['copyPath', 'copyPathWithCode', 'copyGithubPermalink', 'copyGithubPermalinkWithCode'];
export const GITHUB_PERMALINK_TYPES: readonly GithubPermalinkType[] = ['commit', 'branch'];

const cachedConfig: {
	showStatusBarItem: boolean;
	includeBlankLine: boolean;
	pathType: PathType;
	lineNumberFormat: LineNumberFormat;
	codeFormat: CodeFormat;
	statusBarDisplayMode: StatusBarDisplayMode;
	statusBarClickAction: StatusBarClickAction;
	githubPermalinkType: GithubPermalinkType;
} = {
	showStatusBarItem: true,
	includeBlankLine: true,
	pathType: 'relative',
	lineNumberFormat: 'github',
	codeFormat: 'plain',
	statusBarDisplayMode: 'full',
	statusBarClickAction: 'copyPath',
	githubPermalinkType: 'commit',
};

// The enum in package.json only constrains the settings UI; hand-edited
// settings.json, Settings Sync from other versions, or programmatic updates
// can still deliver arbitrary values at runtime.
export function normalizeEnumSetting<T extends string>(value: unknown, allowed: readonly T[], defaultValue: T): { value: T; isValid: boolean } {
	if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
		return { value: value as T, isValid: true };
	}
	return { value: defaultValue, isValid: false };
}

// Remembers the last invalid raw value warned about per key, so the toast
// re-fires only when the invalid value first appears or changes — not on
// every unrelated selection-path-copier.* config change.
const lastWarnedInvalidValues = new Map<string, string>();

function getValidatedConfig<T extends string>(config: vscode.WorkspaceConfiguration, key: string, allowed: readonly T[], defaultValue: T): T {
	const raw = config.get(key);
	const { value, isValid } = normalizeEnumSetting(raw, allowed, defaultValue);
	if (!isValid) {
		const rawJson = JSON.stringify(raw);
		if (lastWarnedInvalidValues.get(key) !== rawJson) {
			lastWarnedInvalidValues.set(key, rawJson);
			const message = `Invalid value for selection-path-copier.${key}: ${rawJson}. Falling back to "${defaultValue}".`;
			console.warn(message);
			vscode.window.showWarningMessage(message);
		}
	} else {
		lastWarnedInvalidValues.delete(key);
	}
	return value;
}

function refreshCachedConfig(): void {
	const config = vscode.workspace.getConfiguration('selection-path-copier');
	cachedConfig.showStatusBarItem = config.get<boolean>('showStatusBarItem', true);
	cachedConfig.includeBlankLine = config.get<boolean>('includeBlankLine', true);
	cachedConfig.pathType = getValidatedConfig(config, 'pathType', PATH_TYPES, 'relative');
	cachedConfig.lineNumberFormat = getValidatedConfig(config, 'lineNumberFormat', LINE_NUMBER_FORMATS, 'github');
	cachedConfig.codeFormat = getValidatedConfig(config, 'codeFormat', CODE_FORMATS, 'plain');
	cachedConfig.statusBarDisplayMode = getValidatedConfig(config, 'statusBarDisplayMode', STATUS_BAR_DISPLAY_MODES, 'full');
	cachedConfig.statusBarClickAction = getValidatedConfig(config, 'statusBarClickAction', STATUS_BAR_CLICK_ACTIONS, 'copyPath');
	cachedConfig.githubPermalinkType = getValidatedConfig(config, 'githubPermalinkType', GITHUB_PERMALINK_TYPES, 'commit');
}

export function getDisplayPath(document: vscode.TextDocument, pathType: string): string {
	if (pathType === 'relative') {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
		if (workspaceFolder) {
			return path.relative(workspaceFolder.uri.fsPath, document.fileName);
		}
	}
	return document.fileName;
}

export function buildStatusBarText(fileName: string, lineReference: string, displayMode: string): string {
	switch (displayMode) {
		case 'iconOnly':
			return '$(copy)';
		case 'compact':
			return lineReference ? `$(copy) ${lineReference}` : '$(copy)';
		case 'full':
		// Unreachable when called with cachedConfig values (validated in
		// refreshCachedConfig); kept for direct callers passing raw strings
		default:
			return `$(copy) ${fileName}${lineReference}`;
	}
}

export function getStatusBarClickCommand(clickAction: string): string {
	switch (clickAction) {
		case 'copyPathWithCode':
			return 'selection-path-copier.copyPathWithCode';
		case 'copyGithubPermalink':
			return 'selection-path-copier.copyGithubPermalink';
		case 'copyGithubPermalinkWithCode':
			return 'selection-path-copier.copyGithubPermalinkWithCode';
		case 'copyPath':
		// Unreachable when called with cachedConfig values (validated in
		// refreshCachedConfig); kept for direct callers passing raw strings
		default:
			return 'selection-path-copier.copyPath';
	}
}

const CLICK_ACTION_TOOLTIP_LABELS: Record<StatusBarClickAction, string> = {
	copyPath: 'copy path',
	copyPathWithCode: 'copy path with code',
	copyGithubPermalink: 'copy GitHub permalink',
	copyGithubPermalinkWithCode: 'copy GitHub permalink with code',
};

function updateStatusBarItem(statusBarItem: vscode.StatusBarItem, editor: vscode.TextEditor | undefined): void {
	if (!editor || !cachedConfig.showStatusBarItem) {
		statusBarItem.hide();
		return;
	}

	const { pathType, lineNumberFormat } = cachedConfig;

	const displayPath = getDisplayPath(editor.document, pathType);
	const fileName = path.basename(editor.document.fileName);
	const selection = editor.selection;

	let lineReference: string;
	if (selection.isEmpty) {
		const lineNumber = selection.active.line + 1;
		lineReference = formatLineNumber(lineNumber, undefined, lineNumberFormat);
	} else {
		const startLine = selection.start.line + 1;
		const endLine = selection.end.line + 1;
		lineReference = startLine === endLine
			? formatLineNumber(startLine, undefined, lineNumberFormat)
			: formatLineNumber(startLine, endLine, lineNumberFormat);
	}

	statusBarItem.text = buildStatusBarText(fileName, lineReference, cachedConfig.statusBarDisplayMode);
	statusBarItem.command = getStatusBarClickCommand(cachedConfig.statusBarClickAction);
	statusBarItem.tooltip = `${displayPath}${lineReference} — Click to ${CLICK_ACTION_TOOLTIP_LABELS[cachedConfig.statusBarClickAction]}`;
	statusBarItem.show();
}

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

	// Status bar item: command/tooltip/text are owned by updateStatusBarItem,
	// which always runs before the item is shown
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	refreshCachedConfig();

	context.subscriptions.push(
		copyPathCommand,
		copyPathWithCodeCommand,
		copyGithubPermalinkCommand,
		copyGithubPermalinkWithCodeCommand,
		statusBarItem,
		vscode.window.onDidChangeActiveTextEditor(editor => updateStatusBarItem(statusBarItem, editor)),
		vscode.window.onDidChangeTextEditorSelection(event => updateStatusBarItem(statusBarItem, event.textEditor)),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('selection-path-copier')) {
				refreshCachedConfig();
				updateStatusBarItem(statusBarItem, vscode.window.activeTextEditor);
			}
		}),
	);

	updateStatusBarItem(statusBarItem, vscode.window.activeTextEditor);
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

export function buildGithubPermalinkUrl(
	githubInfo: { owner: string; repo: string },
	ref: string,
	relativePath: string,
	lineReference: string
): string {
	const needsPlainView = path.extname(relativePath).toLowerCase() === '.md';
	const pathWithQuery = needsPlainView ? `${relativePath}?plain=1` : relativePath;

	return `https://github.com/${githubInfo.owner}/${githubInfo.repo}/blob/${ref}/${pathWithQuery}${lineReference}`;
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
	
	const { pathType, includeBlankLine, lineNumberFormat, codeFormat } = cachedConfig;

	const displayPath = getDisplayPath(document, pathType);
	if (pathType === 'relative' && displayPath === document.fileName) {
		vscode.window.showErrorMessage('No workspace folder found. Using absolute path instead.');
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

	const { includeBlankLine, codeFormat, githubPermalinkType: permalinkType } = cachedConfig;

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

	const permalinkUrl = buildGithubPermalinkUrl(githubInfo, ref, relativePath, lineReference);

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
