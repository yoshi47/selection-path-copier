import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { getGitTopLevel, getGitRemoteUrl, getGitCommitHash, getDefaultBranchName, parseGithubUrl } from '../../gitHelper.js';

suite('Git Helper Test Suite', () => {
	let fixtureDir: string;
	let repoDir: string;
	let sampleFile: string;

	suiteSetup(() => {
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

	suite('getGitTopLevel', () => {
		test('should return repo root for a file inside a repo', async () => {
			const result = await getGitTopLevel(sampleFile);
			assert.strictEqual(result, repoDir);
		});

		test('should return null for a non-git directory', async () => {
			const nonGitFile = path.join(fixtureDir, 'dummy.txt');
			fs.writeFileSync(nonGitFile, 'dummy');
			try {
				const result = await getGitTopLevel(nonGitFile);
				assert.strictEqual(result, null);
			} finally {
				fs.unlinkSync(nonGitFile);
			}
		});

		test('should return sub-repo root, not parent workspace root (workspace ≠ repo)', async () => {
			const result = await getGitTopLevel(sampleFile);
			// Must be repo-a, not the parent fixture directory
			assert.strictEqual(result, repoDir);
			assert.notStrictEqual(result, fixtureDir);
		});

		test('should return repo root for a file in a nested subdirectory', async () => {
			const nestedDir = path.join(repoDir, 'src', 'nested');
			fs.mkdirSync(nestedDir, { recursive: true });
			const nestedFile = path.join(nestedDir, 'deep.ts');
			fs.writeFileSync(nestedFile, 'const y = 2;\n');
			try {
				const result = await getGitTopLevel(nestedFile);
				assert.strictEqual(result, repoDir);
			} finally {
				fs.rmSync(path.join(repoDir, 'src'), { recursive: true, force: true });
			}
		});
	});

	suite('getGitRemoteUrl', () => {
		test('should return remote origin URL', async () => {
			const result = await getGitRemoteUrl(repoDir);
			assert.strictEqual(result, 'https://github.com/test-owner/test-repo.git');
		});

		test('should return null for a repo with no remote', async () => {
			const noRemoteDir = path.join(fixtureDir, 'no-remote');
			fs.mkdirSync(noRemoteDir, { recursive: true });
			execSync('git init', { cwd: noRemoteDir });
			execSync('git config user.name "Test User"', { cwd: noRemoteDir });
			execSync('git config user.email "test@example.com"', { cwd: noRemoteDir });
			try {
				const result = await getGitRemoteUrl(noRemoteDir);
				assert.strictEqual(result, null);
			} finally {
				fs.rmSync(noRemoteDir, { recursive: true, force: true });
			}
		});
	});

	suite('getGitCommitHash', () => {
		test('should return a 40-character hex commit hash', async () => {
			const result = await getGitCommitHash(repoDir);
			assert.ok(result);
			assert.match(result!, /^[0-9a-f]{40}$/);
		});

		test('should return null for a non-git directory', async () => {
			const result = await getGitCommitHash(fixtureDir);
			assert.strictEqual(result, null);
		});
	});

	suite('getDefaultBranchName', () => {
		test('should return the current branch name for fixture repo', async () => {
			const expected = execSync('git branch --show-current', { cwd: repoDir }).toString().trim();
			const result = await getDefaultBranchName(repoDir);
			assert.ok(result);
			assert.strictEqual(result, expected);
		});
	});

	suite('parseGithubUrl', () => {
		test('should parse SSH GitHub URL correctly', () => {
			const result = parseGithubUrl('git@github.com:owner/repo.git');
			assert.deepStrictEqual(result, { owner: 'owner', repo: 'repo' });
		});

		test('should parse SSH GitHub URL without .git extension', () => {
			const result = parseGithubUrl('git@github.com:owner/repo');
			assert.deepStrictEqual(result, { owner: 'owner', repo: 'repo' });
		});

		test('should parse HTTPS GitHub URL correctly', () => {
			const result = parseGithubUrl('https://github.com/owner/repo.git');
			assert.deepStrictEqual(result, { owner: 'owner', repo: 'repo' });
		});

		test('should parse HTTPS GitHub URL without .git extension', () => {
			const result = parseGithubUrl('https://github.com/owner/repo');
			assert.deepStrictEqual(result, { owner: 'owner', repo: 'repo' });
		});

		test('should return null for non-GitHub URLs', () => {
			assert.strictEqual(parseGithubUrl('https://gitlab.com/user/repo.git'), null);
		});

		test('should return null for invalid URLs', () => {
			assert.strictEqual(parseGithubUrl('not-a-url'), null);
		});
	});
});
