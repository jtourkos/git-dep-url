import PackageManagerBase from './PackageManagerBase';
import { Dependency } from './types';
import * as fs from 'fs';
import { parseStringPromise } from 'xml2js';

export default class NugetManager extends PackageManagerBase {
	filePattern = '.csproj';
	globPattern = '**/*.csproj';
	name = 'nuget';

	async getDependencies(filePath: string): Promise<Dependency[]> {
		const fileContent = await fs.promises.readFile(filePath, 'utf-8');
		const parsedXml = await parseStringPromise(fileContent);

		if (!parsedXml || !parsedXml.Project || !parsedXml.Project.ItemGroup) {
			return [];
		}

		const dependencies: Dependency[] = [];

		for (const itemGroup of parsedXml.Project.ItemGroup) {
			if (itemGroup.PackageReference) {
				for (const packageReference of itemGroup.PackageReference) {
					const packageName = packageReference.$.Include;
					const packageVersion = packageReference.$.Version;
					const packageUrl = `https://www.nuget.org/packages/${packageName}`;
					const repoUrl = await this.fetchNuGetRepoUrl(packageName, packageVersion);
					dependencies.push({ name: packageName, urls: { package: packageUrl, repo: repoUrl } });
				}
			}
		}

		return dependencies;
	}

	private async fetchNuGetRepoUrl(
		packageName: string,
		packageVersion: string
	): Promise<string | undefined> {
		const nuspecContent = await this.fetchNuGetNuspec(packageName, packageVersion);
		const parsedXml = await parseStringPromise(nuspecContent);

		if (
			!parsedXml ||
			!parsedXml.package ||
			!parsedXml.package.metadata ||
			!parsedXml.package.metadata[0]
		) {
			return undefined;
		}

		const metadata = parsedXml.package.metadata[0];
		return metadata.repository && metadata.repository[0] && metadata.repository[0].$.url;
	}

	private async fetchNuGetNuspec(packageName: string, packageVersion: string): Promise<string> {
		const nuspecUrl = `https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(
			packageName.toLowerCase()
		)}/${encodeURIComponent(packageVersion)}/${encodeURIComponent(
			packageName.toLowerCase()
		)}.nuspec`;

		const response = await fetch(nuspecUrl);

		if (!response.ok) {
			throw new Error(
				`Error fetching .nuspec file for ${packageName}@${packageVersion}: ${response.statusText}`
			);
		}

		return await response.text();
	}
}
