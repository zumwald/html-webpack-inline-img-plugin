Inline img extension for the HTML Webpack Plugin
========================================
Forked and extended from [Guy Campbell](https://github.com/thegc)'s work on [html-webpack-inline-svg-plugin](https://github.com/theGC/html-webpack-inline-svg-plugin).

Allows you to inline SVGs or PNGs that are parsed by [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin).

The plugin relies on [svgo](https://github.com/svg/svgo) to optimise SVGs. You can configure it's settings, check below for more details.

Installation
------------
Install the plugin with npm:
```shell
$ npm install --save-dev @zumwald/html-webpack-inline-img-plugin
```

**or** [yarn](https://yarnpkg.com/):
```shell
$ yarn add @zumwald/html-webpack-inline-img-plugin --dev
```

Usage
-----------
Require the plugin in your webpack config:

```javascript
const HtmlWebpackInlineImgPlugin = require('@zumwald/html-webpack-inline-img-plugin');
```

Add the plugin to your webpack config as follows:

```javascript
plugins: [
    new HtmlWebpackPlugin(),
    new HtmlWebpackInlineImgPlugin()
]
```

Add `img` tags with `inline` attribute and `.svg` or `.png` file as src to your template/s that the html-webpack-plugin is processing (the default is `index.html`).

```html
<!-- Works: below img tag will be removed and replaced by the content of the svg in its src -->
<img inline src="static/icons.svg">

<!-- Also works: below img tag src field will be replaced with base64 encoded string-->
<img inline src="static/image.png">

<!-- Ignored: this img will not be touched as it has no inline attribute -->
<img src="static/foo.svg">
```

Getting to your SVGs
-----------

References to your `*.svg` or `*.png` files within the `img` tags src should be relative to your project root, this is usually the directory your `package.json` file sits in:

```
my-project
-- package.json
-- <node_modules>
-- <static>
---- icons.svg
---- foo.svg
---- ...
```

With the above structure inlining icons.svg would look like: `<img inline src="static/icons.svg">`

Config
-----------
To configure SVGO (module used to optimise your SVGs), add an `svgoConfig` object to your `html-webpack-plugin` config:

```javascript
plugins: [
    new HtmlWebpackPlugin({
        svgoConfig: {
            removeTitle: false,
            removeViewBox: true,
        },
    }),
    new HtmlWebpackInlineSVGPlugin()
]
```

For a full list of the SVGO config (default) params we are using check out: [svgo-config.js](svgo-config.js). The config you set is merged with our defaults, it does not replace it.

Known Issues
-----------

* none currently

