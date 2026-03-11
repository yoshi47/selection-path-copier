import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getGitTopLevel(filePath: string): Promise<string | null> {
	try {
		const dir = path.dirname(filePath);
		const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: dir });
		return stdout.trim();
	} catch (error) {
		console.warn('getGitTopLevel failed:', error);
		return null;
	}
}

export async function getGitRemoteUrl(workingDir: string): Promise<string | null> {
	try {
		const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: workingDir });
		return stdout.trim();
	} catch (error) {
		console.debug('getGitRemoteUrl failed:', error);
		return null;
	}
}

export async function getGitCommitHash(workingDir: string): Promise<string | null> {
	try {
		const { stdout } = await execAsync('git rev-parse HEAD', { cwd: workingDir });
		return stdout.trim();
	} catch (error) {
		console.debug('getGitCommitHash failed:', error);
		return null;
	}
}

export async function getDefaultBranchName(workingDir: string): Promise<string | null> {
	try {
		// First try to get the default branch from the remote
		const { stdout: remoteHead } = await execAsync('git symbolic-ref refs/remotes/origin/HEAD', { cwd: workingDir });
		// Extract branch name from refs/remotes/origin/main format
		const match = remoteHead.trim().match(/refs\/remotes\/origin\/(.+)$/);
		if (match) {
			return match[1];
		}
	} catch (error) {
		console.debug('getDefaultBranchName: symbolic-ref failed, trying fallbacks:', error);
		// If that fails, try common default branch names
		try {
			// Check if main branch exists
			await execAsync('git show-ref --verify --quiet refs/heads/main', { cwd: workingDir });
			return 'main';
		} catch (error) {
			console.debug('getDefaultBranchName: main branch not found:', error);
			try {
				// Check if master branch exists
				await execAsync('git show-ref --verify --quiet refs/heads/master', { cwd: workingDir });
				return 'master';
			} catch (error) {
				console.debug('getDefaultBranchName: master branch not found:', error);
				// Fallback to current branch
				try {
					const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workingDir });
					return currentBranch.trim();
				} catch (error) {
					console.warn('getDefaultBranchName: all detection methods failed:', error);
					return null;
				}
			}
		}
	}
	return null;
}

export function parseGithubUrl(remoteUrl: string): { owner: string; repo: string } | null {
	// Handle SSH URLs: git@github.com:owner/repo.git
	const sshMatch = remoteUrl.match(/git@github\.com:(.+)\/(.+?)(?:\.git)?$/);
	if (sshMatch) {
		return { owner: sshMatch[1], repo: sshMatch[2] };
	}

	// Handle HTTPS URLs: https://github.com/owner/repo.git
	const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/(.+)\/(.+?)(?:\.git)?$/);
	if (httpsMatch) {
		return { owner: httpsMatch[1], repo: httpsMatch[2] };
	}

	return null;
}
