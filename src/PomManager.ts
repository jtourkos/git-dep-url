import fs from 'fs';
import { parseStringPromise } from 'xml2js';
import { Dependency, DependencyUrls } from './types';
import PackageManagerBase from './PackageManagerBase';

export default class PomManager extends PackageManagerBase {
	name = 'maven';
	filePattern = 'pom.xml';
	globPattern = '**/pom.xml';

	async getDependencies(filePath: string): Promise<Dependency[]> {
		const fileContent = await fs.promises.readFile(filePath, 'utf-8');
		const parsedXml = await parseStringPromise(fileContent);
		const dependenciesXml = parsedXml.project.dependencies?.[0]?.dependency || [];

		const dependencies: Dependency[] = [];

		for (const depXml of dependenciesXml) {
			const groupId = depXml.groupId?.[0];
			const artifactId = depXml.artifactId?.[0];

			if (groupId && artifactId) {
				const packageInfo = await this.getMavenPackageInfo(groupId, artifactId);
				const repoUrl = await this.getRepoUrl(packageInfo);
				const packageUrl = `https://central.sonatype.com/artifact/${groupId}/${artifactId}/${packageInfo.version}`;

				const urls: DependencyUrls = {
					package: packageUrl,
					repo: repoUrl
				};

				dependencies.push({ name: `${groupId}:${artifactId}`, urls });
			}
		}

		return dependencies;
	}

	async getMavenPackageInfo(groupId: string, artifactId: string) {
		const searchUrl = `https://search.maven.org/solrsearch/select?q=g:%22${encodeURIComponent(
			groupId
		)}%22+AND+a:%22${encodeURIComponent(artifactId)}%22&rows=1&wt=json`;

		const response = await fetch(searchUrl);

		const json = await response.json();
		if (json.response.numFound === 0) {
			return undefined;
		}

		const latestDoc = json.response.docs[0];
		const latestVersion = latestDoc.latestVersion;
		const repositoryUrl = latestDoc.repository_url;

		return {
			groupId,
			artifactId,
			version: latestVersion,
			repositoryUrl
		};
	}

	private async getRepoUrl(packageInfo: any): Promise<string | undefined> {
		const { groupId, artifactId, version } = packageInfo;

		const pomUrl = `https://repo1.maven.org/maven2/${groupId.replace(
			/\./g,
			'/'
		)}/${artifactId}/${version}/${artifactId}-${version}.pom`;

		const response = await fetch(pomUrl);
		if (!response.ok) {
			return undefined;
		}

		const pomContent = await response.text();
		const pomXml = await parseStringPromise(pomContent);

		const scm = pomXml?.project?.scm;
		if (scm && scm[0]?.url) {
			return scm[0].url[0];
		}

		return undefined;
	}
}
