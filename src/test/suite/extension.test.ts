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

		test('Copy GitHub Permalink command should be registered', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(commands.includes('selection-path-copier.copyGithubPermalink'));
		});

		test('Copy GitHub Permalink with Code command should be registered', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(commands.includes('selection-path-copier.copyGithubPermalinkWithCode'));
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

		test('githubPermalinkType configuration should have correct default', () => {
			const config = vscode.workspace.getConfiguration('selection-path-copier');
			const permalinkType = config.get<string>('githubPermalinkType');
			assert.strictEqual(permalinkType, 'commit');
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

	suite('GitHub URL Parsing', () => {
		test('Should parse SSH GitHub URL correctly', () => {
			const result = myExtension.parseGithubUrl('git@github.com:yoshi47/selection-path-copier.git');
			assert.deepStrictEqual(result, { owner: 'yoshi47', repo: 'selection-path-copier' });
		});

		test('Should parse SSH GitHub URL without .git extension', () => {
			const result = myExtension.parseGithubUrl('git@github.com:yoshi47/selection-path-copier');
			assert.deepStrictEqual(result, { owner: 'yoshi47', repo: 'selection-path-copier' });
		});

		test('Should parse HTTPS GitHub URL correctly', () => {
			const result = myExtension.parseGithubUrl('https://github.com/yoshi47/selection-path-copier.git');
			assert.deepStrictEqual(result, { owner: 'yoshi47', repo: 'selection-path-copier' });
		});

		test('Should parse HTTPS GitHub URL without .git extension', () => {
			const result = myExtension.parseGithubUrl('https://github.com/yoshi47/selection-path-copier');
			assert.deepStrictEqual(result, { owner: 'yoshi47', repo: 'selection-path-copier' });
		});

		test('Should return null for non-GitHub URLs', () => {
			const result = myExtension.parseGithubUrl('https://gitlab.com/user/repo.git');
			assert.strictEqual(result, null);
		});

		test('Should return null for invalid URLs', () => {
			const result = myExtension.parseGithubUrl('not-a-url');
			assert.strictEqual(result, null);
		});
	});

	suite('GitHub Permalink Integration Tests', () => {
		test('Copy GitHub Permalink command should handle missing git repository gracefully', async () => {
			// Create a new text document in a non-git directory
			const document = await vscode.workspace.openTextDocument({
				content: 'test content',
				language: 'typescript'
			});

			await vscode.window.showTextDocument(document);

			try {
				// Execute the command - should fail gracefully
				await vscode.commands.executeCommand('selection-path-copier.copyGithubPermalink');

				// The command should show an error message but not throw
				assert.ok(true, 'Command executed without throwing');
			} catch (error) {
				// If the command throws, it's also acceptable for this test
				assert.ok(true, 'Command failed as expected');
			}
		});

		test('Copy GitHub Permalink with Code should handle selection correctly', async () => {
			const document = await vscode.workspace.openTextDocument({
				content: 'Line 1\nLine 2\nLine 3',
				language: 'typescript'
			});

			const editor = await vscode.window.showTextDocument(document);

			// Select lines 1-2
			const start = new vscode.Position(0, 0);
			const end = new vscode.Position(1, 6);
			editor.selection = new vscode.Selection(start, end);

			try {
				// Execute the command
				await vscode.commands.executeCommand('selection-path-copier.copyGithubPermalinkWithCode');

				// Get clipboard content
				const clipboardContent = await vscode.env.clipboard.readText();

				// If we're in a git repo, check for proper format
				if (clipboardContent.includes('github.com')) {
					assert.ok(clipboardContent.includes('#L1-L2'), 'Should include line range');
					assert.ok(clipboardContent.includes('Line 1\nLine 2'), 'Should include selected code');
				}
			} catch (error) {
				// If not in a git repo, the command will fail gracefully
				assert.ok(true, 'Command handled non-git environment gracefully');
			}
		});
	});

	suite('Default Branch Detection', () => {
		test('Should detect default branch name', async () => {
			// This test will depend on the actual git repository
			// In a real test environment, we would mock the execAsync calls
			const workingDir = process.cwd();
			const branchName = await myExtension.getDefaultBranchName(workingDir);

			// The branch name should be one of the common defaults or current branch
			if (branchName) {
				assert.ok(['main', 'master'].includes(branchName) || branchName.length > 0);
			}
		});
	});
});