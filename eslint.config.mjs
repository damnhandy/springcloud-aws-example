import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import perfectionist from "eslint-plugin-perfectionist";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default tseslint.config(
  globalIgnores([
    ".github/*",
    ".husky/*",
    ".idea/*",
    ".next/*",
    ".vscode/*",
    "coverage/*",
    "dist/*",
    "node_modules/*",
    "**/.idea/*",
    "**/cdk.out/*",
    "cdk.out/"
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  eslintPluginUnicorn.configs.recommended,
  perfectionist.configs["recommended-natural"],
  prettierConfig,
  {
    ignores: ["**/*.{js,mjs}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      import: eslintPluginImport
    },
    rules: {
      curly: ["error"],
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: ["**/test/**"],
          optionalDependencies: false,
          peerDependencies: true
        }
      ],
      "import/no-unresolved": ["error"],
      "max-lines": ["error", { max: 1000, skipBlankLines: true, skipComments: true }],
      "prefer-template": ["error"],
      /**
       * This rule is set to kebab-case to enforce consistent file naming conventions.
       */
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase"
        }
      ],
      /**
       * This rule is disabled because it conflicts with the AWS CDK naming conventions
       * such as Props vs Properties, etc.
       */
      "unicorn/prevent-abbreviations": ["off"]
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"]
      },
      "import/resolver": {
        node: {
          paths: ["lib", "bin", "test", "config"]
        },
        typescript: {
          project: "./tsconfig.json"
        }
      }
    }
  },
  // Disable type checked rules for JavaScript files
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ["**/*.{js,mjs}"]
  }
);
