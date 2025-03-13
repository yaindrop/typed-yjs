// @ts-check
import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // non-browser code rules
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    ignores: ['src/**/*'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // runner rules
  {
    files: ['runner/**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // disable type-checking rules for non-ts files
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    ...tseslint.configs.disableTypeChecked,
  },

  // prettier rules
  eslintConfigPrettier,
  prettierRecommended,
  {
    rules: {
      'prettier/prettier': 'warn',
    },
  },

  {
    ignores: ['.vscode', 'node_modules'],
  },
)
