// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';

export default defineConfig([
	globalIgnores(['dist/**', 'node_modules/**']),
	{
		files: ['**/*.{js,mjs,cjs}'],
		...js.configs.recommended
	},
	{
		files: ['**/*.{js,mjs,cjs}', '**/*.11tydata.js', 'cli/**/*.{js,mjs,cjs}', 'elva/**/*.{js,mjs,cjs}', 'index.js'],
		languageOptions: { globals: { ...globals.node } }
	}
]);
