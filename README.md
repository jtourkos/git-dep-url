# git-dep-url

A simple TypeScript library that extracts dependency URLs from various package managers in Git repositories.

> **Warning**: This library is designed to cover common ways of specifying dependencies across different package managers. While it aims to identify as many dependencies as possible, it is not guaranteed to cover all cases or to identify every dependency for every project. Please be aware of this limitation when using this library and verify the results in your specific use case.

## 🚀 Features

- Supported package managers:
  - npm
  - nuget
  - pypi
  - crates
- Works with monorepos
- No duplicate dependencies

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
