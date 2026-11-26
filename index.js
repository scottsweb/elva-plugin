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

import { autoImportFilters, autoImportPlugins, autoImportTransforms, autoImportShortcodes } from './elva/utils/autoimport.js';
import pluginEmbedEverythingConfig from './elva/config/embeds.js';
import pluginImageTransformConfig from './elva/config/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadDataFile(filename) {
	const filepath = join(process.cwd(), 'content', '_data', filename);
	if (!fs.existsSync(filepath)) return {};
	return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

export default function elva() {
	return async function (eleventyConfig) {

		// Global Settings --------------------------------

		const settings = eleventyConfig.globalData?.settings;
		
		if (!settings) {
			throw new Error('globalData.settings not found. Add eleventyConfig.addGlobalData("settings", {...}) to your .eleventy.js');
		}

		// ensure year is always in settings
		eleventyConfig.addGlobalData('settings', {
			...(settings || {}),
			year: new Date().getFullYear()
		});

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

		const locales = await loadDataFile('locales.json');
		const collections = await loadDataFile('types.json');
		const defaultLanguage = Object.keys(locales).find((key) => locales[key].default);
		const enabledTemplates = settings.templates || ['robots', 'sitemap', 'manifest', 'blogroll', 'search', 'feed'];
		const enabledPlugins = settings.plugins || ['rss', 'render', 'anchors', 'syntaxhighlight', 'embeds'];

		const hasGlobalFeed = '_rss' in eleventyConfig.collections;

		const isTemplateEnabled = (name) => enabledTemplates.includes(name);
		const isPluginEnabled = (name) => enabledPlugins.includes(name);

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
		const feedXmlTemplate = resolveTemplate('feed.xml.njk');
		const feedJsonTemplate = resolveTemplate('feed.json.njk');

		if (isTemplateEnabled('robots')) {
			eleventyConfig.addTemplate('robots.njk', robotsTemplate);
		}

		if (isTemplateEnabled('sitemap') && Object.keys(locales).length > 1) {
			eleventyConfig.addTemplate('sitemap-index.njk', sitemapIndexTemplate);
		}

		for (let [key] of Object.entries(locales)) {
			if (isTemplateEnabled('sitemap')) {
				eleventyConfig.addTemplate(key + '-sitemap.njk', sitemapTemplate, { lang: key });
			}
			if (isTemplateEnabled('manifest')) {
				eleventyConfig.addTemplate(key + '-manifest.njk', manifestTemplate, { lang: key });
			}
			if (isTemplateEnabled('blogroll')) {
				eleventyConfig.addTemplate(key + '-blogroll.xml.njk', blogrollXMLTemplate, { lang: key });
			}
			if (isTemplateEnabled('search')) {
				eleventyConfig.addTemplate(key + '-search-api.json.njk', searchApiTemplate, { lang: key, collection: '_search' });
			}
			if (isTemplateEnabled('feed')) {
				eleventyConfig.addTemplate(key + '-feed.xsl.njk', feedXslTemplate, { lang: key });
			}

			if (isTemplateEnabled('feed')) {
				for (let [collectionName, config] of Object.entries(collections)) {
					if (!config.feed) continue;

					const feedSlug = hasGlobalFeed ? collectionName : (collectionName === 'posts' ? 'feed' : collectionName);
					
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

				if (hasGlobalFeed) {
					eleventyConfig.addTemplate(key + 'feed.xml.njk', feedXmlTemplate, {
						lang: key,
						collectionName: 'rss',
						collectionTag: '_rss',
						feedSlug: 'feed'
					});
					eleventyConfig.addTemplate(key + 'feed.json.njk', feedJsonTemplate, {
						lang: key,
						collectionName: 'rss',
						collectionTag: '_rss',
						feedSlug: 'feed'
					});
				}
			}
		}

		// Plugins ----------------------------------------

		// core plugins
		eleventyConfig.addPlugin(HtmlBasePlugin);
		eleventyConfig.addPlugin(I18nPlugin, { defaultLanguage, errorMode: 'never' });
		eleventyConfig.addPlugin(eleventyImageTransformPlugin, pluginImageTransformConfig(eleventyConfig, settings));
		eleventyConfig.addPlugin(eleventyNavigationPlugin);

		// optional plugins (configurable via settings.plugins)
		await autoImportPlugins(eleventyConfig);
		if (isPluginEnabled('rss')) await eleventyConfig.addPlugin(pluginRSS);
		if (isPluginEnabled('render')) eleventyConfig.addPlugin(RenderPlugin);
		if (isPluginEnabled('anchors')) eleventyConfig.addPlugin(IdAttributePlugin);
		if (isPluginEnabled('syntaxhighlight')) eleventyConfig.addPlugin(pluginSyntaxHighlight);
		if (isPluginEnabled('embeds')) eleventyConfig.addPlugin(pluginEmbedEverything, pluginEmbedEverythingConfig(settings));

		// Transforms -------------------------------------

		await autoImportTransforms(eleventyConfig);

		// Shortcodes -------------------------------------

		await autoImportShortcodes(eleventyConfig);
		eleventyConfig.addShortcode('version', () => `${+new Date()}`);
		eleventyConfig.addShortcode('year', () => `${eleventyConfig.globalData.settings.year}`);
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
				includeLevel: settings.toc || [2, 3]
			});
		});

		// Log ----------------------------------------

		eleventyConfig.logger.message(`Theme: ${settings.theme}`);
	};
}
