export type DependencyUrls = {
	package: string;
	repo?: string;
} & Record<string, string>;

export interface Dependency {
	name: string;
	urls: DependencyUrls;
}

export interface PackageManagerDependencies {
	[packageManager: string]: Array<{
		name: string;
		urls: DependencyUrls;
	}>;
}
