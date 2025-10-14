import setemiojo from "@setemiojo/eslint-config";

export default setemiojo(
  {
    type: "app",
    typescript: true,
    formatters: true,
    stylistic: {
      indent: 2,
      semi: true,
      quotes: "double",
    },
    ignores: ["dist/**", "node_modules/**", "src/db/migrations/**", ".github/**", ".claude", "coverage/**"],
  },
  {
    rules: {
      "react-refresh/only-export-components": "off",
      "ts/no-redeclare": "off",
      "ts/consistent-type-definitions": ["error", "type"],
      "no-console": ["warn"],
      "antfu/no-top-level-await": ["off"],
      "node/prefer-global/process": ["off"],
      "node/no-process-env": ["error"],
      "perfectionist/sort-imports": [
        "error",
        {
          tsconfigRootDir: ".",
        },
      ],
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
          ignore: ["README.md", "CLAUDE.md"],
        },
      ],
    },
  },
);
