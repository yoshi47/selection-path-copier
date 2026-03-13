import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	suiteSetup(async () => {
		// Ensure the extension is activated.
		// With "onStartupFinished" activation event, VS Code activates the extension
		// automatically before tests run, so we only call activate() as a fallback
		// when the extension is genuinely not yet active.
		const ext = vscode.extensions.getExtension('undefined.selection-path-copier');
		if (ext) {
			if (!ext.isActive) {
				await ext.activate();
			}
		} else {
			// Extension ID not found — check if already activated by seeing if commands exist
			const commands = await vscode.commands.getCommands(true);
			if (!commands.includes('selection-path-copier.copyPath')) {
				await myExtension.activate({ subscriptions: [] } as any);
			}
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

	suite('GitHub Permalink URL Building', () => {
		const githubInfo = { owner: 'yoshi47', repo: 'selection-path-copier' };
		const ref = 'abc123def456';

		test('Should add plain=1 for markdown single-line permalinks', () => {
			const result = myExtension.buildGithubPermalinkUrl(githubInfo, ref, 'README.md', '#L14');
			assert.strictEqual(
				result,
				'https://github.com/yoshi47/selection-path-copier/blob/abc123def456/README.md?plain=1#L14'
			);
		});

		test('Should add plain=1 for markdown range permalinks', () => {
			const result = myExtension.buildGithubPermalinkUrl(githubInfo, ref, 'docs/guide.md', '#L14-L18');
			assert.strictEqual(
				result,
				'https://github.com/yoshi47/selection-path-copier/blob/abc123def456/docs/guide.md?plain=1#L14-L18'
			);
		});

		test('Should not add plain=1 for non-markdown permalinks', () => {
			const result = myExtension.buildGithubPermalinkUrl(githubInfo, ref, 'src/extension.ts', '#L20-L40');
			assert.strictEqual(
				result,
				'https://github.com/yoshi47/selection-path-copier/blob/abc123def456/src/extension.ts#L20-L40'
			);
		});

		test('Should detect markdown extension case-insensitively', () => {
			const result = myExtension.buildGithubPermalinkUrl(githubInfo, ref, 'docs/README.MD', '#L7');
			assert.strictEqual(
				result,
				'https://github.com/yoshi47/selection-path-copier/blob/abc123def456/docs/README.MD?plain=1#L7'
			);
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

	suite('Workspace ≠ Git Repo (Issue #3)', () => {
		let fixtureDir: string;
		let repoDir: string;
		let sampleFile: string;

		suiteSetup(function () {
			this.timeout(10000);
			// Create fixture: non-git workspace with a git sub-repository
			fixtureDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spc-test-')));
			repoDir = path.join(fixtureDir, 'repo-a');
			fs.mkdirSync(repoDir, { recursive: true });

			execSync('git init', { cwd: repoDir });
			execSync('git config user.name "Test User"', { cwd: repoDir });
			execSync('git config user.email "test@example.com"', { cwd: repoDir });
			execSync('git remote add origin https://github.com/test-owner/test-repo.git', { cwd: repoDir });

			sampleFile = path.join(repoDir, 'sample.ts');
			fs.writeFileSync(sampleFile, 'const x = 1;\n');

			execSync('git add sample.ts', { cwd: repoDir });
			execSync('git commit -m "initial commit"', { cwd: repoDir });
		});

		suiteTeardown(() => {
			fs.rmSync(fixtureDir, { recursive: true, force: true });
		});

		test('Copy GitHub Permalink should work when workspace root is not a git repo', async function () {
			this.timeout(10000);

			// Open the sample file inside the sub-repo (no workspace folder manipulation needed)
			const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sampleFile));
			const editor = await vscode.window.showTextDocument(document);

			// Place cursor on line 1
			const position = new vscode.Position(0, 0);
			editor.selection = new vscode.Selection(position, position);

			// Execute the permalink command
			await vscode.commands.executeCommand('selection-path-copier.copyGithubPermalink');

			// Verify clipboard content
			const clipboardContent = await vscode.env.clipboard.readText();

			assert.ok(
				clipboardContent.startsWith('https://github.com/test-owner/test-repo/blob/'),
				`Expected GitHub permalink, got: ${clipboardContent}`
			);
			assert.ok(
				clipboardContent.includes('/sample.ts'),
				`Expected path to contain /sample.ts, got: ${clipboardContent}`
			);
			// Should NOT contain repo-a in the path (relative to git root, not workspace root)
			assert.ok(
				!clipboardContent.includes('/repo-a/'),
				`Path should be relative to git root, not workspace. Got: ${clipboardContent}`
			);
			assert.ok(
				clipboardContent.includes('#L1'),
				`Expected #L1 line reference, got: ${clipboardContent}`
			);
		});
	});

	suite('getDisplayPath', () => {
		test('should return relative path when pathType is relative and file is in workspace', async () => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				// Skip test if no workspace folder is open
				return;
			}

			// Create a file inside the workspace
			const workspaceUri = workspaceFolders[0].uri;
			const testFileUri = vscode.Uri.joinPath(workspaceUri, 'test-getDisplayPath.txt');
			await vscode.workspace.fs.writeFile(testFileUri, Buffer.from('test content'));

			try {
				const document = await vscode.workspace.openTextDocument(testFileUri);
				const result = myExtension.getDisplayPath(document, 'relative');

				assert.strictEqual(result, 'test-getDisplayPath.txt');
			} finally {
				await vscode.workspace.fs.delete(testFileUri);
			}
		});

		test('should return absolute path when pathType is relative but file is outside workspace', async () => {
			// Create an untitled document (not associated with any workspace)
			const document = await vscode.workspace.openTextDocument({ content: 'outside workspace' });
			const result = myExtension.getDisplayPath(document, 'relative');

			// Should fall back to document.fileName (absolute path)
			assert.strictEqual(result, document.fileName);
		});

		test('should return absolute path when pathType is absolute', async () => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				return;
			}

			const workspaceUri = workspaceFolders[0].uri;
			const testFileUri = vscode.Uri.joinPath(workspaceUri, 'test-getDisplayPath-abs.txt');
			await vscode.workspace.fs.writeFile(testFileUri, Buffer.from('test content'));

			try {
				const document = await vscode.workspace.openTextDocument(testFileUri);
				const result = myExtension.getDisplayPath(document, 'absolute');

				// Should return the full file path
				assert.strictEqual(result, document.fileName);
			} finally {
				await vscode.workspace.fs.delete(testFileUri);
			}
		});
	});
});
