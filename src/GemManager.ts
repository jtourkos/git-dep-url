import * as fs from 'fs';
import { Dependency, DependencyUrls } from './types';
import PackageManagerBase from './PackageManagerBase';

export default class GemManager extends PackageManagerBase {
	name = 'gems';
	filePattern = 'Gemfile';
	globPattern = '**/Gemfile';

	async getDependencies(filePath: string): Promise<Dependency[]> {
		const fileContent = await fs.promises.readFile(filePath, 'utf-8');
		const lines = fileContent.split('\n').map((line) => line.trim());

		const dependencies: Dependency[] = [];

		for (const line of lines) {
			if (line && !line.startsWith('#')) {
				const packageName = this.extractPackageName(line);
				if (packageName) {
					const packageUrl = `https://rubygems.org/gems/${packageName}`;
					const { repoUrl, otherUrls } = await this.fetchRubyGemsRepoUrl(packageName);

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
		}

		return dependencies;
	}

	private extractPackageName(line: string): string {
		const lineWithoutComments = line.split('#')[0].trim();
		const packageNameMatch = lineWithoutComments.match(/gem\s+['"]([^'"]+)['"]/);
		if (packageNameMatch) {
			return packageNameMatch[1];
		}
		return '';
	}

	private async fetchRubyGemsRepoUrl(
		packageName: string
	): Promise<{ repoUrl?: string; otherUrls?: Record<string, string> }> {
		const apiUrl = `https://rubygems.org/api/v1/gems/${encodeURIComponent(packageName)}.json`;
		const response = await fetch(apiUrl);

		if (!response.ok) {
			return {};
		}

		const data = await response.json();
		const urlsToCheck = {
			source_code_uri: data.source_code_uri,
			homepage_uri: data.homepage_uri,
			project_uri: data.project_uri
		};
		const repoUrlRegex =
			/^(https:\/\/|git@|http:\/\/)(github\.com|gitlab\.com|bitbucket\.org)\/[^\/]+\/[^\/]+(\.git)?$/;

		let repoUrl: string | undefined;
		const otherUrls: Record<string, string> = {};

		for (const key in urlsToCheck) {
			const url = urlsToCheck[key];
			if (url && repoUrlRegex.test(url)) {
				repoUrl = url;
			} else if (url) {
				otherUrls[key] = url;
			}
		}

		return { repoUrl, otherUrls };
	}
}
