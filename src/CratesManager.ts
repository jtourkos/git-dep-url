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
		if (dependencyConfig.git) {
			return dependencyConfig.git;
		} else if (dependencyConfig.path) {
			const repoPath = path.join(path.dirname(filePath), dependencyConfig.path);
			const repoUrl = await this.getGitRepoUrlFromPath(repoPath);

			if (repoUrl) {
				return repoUrl;
			} else {
				// If the local path is not a Git repository, fetch the URL from crates.io
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
		return undefined;
	}

	private async getGitRepoUrlFromPath(filePath: string): Promise<string | undefined> {
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
	}

	private async packageExistsOnCrates(packageName: string): Promise<boolean> {
		const response = await fetch(`https://crates.io/api/v1/crates/${packageName}`);

		if (response.status === 404) {
			return false;
		}

		if (!response.ok) {
			return false;
		}

		return true;
	}
}
