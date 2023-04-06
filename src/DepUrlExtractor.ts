import NpmManager from './NpmManager';
import NugetManager from './NugetManager';
import PackageManagerBase from './PackageManagerBase';
import * as fs from 'fs';
import * as path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { Dependency, PackageManagerDependencies } from './types';
import { PipManager } from './PipManager';
import CratesManager from './CratesManager';
import GemManager from './GemManager';

export default class DepUrlExtractor {
	private packageManagers: PackageManagerBase[];

	constructor() {
		this.packageManagers = [
			new NpmManager(),
			new NugetManager(),
			new PipManager(),
			new CratesManager(),
			new GemManager()
		];
	}

	async discoverUrls(gitUrl: string): Promise<PackageManagerDependencies> {
		try {
			const dependencies = await this.retry(async () => await this.tryGetDependencies(gitUrl));
			return dependencies;
		} catch (error) {
			console.error('Failed to fetch dependencies after retries:', error);
		} finally {
			await fs.promises.rm(path.join(__dirname, 'temp'), { recursive: true });
		}
	}

	private async tryGetDependencies(gitUrl: string): Promise<PackageManagerDependencies> {
		try {
			const tempFolderPath = await this.cloneRepository(gitUrl);

			const dependencyFilesPromises = this.packageManagers.map((pm) =>
				pm.findDependencyFiles(tempFolderPath)
			);
			const dependencyFiles = (await Promise.all(dependencyFilesPromises)).flat();

			const dependenciesPromises: Promise<{
				packageManager: string;
				dependencies: Dependency[];
			}>[] = [];

			dependencyFiles.forEach((filePath) => {
				const packageManager = this.packageManagers.find((pm) => filePath.endsWith(pm.filePattern));
				if (packageManager) {
					const promise = (async () => {
						const dependencies = await packageManager.getDependencies(filePath);
						return { packageManager: packageManager.name, dependencies };
					})();
					dependenciesPromises.push(promise);
				}
			});

			const results = await Promise.all(dependenciesPromises);

			const aggregatedDependencies: Partial<PackageManagerDependencies> = {};

			for (const result of results) {
				const { packageManager, dependencies } = result;

				if (!aggregatedDependencies[packageManager]) {
					aggregatedDependencies[packageManager] = [];
				}

				for (const dependency of dependencies) {
					aggregatedDependencies[packageManager].push({
						name: dependency.name,
						urls: dependency.urls
					});
				}

				aggregatedDependencies[packageManager] = this.removeDuplicateDependencies(
					aggregatedDependencies[packageManager] as Dependency[]
				);
			}

			return aggregatedDependencies as PackageManagerDependencies;
		} catch (error) {
			console.error(error);
		}
	}

	private async cloneRepository(gitUrl: string): Promise<string> {
		const tempFolderPath = path.join(__dirname, 'temp', Math.random().toString(36).substring(2));
		await git.clone({ fs, http, dir: tempFolderPath, url: gitUrl });

		return tempFolderPath;
	}

	private async retry<T>(
		asyncFn: () => Promise<T>,
		retries = 3,
		initialDelayMs = 1000
	): Promise<T> {
		let delay = initialDelayMs;
		let lastError;

		for (let attempt = 1; attempt <= retries + 1; attempt++) {
			try {
				return await asyncFn();
			} catch (error) {
				lastError = error;
				console.error(`Attempt ${attempt} failed: ${error.message}`);

				if (attempt < retries + 1) {
					await new Promise((resolve) => setTimeout(resolve, delay));
					delay *= 2; // Exponential backoff.
				}
			}
		}

		throw lastError;
	}

	private removeDuplicateDependencies(dependencies: Dependency[]): Dependency[] {
		return dependencies.reduce((acc: Dependency[], dependency) => {
			const existingDependency = acc.find((dep) => dep.name === dependency.name);
			if (!existingDependency) {
				acc.push(dependency);
			}
			return acc;
		}, []);
	}
}
