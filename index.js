// Imports --------------------------------------------

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import fs from 'node:fs';
import { I18nPlugin, HtmlBasePlugin, RenderPlugin, IdAttributePlugin } from '@11ty/eleventy';
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img';
import eleventyNavigationPlugin from '@11ty/eleventy-navigation';
import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItImageFigures from 'markdown-it-image-figures';
import markdownItIns from 'markdown-it-ins';
import markdownItMark from 'markdown-it-mark';
import markdownItSub from 'markdown-it-sub';
import markdownItSup from 'markdown-it-sup';
import markdownItToc from 'markdown-it-table-of-contents';
import pluginEmbedEverything from 'eleventy-plugin-embed-everything';
import pluginRSS from '@11ty/eleventy-plugin-rss';
import pluginSyntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import slugify from '@sindresorhus/slugify';

// Local -----------------------------------------------

import { autoImportFilters, autoImportPlugins } from './elva/utils/autoimport.js';
import pluginEmbedEverythingConfig from './elva/config/embeds.js';
import pluginImageTransformConfig from './elva/config/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function elva(settings, options = {}) {
	return async function (eleventyConfig) {

		// Watch Targets ----------------------------------

		eleventyConfig.setUseGitIgnore(false);

		// Virtual Templates ------------------------------

		// development only open graph template
		if (process.env.ELEVENTY_RUN_MODE && process.env.ELEVENTY_RUN_MODE !== 'build') {
			const ogPreviewPath = resolve(`themes/${settings.theme}/_layouts/`, 'opengraph-preview.njk');
			if (fs.existsSync(ogPreviewPath)) {
				const ogPreviewTemplate = fs.readFileSync(ogPreviewPath, 'utf-8');
				eleventyConfig.addTemplate('opengraph-preview.njk', ogPreviewTemplate, {
					theme: settings.theme
				});
			}
		}

		const locales = options.locales || {};
		const collections = options.collections || {};

		const resolveTemplate = (name) => {
			const projectPath = join(process.cwd(), 'elva', 'templates', name);
			const pluginPath = join(__dirname, 'elva', 'templates', name);
			if (fs.existsSync(projectPath)) {
				return fs.readFileSync(projectPath, 'utf-8');
			}
			return fs.readFileSync(pluginPath, 'utf-8');
		};

		const robotsTemplate = resolveTemplate('robots.njk');
		const sitemapTemplate = resolveTemplate('sitemap.njk');
		const sitemapIndexTemplate = resolveTemplate('sitemap-index.njk');
		const manifestTemplate = resolveTemplate('manifest.njk');
		const blogrollXMLTemplate = resolveTemplate('blogroll.xml.njk');
		const searchApiTemplate = resolveTemplate('search.json.njk');
		const feedXslTemplate = resolveTemplate('feed.xsl.njk');

		eleventyConfig.addTemplate('robots.njk', robotsTemplate);

		if (Object.keys(locales).length > 1) {
			eleventyConfig.addTemplate('sitemap-index.njk', sitemapIndexTemplate);
		}

		for (let [key] of Object.entries(locales)) {
			eleventyConfig.addTemplate(key + '-sitemap.njk', sitemapTemplate, { lang: key });
			eleventyConfig.addTemplate(key + '-manifest.njk', manifestTemplate, { lang: key });
			eleventyConfig.addTemplate(key + '-blogroll.xml.njk', blogrollXMLTemplate, { lang: key });
			eleventyConfig.addTemplate(key + '-search-api.json.njk', searchApiTemplate, { lang: key, collection: '_search' });
			eleventyConfig.addTemplate(key + '-feed.xsl.njk', feedXslTemplate, { lang: key });

			for (let [collectionName, config] of Object.entries(collections)) {
				if (!config.feed) continue;

				const feedXmlTemplate = resolveTemplate('feed.xml.njk');
				const feedJsonTemplate = resolveTemplate('feed.json.njk');

				const feedSlug = collectionName === 'posts' ? 'feed' : collectionName;
				eleventyConfig.addTemplate(key + '-' + collectionName + '-feed.xml.njk', feedXmlTemplate, {
					lang: key,
					collectionName,
					collectionTag: `_${collectionName}`,
					label: config.label,
					feedSlug
				});
				eleventyConfig.addTemplate(key + '-' + collectionName + '-feed.json.njk', feedJsonTemplate, {
					lang: key,
					collectionName,
					collectionTag: `_${collectionName}`,
					label: config.label,
					feedSlug
				});
			}
		}

		// Plugins ----------------------------------------

		await autoImportPlugins(eleventyConfig);
		await eleventyConfig.addPlugin(pluginRSS);
		eleventyConfig.addPlugin(HtmlBasePlugin);
		eleventyConfig.addPlugin(RenderPlugin);
		eleventyConfig.addPlugin(I18nPlugin, { defaultLanguage: options.defaultLanguage, errorMode: 'never' });
		eleventyConfig.addPlugin(IdAttributePlugin);
		eleventyConfig.addPlugin(pluginSyntaxHighlight);
		eleventyConfig.addPlugin(pluginEmbedEverything, pluginEmbedEverythingConfig(settings));
		eleventyConfig.addPlugin(eleventyImageTransformPlugin, pluginImageTransformConfig(eleventyConfig, settings));
		eleventyConfig.addPlugin(eleventyNavigationPlugin);

		// Transforms -------------------------------------

		// await autoImportTransforms(eleventyConfig);

		// Shortcodes -------------------------------------

		// await autoImportShortcodes(eleventyConfig);
		eleventyConfig.addShortcode('version', () => `${+new Date()}`);
		eleventyConfig.addShortcode('year', () => `${settings.year || new Date().getFullYear()}`);
		eleventyConfig.addShortcode('build', () => `${new Date().toISOString().split('T')[0]}`);

		// Filters ----------------------------------------

		await autoImportFilters(eleventyConfig);

		// Markdown ----------------------------------------

		eleventyConfig.setLibrary(
			'md',
			markdownIt({
				html: true,
				linkify: true,
				typographer: true
			})
		);

		eleventyConfig.amendLibrary('md', (mdLib) => {
			mdLib.use(markdownItIns);
			mdLib.use(markdownItMark);
			mdLib.use(markdownItSub);
			mdLib.use(markdownItSup);
			mdLib.use(markdownItAnchor, { slugify });
			mdLib.use(markdownItAttrs);
			mdLib.use(markdownItImageFigures, { figcaption: true });
			mdLib.use(markdownItToc, {
				slugify,
				includeLevel: settings.tocLevels || [2, 3]
			});
		});

		// Log ----------------------------------------

		eleventyConfig.logger.message(`Theme: ${settings.theme}`);
	};
}
