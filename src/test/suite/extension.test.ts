import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	suiteSetup(async () => {
		// Ensure the extension is activated
		// The extension ID should match the publisher.name from package.json
		const ext = vscode.extensions.getExtension('undefined.selection-path-copier');
		if (!ext) {
			// In test environment, manually activate the extension
			await myExtension.activate({ subscriptions: [] } as any);
		} else if (!ext.isActive) {
			await ext.activate();
		}
	});

	suite('formatLineNumber', () => {
		test('GitHub format - single line', () => {
			assert.strictEqual(myExtension.formatLineNumber(10, undefined, 'github'), '#L10');
		});

		test('GitHub format - range', () => {
			assert.strictEqual(myExtension.formatLineNumber(10, 20, 'github'), '#L10-20');
		});

		test('Editor format - single line', () => {
			assert.strictEqual(myExtension.formatLineNumber(10, undefined, 'editor'), ':10');
		});

		test('Editor format - range', () => {
			assert.strictEqual(myExtension.formatLineNumber(10, 20, 'editor'), ':10-20');
		});

		test('Parentheses format - single line', () => {
			assert.strictEqual(myExtension.formatLineNumber(10, undefined, 'parentheses'), '(10)');
		});

		test('Parentheses format - range', () => {
			assert.strictEqual(myExtension.formatLineNumber(10, 20, 'parentheses'), '(10-20)');
		});

		test('Default format (unknown format)', () => {
			assert.strictEqual(myExtension.formatLineNumber(10, undefined, 'unknown'), '#L10');
			assert.strictEqual(myExtension.formatLineNumber(10, 20, 'unknown'), '#L10-20');
		});
	});

	suite('Commands', () => {
		test('Copy Path command should be registered', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(commands.includes('selection-path-copier.copyPath'));
		});

		test('Copy Path with Code command should be registered', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(commands.includes('selection-path-copier.copyPathWithCode'));
		});
	});

	suite('Configuration', () => {
		test('pathType configuration should have correct default', () => {
			const config = vscode.workspace.getConfiguration('selection-path-copier');
			const pathType = config.get<string>('pathType');
			assert.strictEqual(pathType, 'relative');
		});

		test('includeBlankLine configuration should have correct default', () => {
			const config = vscode.workspace.getConfiguration('selection-path-copier');
			const includeBlankLine = config.get<boolean>('includeBlankLine');
			assert.strictEqual(includeBlankLine, true);
		});

		test('lineNumberFormat configuration should have correct default', () => {
			const config = vscode.workspace.getConfiguration('selection-path-copier');
			const lineNumberFormat = config.get<string>('lineNumberFormat');
			assert.strictEqual(lineNumberFormat, 'github');
		});

		test('codeFormat configuration should have correct default', () => {
			const config = vscode.workspace.getConfiguration('selection-path-copier');
			const codeFormat = config.get<string>('codeFormat');
			assert.strictEqual(codeFormat, 'plain');
		});
	});

	suite('Integration Tests', () => {
		test('Copy path with no selection should copy current line', async () => {
			// Create a new text document
			const document = await vscode.workspace.openTextDocument({
				content: 'Line 1\nLine 2\nLine 3',
				language: 'typescript'
			});

			const editor = await vscode.window.showTextDocument(document);

			// Position cursor on line 2
			const position = new vscode.Position(1, 0);
			editor.selection = new vscode.Selection(position, position);

			// Execute the command
			await vscode.commands.executeCommand('selection-path-copier.copyPath');

			// Get clipboard content
			const clipboardContent = await vscode.env.clipboard.readText();

			// Check that clipboard contains line reference
			assert.ok(clipboardContent.includes('#L2') ||
					  clipboardContent.includes(':2') ||
					  clipboardContent.includes('(2)'));
		});

		test('Copy path with selection should copy range', async () => {
			// Create a new text document
			const document = await vscode.workspace.openTextDocument({
				content: 'Line 1\nLine 2\nLine 3\nLine 4',
				language: 'typescript'
			});

			const editor = await vscode.window.showTextDocument(document);

			// Select lines 2-3
			const start = new vscode.Position(1, 0);
			const end = new vscode.Position(2, 6);
			editor.selection = new vscode.Selection(start, end);

			// Execute the command
			await vscode.commands.executeCommand('selection-path-copier.copyPath');

			// Get clipboard content
			const clipboardContent = await vscode.env.clipboard.readText();

			// Check that clipboard contains range reference
			assert.ok(clipboardContent.includes('#L2-3') ||
					  clipboardContent.includes(':2-3') ||
					  clipboardContent.includes('(2-3)'));
		});

		test('Copy path with code should include code content', async () => {
			// Create a new text document
			const document = await vscode.workspace.openTextDocument({
				content: 'const hello = "world";',
				language: 'typescript'
			});

			const editor = await vscode.window.showTextDocument(document);

			// Select all text
			const start = new vscode.Position(0, 0);
			const end = new vscode.Position(0, 22);
			editor.selection = new vscode.Selection(start, end);

			// Execute the command
			await vscode.commands.executeCommand('selection-path-copier.copyPathWithCode');

			// Get clipboard content
			const clipboardContent = await vscode.env.clipboard.readText();

			// Check that clipboard contains both path and code
			assert.ok(clipboardContent.includes('const hello = "world";'));
			assert.ok(clipboardContent.includes('#L1') ||
					  clipboardContent.includes(':1') ||
					  clipboardContent.includes('(1)'));
		});

		test('Copy path with code in markdown format should include code block', async () => {
			// Update config to use markdown format
			await vscode.workspace.getConfiguration('selection-path-copier')
				.update('codeFormat', 'markdown', vscode.ConfigurationTarget.Global);

			// Create a new text document
			const document = await vscode.workspace.openTextDocument({
				content: 'const test = 123;',
				language: 'typescript'
			});

			const editor = await vscode.window.showTextDocument(document);

			// Select all text
			const start = new vscode.Position(0, 0);
			const end = new vscode.Position(0, 17);
			editor.selection = new vscode.Selection(start, end);

			// Execute the command
			await vscode.commands.executeCommand('selection-path-copier.copyPathWithCode');

			// Get clipboard content
			const clipboardContent = await vscode.env.clipboard.readText();

			// Check that clipboard contains markdown code block
			assert.ok(clipboardContent.includes('```typescript'));
			assert.ok(clipboardContent.includes('const test = 123;'));
			assert.ok(clipboardContent.includes('```'));

			// Reset config
			await vscode.workspace.getConfiguration('selection-path-copier')
				.update('codeFormat', 'plain', vscode.ConfigurationTarget.Global);
		});
	});
});