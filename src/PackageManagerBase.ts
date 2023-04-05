import { glob } from 'glob';
import { Dependency } from './types';
import * as path from 'path';

export default abstract class PackageManagerBase {
	abstract filePattern: string;
	abstract globPattern: string;
	abstract name: string;

	async findDependencyFiles(tempFolderPath: string): Promise<string[]> {
		const files = (await glob(`**/${this.globPattern}`, {
			cwd: tempFolderPath,
			nodir: true
		})) as string[];
		return files.map((file) => path.join(tempFolderPath, file));
	}

	abstract getDependencies(filePath: string): Promise<Dependency[]>;
}
