import PackageManagerBase from './PackageManagerBase';
import { Dependency } from './types';
import * as fs from 'fs';

export default class NpmManager extends PackageManagerBase {
	filePattern = 'package.json';
	globPattern = '**/package.json';
	name = 'npm';

	async getDependencies(filePath: string): Promise<Dependency[]> {
		const fileContent = await fs.promises.readFile(filePath, 'utf-8');
		const packageJson = JSON.parse(fileContent);

		const dependencies: Dependency[] = [];

		if (packageJson.dependencies) {
			for (const [name] of Object.entries(packageJson.dependencies)) {
				const packageUrl = `https://www.npmjs.com/package/${name}`;
				const repoUrl = await this.fetchNpmRepoUrl(name);
				dependencies.push({ name, urls: { package: packageUrl, repo: repoUrl } });
			}
		}

		if (packageJson.devDependencies) {
			for (const [name] of Object.entries(packageJson.devDependencies)) {
				const packageUrl = `https://www.npmjs.com/package/${name}`;
				const repoUrl = await this.fetchNpmRepoUrl(name);
				dependencies.push({ name, urls: { package: packageUrl, repo: repoUrl } });
			}
		}

		return dependencies;
	}

	private async fetchNpmRepoUrl(packageName: string): Promise<string | undefined> {
		const registryUrl = `https://registry.npmjs.org/${packageName}`;
		const response = await fetch(registryUrl);

		if (!response.ok) {
			return undefined;
		}

		const packageData = await response.json();
		return packageData.repository?.url;
	}
}
