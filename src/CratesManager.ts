import fs from 'fs-extra';
import toml from 'toml';
import { Dependency, DependencyUrls } from './types';
import PackageManagerBase from './PackageManagerBase';
import * as path from 'path';
import git from 'isomorphic-git';

export default class CratesManager extends PackageManagerBase {
	name = 'crates';
	filePattern = 'Cargo.toml';
	globPattern = '**/Cargo.toml';

	async getDependencies(filePath: string): Promise<Dependency[]> {
		const fileContent = await fs.promises.readFile(filePath, 'utf-8');
		const parsedToml = toml.parse(fileContent);
		const dependencyTypes = ['dependencies', 'dev-dependencies', 'build-dependencies'];

		const dependencies: Dependency[] = [];

		for (const depType of dependencyTypes) {
			if (parsedToml[depType]) {
				for (const dep in parsedToml[depType]) {
					const dependencyConfig = parsedToml[depType][dep];
					const packageName = dep;

					const packageExists = await this.packageExistsOnCrates(packageName);
					const packageUrl = packageExists ? `https://crates.io/crates/${packageName}` : '';

					const repoUrl = await this.getRepoUrl(packageName, dependencyConfig, filePath);

					const urls: DependencyUrls = { package: packageUrl };
					if (repoUrl) {
						urls.repo = repoUrl;
					}

					dependencies.push({ name: packageName, urls });
				}
			}
		}

		return dependencies;
	}

	private async getRepoUrl(
		packageName: string,
		dependencyConfig: any,
		filePath: string
	): Promise<string | undefined> {
		if (typeof dependencyConfig === 'object') {
			if (dependencyConfig.git) {
				return dependencyConfig.git;
			} else if (dependencyConfig.path) {
				const repoPath = path.join(path.dirname(filePath), dependencyConfig.path);
				const repoUrl = await this.getGitRepoUrlFromPath(repoPath);

				if (repoUrl) {
					return repoUrl;
				} else {
					const packageInfoUrl = `https://crates.io/api/v1/crates/${packageName}`;
					const response = await fetch(packageInfoUrl);
					if (response.ok) {
						const packageInfo = await response.json();
						return packageInfo.crate.repository;
					}
				}
			} else {
				const packageInfoUrl = `https://crates.io/api/v1/crates/${packageName}`;
				const response = await fetch(packageInfoUrl);
				if (response.ok) {
					const packageInfo = await response.json();
					return packageInfo.crate.repository;
				}
			}
		}
		return undefined;
	}

	private async getGitRepoUrlFromPath(filePath: string): Promise<string | undefined> {
		try {
			// Find the root directory of the git repository containing the filePath
			const rootDir = await git.findRoot({ fs, filepath: filePath });

			// Get the repository URL from the root directory
			const remotes = await git.listRemotes({ fs, dir: rootDir });
			const originRemote = remotes.find((remote) => remote.remote === 'origin');
			if (!originRemote) {
				return undefined;
			}

			const inputRepoUrl = originRemote.url;

			return new URL(inputRepoUrl).toString();
		} catch (error) {
			console.error(`Error checking if path is a git repository: ${error.message}`);
		}

		return undefined;
	}

	private async findGitRepo(directory: string): Promise<string | null> {
		let currentPath = directory;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			try {
				const gitPath = path.join(currentPath, '.git');
				const stat = await fs.promises.stat(gitPath);

				if (stat.isDirectory()) {
					return currentPath;
				}
			} catch (error) {
				if (error.code !== 'ENOENT') {
					throw error;
				}
			}

			const parentPath = path.dirname(currentPath);

			if (parentPath === currentPath) {
				return null;
			}

			currentPath = parentPath;
		}
	}

	private async packageExistsOnCrates(packageName: string): Promise<boolean> {
		try {
			const response = await fetch(`https://crates.io/api/v1/crates/${packageName}`);

			if (response.status === 404) {
				return false;
			}

			if (!response.ok) {
				console.warn(`Error fetching package info for ${packageName}: ${response.statusText}`);
				return false;
			}

			return true;
		} catch (error) {
			console.warn(`Error fetching package info for ${packageName}: ${error.message}`);
			return false;
		}
	}
}
