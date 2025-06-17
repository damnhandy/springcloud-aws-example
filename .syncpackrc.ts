export default {
  semverGroups: [
    {
      dependencyTypes: ["!peer", "!pnpmOverrides"],
      range: "^"
    },
    {
      dependencyTypes: ["peer"],
      range: "<"
    },
    {
      dependencyTypes: ["pnpmOverrides"],
      range: ">="
    }
  ],
  sortPackages: true,
  sortFirst: [
    "name",
    "description",
    "version",
    "author",
    "license",
    "private",
    "homepage",
    "repository",
    "bugs",
    "type",
    "engines",
    "bin",
    "main",
    "module",
    "types",
    "imports",
    "exports",
    "publishConfig",
    "scripts",
    "dependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "devDependencies"
  ],
  dependencyGroups: [
    {
      dependencies: ["@aws-sdk/**"],
      aliasName: "aws-sdk-dependencies"
    },
    {
      dependencies: ["@aws-cdk/**"],
      aliasName: "aws-cdk-alpha-dependencies"
    },
    {
      dependencies: ["aws-cdk-lib"],
      aliasName: "aws-cdk-lib-dependencies"
    },
    {
      dependencies: ["@types/**"],
      aliasName: "typings"
    },
    {
      aliasName: "jest-deps",
      dependencies: ["jest", "ts-jest"]
    }
  ],
  versionGroups: [
    /**
     * The version of typescript.
     */
    {
      dependencies: ["typescript", "tslib"],
      dependencyTypes: ["dev"],
      pinVersion: "~5.5.4"
    },
    /**
     * TypeScript and related dependencies.
     */
    {
      dependencies: ["typings"],
      dependencyTypes: ["dev"],
      pinVersion: "ts5.5"
    },
    {
      dependencies: ["jiti"],
      dependencyTypes: ["dev"],
      pinVersion: "^2.4.2"
    },
    {
      dependencies: ["eslint"],
      dependencyTypes: ["dev"],
      pinVersion: "^9"
    },
    {
      dependencies: ["@typescript-eslint/**"],
      dependencyTypes: ["dev"],
      pinVersion: "^8.34.0"
    },
    {
      dependencies: ["eslint-config-prettier"],
      dependencyTypes: ["dev"],
      pinVersion: "^10"
    },
    {
      dependencies: ["eslint-import-resolver-typescript"],
      dependencyTypes: ["dev"],
      pinVersion: "^4"
    },
    {
      dependencies: ["eslint-plugin-import"],
      dependencyTypes: ["dev"],
      pinVersion: "^2"
    },
    {
      dependencies: ["eslint-plugin-jest"],
      dependencyTypes: ["dev"],
      pinVersion: "^28"
    },
    {
      dependencies: ["eslint-plugin-prettier"],
      dependencyTypes: ["dev"],
      pinVersion: "^5"
    },
    {
      dependencies: ["eslint-plugin-unicorn"],
      dependencyTypes: ["dev"],
      pinVersion: "^59"
    },
    {
      dependencies: ["husky"],
      dependencyTypes: ["dev"],
      pinVersion: "^9"
    },
    {
      dependencies: ["lint-staged"],
      dependencyTypes: ["dev"],
      pinVersion: "^16"
    },
    {
      dependencies: ["prettier"],
      dependencyTypes: ["dev"],
      pinVersion: "^3.5.3"
    },
    {
      dependencies: ["syncpack"],
      dependencyTypes: ["dev"],
      pinVersion: "^14.0.0-alpha.13"
    },
    {
      dependencies: ["source-map-support"],
      dependencyTypes: ["dev"],
      pinVersion: "^0.5.21"
    },
    {
      dependencies: ["ts-node"],
      dependencyTypes: ["dev"],
      pinVersion: "^10"
    },
    {
      dependencies: ["jest-deps"],
      dependencyTypes: ["dev"],
      pinVersion: "^29"
    },
    {
      dependencies: ["jest-junit"],
      dependencyTypes: ["dev"],
      pinVersion: "^16"
    },
    {
      dependencies: ["semver"],
      dependencyTypes: ["dev"],
      pinVersion: "^7"
    },
    /**
     * AWS CDK dependencies
     */
    {
      dependencies: ["aws-cdk-lib-dependencies"],
      dependencyTypes: ["prod", "dev"],
      pinVersion: "2.200.2"
    },
    {
      dependencies: ["aws-cdk-alpha-dependencies"],
      dependencyTypes: ["prod", "dev"],
      pinVersion: "2.200.2-alpha.0"
    },
    {
      dependencies: ["aws-cdk"],
      dependencyTypes: ["prod", "dev"],
      pinVersion: "^2"
    },
    {
      dependencies: ["constructs"],
      dependencyTypes: ["prod", "dev"],
      pinVersion: "^10"
    },
    {
      dependencies: ["aws-lambda"],
      dependencyTypes: ["prod", "dev"],
      pinVersion: "^1.0.7"
    },
    /**
     * AWS SDK v3 dependencies
     */
    {
      dependencies: ["aws-sdk-dependencies"],
      dependencyTypes: ["prod", "dev"],
      pinVersion: "^3.828.0"
    }
  ]
} satisfies import("syncpack").RcFile;
