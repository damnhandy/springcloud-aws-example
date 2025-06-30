import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginImport from "eslint-plugin-import";

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
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    ignores: ["**/*.{js,mjs}"],
    plugins: {
      import: eslintPluginImport
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
    },
    rules: {
      "max-lines": ["error", { max: 1000, skipComments: true, skipBlankLines: true }],
      "prefer-template": ["error"],
      curly: ["error"],
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase"
        }
      ],
      "unicorn/prevent-abbreviations": ["off"],
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: ["**/test/**"],
          optionalDependencies: false,
          peerDependencies: true
        }
      ],
      "import/no-unresolved": ["error"],
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external"],
          alphabetize: {
            order: "asc",
            caseInsensitive: false
          }
        }
      ],
      "no-duplicate-imports": ["error"],
      "no-shadow": ["off"],
      "key-spacing": ["error"],
      "no-multiple-empty-lines": ["error"],
      "no-return-await": ["error"],
      "dot-notation": ["error"],
      "no-bitwise": ["error"],
      "@typescript-eslint/no-require-imports": ["error"],
      "@typescript-eslint/no-floating-promises": ["error"],
      "@typescript-eslint/no-shadow": ["error"],
      "@typescript-eslint/member-ordering": [
        "error",
        {
          default: [
            "public-static-field",
            "public-static-method",
            "protected-static-field",
            "protected-static-method",
            "private-static-field",
            "private-static-method",
            "field",
            "constructor",
            "method"
          ]
        }
      ],

      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "classProperty",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow"
        },
        {
          selector: "typeProperty",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow"
        },
        {
          selector: "parameterProperty",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow"
        },
        {
          selector: "typeLike",
          format: ["PascalCase"]
        },
        {
          selector: "enumMember",
          format: ["UPPER_CASE"]
        },
        {
          selector: "variable",
          types: ["boolean"],
          format: ["PascalCase"],
          prefix: ["is", "should", "has", "can", "did", "will", "result"]
        },
        {
          selector: ["class", "interface", "enum", "typeAlias"],
          format: ["PascalCase"]
        }
      ]
    }
  },
  // Disable type checked rules for JavaScript files
  {
    files: ["**/*.{js,mjs}"],
    extends: [tseslint.configs.disableTypeChecked]
  }
);
