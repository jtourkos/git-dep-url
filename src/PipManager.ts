import * as fs from 'fs';
import { Dependency, DependencyUrls } from './types';
import PackageManagerBase from './PackageManagerBase';

export class PipManager extends PackageManagerBase {
	name = 'pip';
	filePattern = 'requirements.txt';
	globPattern = '**/requirements*.txt';

	async getDependencies(filePath: string): Promise<Dependency[]> {
		const fileContent = await fs.promises.readFile(filePath, 'utf-8');
		const lines = fileContent.split('\n').map((line) => line.trim());

		const dependencies: Dependency[] = [];

		for (const line of lines) {
			if (line && !line.startsWith('#')) {
				const packageName = this.extractPackageName(line);
				const packageUrl = `https://pypi.org/project/${packageName}`;
				const { repoUrl, otherUrls } = await this.fetchPyPIRepoUrl(packageName);

				const urls: DependencyUrls = {
					package: packageUrl,
					...otherUrls
				};

				if (repoUrl) {
					urls.repo = repoUrl;
				}

				dependencies.push({ name: packageName, urls });
			}
		}

		return dependencies;
	}

	private extractPackageName(line: string): string {
		const lineWithoutComments = line.split('#')[0].trim();
		const packageNameMatch = lineWithoutComments.match(/([^\s<>=!]+)/);
		if (packageNameMatch) {
			return packageNameMatch[1];
		}
		return '';
	}

	private async fetchPyPIRepoUrl(
		packageName: string
	): Promise<{ repoUrl?: string; otherUrls?: Record<string, string> }> {
		const apiUrl = `https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`;
		const response = await fetch(apiUrl);

		if (!response.ok) {
			console.warn(`Error fetching package info for ${packageName}: ${response.statusText}`);
			return {};
		}

		const packageInfo = await response.json();
		const projectUrls = packageInfo?.info?.project_urls;
		const repoUrlRegex =
			/^(https:\/\/|git@)(github\.com|gitlab\.com|bitbucket\.org)\/[^\/]+\/[^\/]+(\.git)?$/;

		let repoUrl: string | undefined;
		const otherUrls: Record<string, string> = {};

		if (projectUrls) {
			for (const key in projectUrls) {
				const url = projectUrls[key];
				if (repoUrlRegex.test(url)) {
					repoUrl = url;
				} else {
					otherUrls[key] = url;
				}
			}
		}

		return { repoUrl, otherUrls };
	}
}
