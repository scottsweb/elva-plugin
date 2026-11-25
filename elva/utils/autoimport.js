import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveFiles(type) {
	const pluginBase = path.join(__dirname, '..', type);
	const projectBase = path.join(process.cwd(), 'elva', type);

	const projectFiles = fs.existsSync(projectBase)
		? fs.readdirSync(projectBase).filter((f) => f.endsWith('.js'))
		: [];
	const pluginFiles = fs.existsSync(pluginBase)
		? fs.readdirSync(pluginBase).filter((f) => f.endsWith('.js'))
		: [];

	const allFiles = [...new Set([...projectFiles, ...pluginFiles])];

	return { allFiles, projectFiles, pluginBase, projectBase };
}

export async function autoImport(eleventyConfig, type, register, { aliases = false } = {}) {
	const { allFiles, projectFiles, pluginBase, projectBase } = resolveFiles(type);

	for (const file of allFiles) {
		const exportName = file.replace('.js', '');
		const isProjectOverride = projectFiles.includes(file);
		const baseDir = isProjectOverride ? projectBase : pluginBase;
		const url = pathToFileURL(path.join(baseDir, file)).href;
		const module = await import(url);

		// register main export
		const fn = module[exportName];
		if (fn) register(fn, exportName);

		// register backward-compat aliases
		if (aliases) {
			for (const [name, aliasFn] of Object.entries(module)) {
				if (name !== exportName && typeof aliasFn === 'function') {
					register(aliasFn, name);
				}
			}
		}
	}
}

export async function autoImportFilters(eleventyConfig) {
	await autoImport(
		eleventyConfig,
		'filters',
		(fn, name) => {
			eleventyConfig.addFilter(name, fn);
		},
		{ aliases: true }
	);
}

export async function autoImportPlugins(eleventyConfig) {
	await autoImport(
		eleventyConfig,
		'plugins',
		(fn) => {
			eleventyConfig.addPlugin(fn);
		},
		{ aliases: false }
	);
}

export async function autoImportTransforms(eleventyConfig) {
	await autoImport(
		eleventyConfig,
		'transforms',
		(fn, name) => {
			eleventyConfig.addTransform(name, fn);
		},
		{ aliases: false }
	);
}

export async function autoImportShortcodes(eleventyConfig) {
	await autoImport(
		eleventyConfig,
		'shortcodes',
		(fn, name) => {
			eleventyConfig.addShortcode(name, fn);
		},
		{ aliases: false }
	);
}
