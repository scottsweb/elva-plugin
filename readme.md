![elva logo](https://scott.ee/images/elva.png)

# elva-plugin

- Status: ✅ Active (in testing)
- Contributors: [@scott](https://toot.scott.ee/@scott)
- Description: Shared configuration and CLI for [elva based 11ty themes](https://elva.scott.ee).
- Author: [Scott Evans](https://scott.ee)
- Author URI: [https://scott.ee](https://scott.ee)

## About

Sites built around the [elva starter theme](https://elva.scott.ee) for [Eleventy](https://www.11ty.dev) have some common configuration, libraries and tooling. This is the repository for those shared assets and it covers features like image processing, embeds, filters, plugins, virtual templates and a CLI.

### What's included

- **Image processing** — responsive images with `eleventy-img` (AVIF, WebP, SVG)
- **Embeds** — YouTube, Vimeo, Twitter, Instagram, TikTok, Spotify, etc via `eleventy-embed-everything`.
- **CSS/JS/HTML minification** — via LightningCSS, Terser, minify-html
- **Markdown extensions** — ins, mark, sub, sup, anchor, attrs, image-figures, TOC
- **Filters** — cdnify, dates, language, readingtime, shuffle, sortby, tagged, translate, where, and more
- **Virtual templates** — RSS feeds, JSON feeds, sitemaps, sitemap index, robots.txt, web manifest, search API, blogroll
- **Draft support** — drafts excluded in production
- **SEO descriptions** — auto-generated from page content
- **SVG shortcode** — inline SVGs with accessibility attributes
- **Navigation** — `eleventy-navigation` integration

## Install

```bash
npm install github:scottsweb/elva-plugin#1.0.0
```

## Usage

In your `.eleventy.js`:

```js
import elva from '@elva/plugin';
import settings from './content/_data/settings.json' with { type: 'json' };

export default async function (eleventyConfig) {
  eleventyConfig.addGlobalData('settings', {
    // these get merged with content/_data/settings.js
    url: process.env.URL || process.env.CF_PAGES_URL || 'http://localhost:8080',
    isProduction: process.env.NODE_ENV === 'production',
    isStaging:
      (process.env.URL && process.env.URL.includes('github.io')) ||
      (process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main') ||
      process.env.NODE_ENV === 'staging' ||
      false,
    theme: process.env.ELVA_THEME || settings.theme
  });

  await eleventyConfig.addPlugin(elva());

  // theme-specific stuff...

  return {
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',

    // if your site deploys to a subdirectory, change `pathPrefix`
    pathPrefix: '/',

    dir: {
      input: 'content',
      output: 'dist',
      data: '_data',
      includes: `../themes/${eleventyConfig.globalData.settings.theme}/_includes`,
      layouts: `../themes/${eleventyConfig.globalData.settings.theme}/_layouts`
    }
  };
}
```

## Settings

All configuration lives in your child project's `content/_data/settings.json`. The plugin is called with no arguments:

```js
await eleventyConfig.addPlugin(elva());
```

Your `content/_data/settings.json` contains all static configuration:

```json
{
  "theme": "default",
  "cdn": false,
  "tocLevels": [2, 3],
  "templates": ["robots", "sitemap", "manifest", "blogroll", "search", "feed"],
  "plugins": ["rss", "render", "anchors", "syntaxhighlight", "embeds"],
  "images": {
    "widths": [300, 600, 1200, 2400, "auto"],
    "formats": ["avif", "webp", "svg", "auto"]
  },
  "embeds": {
    "use": [
      "twitter",
      "youtube",
      "vimeo",
      "instagram",
      "tiktok",
      "openstreetmap",
      "ted",
      "soundcloud",
      "spotify"
    ]
  }
}
```

### Templates

Control which virtual templates the plugin generates. The default is to have all enabled (as above), or you can omit `templates` entirely for the same result. To refine your build, opt-in to specific templates:

```json
{
  "templates": ["sitemap", "manifest", "feed"]
}
```

This disables `robots`, `blogroll`, and the `search` API.

### Plugins

Control which optional plugins are loaded. The default is for all optional plugins to be enabled (as above), or you can omit `plugins` entirely for the same result. To refine your build, opt-in to specific plugins:

```json
{
  "plugins": ["rss", "render", "anchors", "syntaxhighlight"]
}
```

This disables `embeds`. Four plugins are always enabled: `htmlbase`, `i18n`, `images`, and `navigation`.

## Local Overrides

Drop files into an `elva/` folder in your child project to override the plugin's defaults:

```
<project>/
├── elva/
│   ├── filters/
│   │   └── wherearr.js      # overrides elva-plugin's filter
│   └── templates/
│       └── sitemap.njk      # overrides elva-plugin's virtual template
├── content/
└── themes/
```

The plugin checks `<project>/elva/` first for filters, plugins, templates, shortcodes, and transforms — falling back to its own versions if no override exists. This lets you customize individual files without forking the entire plugin. You can also define new filters, plugins, templates, shortcodes and transforms in the same folders and they will be auto-loaded for you.

### Watching virtual templates

11ty doesn't watch virtual templates (templates registered via `addTemplate`). If you override plugin templates in your `elva/templates/` folder and want hot-reload, add:

```js
eleventyConfig.addWatchTarget('./elva/templates/*', { resetConfig: true });
```

## Feeds

By default elva generates RSS and JSON feeds for any collection with `feed: true` in your collections data file (`content/_data/types.json`). If you register an `_rss` collection in your `.eleventy.js`, you can also create a global feed across all collections:

```js
import collections from './content/_data/types.json' with { type: 'json' };

const feedCollections = Object.keys(collections)
  .filter((name) => collections[name].feed)
  .map((name) => `_${name}`);

eleventyConfig.addCollection('_rss', (collectionApi) =>
  collectionApi
    .getAll()
    .filter((item) =>
      item.data.tags?.some((tag) => feedCollections.includes(tag))
    )
    .sort((a, b) => a.date - b.date)
);
```

This will generate:

- `/feed/feed.xml` / `/feed/feed.json` — global feed from `_rss` (all collections combined, or a set of collections you choose)
- `/feed/posts.xml` / `/feed/posts.json` — posts collection
- `/feed/projects.xml` / `/feed/projects.json` — projects collection

## CLI

You can use the CLI to manage languages and content directly from the command line. Start with `npx elva`. The CLI defaults to an interactive menu, but you can also use shortcuts for common tasks.

### Command Shortcuts

#### Setup Commands

- `npx elva setup site` - Setup the basic site settings for a new project
- `npx elva setup theme` - Choose the theme you wish to use
- `npx elva setup new-theme` - Create a new theme by duplicating the default theme
- `npx elva setup delete-default-content` - Delete all the default content that ships with elva

#### Language Commands

- `npx elva language add` - Add a new language
- `npx elva language remove` - Remove an existing language
- `npx elva language list` - List all languages
- `npx elva language default` - Change the default language

#### Content Commands

- `npx elva content add` - Add new content
- `npx elva content remove` - Remove existing content
- `npx elva content import` - Import content from WordPress etc
- `npx elva content regenerate` - Regenerate all open graph images

#### Blogroll Commands

- `npx elva blogroll list` - List all blogroll entries
- `npx elva blogroll add` - Add a new blogroll entry
- `npx elva blogroll remove` - Remove blogroll entries

#### Collections Commands

- `npx elva collections list` - List all collections
- `npx elva collections add` - Add a new collection
- `npx elva collections remove` - Remove a collection
- `npx elva collections edit` - Edit a collection
- `npx elva sync-collections` - Sync the `collection.11tydata.js` template to all collections

#### Translation Commands

- `npx elva translations add` - Add a new translation
- `npx elva translations remove` - Remove a translation
- `npx elva translations sync` - Sync missing keys from the default language to other locales

## To-do

- [ ] Handle global rss feeds vs individual collections - should be able to support a shared feed across all content types
- [ ] Ability to turn off badbots in robots? (might be covered by drop-in)
