import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginImport from "eslint-plugin-import";

import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  prettierConfig,
  {
    plugins: {
      unicorn: eslintPluginUnicorn,
      import: eslintPluginImport
    },
    languageOptions: {
      globals: globals.builtin,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "max-lines": ["error", { max: 1000, skipComments: true, skipBlankLines: true }],
      "prefer-template": ["error"],
      curly: ["error"],
      camelcase: ["error"],
      "@typescript-eslint/no-require-imports": ["error"],
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
            caseInsensitive: true
          }
        }
      ],
      "no-duplicate-imports": ["error"],
      "no-shadow": ["off"],
      "@typescript-eslint/no-shadow": ["error"],
      "key-spacing": ["error"],
      "no-multiple-empty-lines": ["error"],
      "@typescript-eslint/no-floating-promises": ["error"],
      "no-return-await": ["error"],
      "dot-notation": ["error"],
      "no-bitwise": ["error"],
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
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase"
        }
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow"
        },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow"
        },
        {
          selector: "objectLiteralProperty",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow"
        },
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
  }
);
