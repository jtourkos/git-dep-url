# git-dep-url

A simple TypeScript library that extracts dependency URLs from various package managers in Git repositories.

:warning: **Warning**: This library is designed to cover common ways of specifying dependencies across different package managers. While it aims to identify as many dependencies as possible, it is not guaranteed to cover all cases or to identify every dependency for every project. Please be aware of this limitation when using this library and verify the results in your specific use case.

:warning: **Java Dependencies**: The library always assumes the <u>latest version</u> of each dependency when generating URLs. This is due to a limitation in fetching package information without knowing the exact version of the package. Please note that the generated URLs for Java dependencies might not always correspond to the exact version used in your project.

## 🚀 Supported Package Managers

1. **Python (Pip)**: handles Python projects with `requirements.txt` files. It extracts package info from the `PyPI` API.

2. **Ruby (Gems)**: handles Ruby projects with `Gemfile` files. It extracts package info from the `RubyGems` API.

3. **JavaScript (NPM)**: handles JavaScript projects with `package.json` files. It extracts package info from the `NPM` API.

4. **.NET (NuGet)**: handles .NET projects with `*.csproj` files. It extracts package info from the `NuGet` API.

5. **Rust (Cargo)**: handles Rust projects with `Cargo.toml` files. It extracts package info from the `Crates` API.

6. **Java (Maven)**: handles Java projects with `pom.xml` files. It extracts package info from `Maven` Central Repository.

## 📦 Installation

Install the package via npm:

```bash
npm install git-dep-url
```

## 🎮 Usage

Here's a basic example of how to use the library:

```ts
import { DepUrlExtractor } from 'git-dep-url';

const depUrlExtractor = new DepUrlExtractor();

(async () => {
 const dependencies = await depUrlExtractor.discoverUrls('https://github.com/your-project.git');

 console.log(JSON.stringify(dependencies, null, 2));
})();
```

Example response:

```json
{
 "npm": [
  {
   "name": "dependency-1",
   "urls": {
    "packageUrl": "https://www.npmjs.com/package/dependency-1",
    "repoUrl": "https://github.com/user/dependency-1"
   }
  },
  {
   "name": "dependency-2",
   "urls": {
    "packageUrl": "https://www.npmjs.com/package/dependency-2",
    "repoUrl": "https://github.com/user/dependency-2"
   }
  }
 ],
 "nuget": [
  {
   "name": "SomeNuGetPackage",
   "urls": {
    "packageUrl": "https://www.nuget.org/packages/SomeNuGetPackage",
    "repoUrl": "https://github.com/user/SomeNuGetPackage"
   }
  }
 ]
}
```

## 📚 API

The API is pretty simple:

The `DepUrlExtractor` class exposes a

```ts
discoverUrls(gitUrl: string): Promise<PackageManagerDependencies>
```

method that fetches and returns the dependency information from a Git repository.

## 💡 Contributing

Feel free to contribute by submitting pull requests or opening issues. Any feedback is appreciated!

## 📄 License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
