'use strict'

const assert = require('assert')
const path = require('path')
const chalk = require('chalk')
const parse5 = require('parse5')
const _ = require('lodash')
const fs = require('fs')
const SVGO = require('svgo')
const svgoDefaultConfig = require(path.resolve(__dirname, 'svgo-config.js'))

// let $

let outputHtml

let userConfig = {};

function HtmlWebpackInlineSVGPlugin(options) {

    assert.equal(options, undefined, 'The HtmlWebpackInlineSVGPlugin does not accept any options')

}

HtmlWebpackInlineSVGPlugin.prototype.apply = function (compiler) {

    // Hook into the html-webpack-plugin processing
    compiler.plugin('compilation', (compilation) => {

        compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => {

            // build the custom config
            const configObj = Object.assign(svgoDefaultConfig,
                _.isObjectLike(htmlPluginData.plugin.options.svgoConfig) ?
                    htmlPluginData.plugin.options.svgoConfig :
                    {});

            // pass all objects to the config.plugins array
            userConfig.plugins = _.map(configObj, (value, key) => ({ [key]: value }));

            this.parseHtml(htmlPluginData.html)
                .then(document => this.replaceMatchingTags(document, [
                    {
                        tag: 'img',
                        src: /\.svg$/
                    },
                    {
                        tag: 'img',
                        src: /\.png$/
                    }
                ]))
                .then(document => {
                    let serializedDocument = parse5.serialize(document);
                    htmlPluginData.html = serializedDocument || htmlPluginData.html;
                    callback(null, htmlPluginData);
                })
                // TODO - bubble up errors appropriately instead of swallowing
                .catch(err => {
                    callback(null, htmlPluginData)
                });

        })

    })

}


/**
 * get a Document object from an html string
 * @param {string} htmlString
 * @returns {Promise<AST.Default.Document>}
 */
HtmlWebpackInlineSVGPlugin.prototype.parseHtml = function (htmlString) {
    const document = parse5.parse(htmlString);

    return Promise.resolve(document);
}

/**
 * iterate over a DocumentFragment and return only
 * the nodes which match the supplied descriptor
 * @param {AST.Default.Document} document
 * @param {Array<object>} descriptors
 * @returns {Promise<AST.Default.Document>}
 */
HtmlWebpackInlineSVGPlugin.prototype.replaceMatchingTags = function (document, descriptors) {

    let replaceTagsForChildren = documentNode => {
        if (documentNode && documentNode.childNodes && documentNode.childNodes.length) {
            return Promise.all(
                _.map(documentNode.childNodes, (node, index, nodeAndSiblings) => {

                    // for each child node, check if it matches our predicate and
                    // add it to result if it does
                    return Promise.all(
                        _.map(descriptors, d => {
                            if (d.tag === node.nodeName) {
                                if (_.every([
                                    attrs => _.some(attrs, a => a.name === 'inline'),
                                    attrs => _.some(attrs, a => a.name === 'src' && d.src.test(a.value))
                                ], validator => validator(node.attrs))) {
                                    return this.transformNode(node)
                                        .catch(() => {
                                            // if there isn't an asset, swallow the error
                                            return Promise.resolve();
                                        });
                                }
                            }
                            return Promise.resolve();
                        })
                    ).then(() => {
                        // recurse over any of the child's own children
                        if (node.childNodes && node.childNodes.length) {
                            return replaceTagsForChildren(node);
                        } else {
                            return Promise.resolve();
                        }
                    });

                })
            );
        } else {
            return Promise.resolve();
        }
    };

    return replaceTagsForChildren(document).then(() => document);
}

/**
 * get the HTML snippet to inline for an SVG reference
 * @param {string} svgPath
 * @returns {Promise<string>}
 */
HtmlWebpackInlineSVGPlugin.prototype.getHtmlFragmentForSvg = function (svgPath) {

    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(svgPath), 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            const svgo = new SVGO(userConfig);

            svgo.optimize(data, result => {
                if (result.error) {
                    return reject(result.error);
                }

                return resolve(result.data);
            });
        });
    });

}

/**
 * get the HTML snippet to inline for an SVG reference
 * @param {string} pngPath
 * @returns {Promise<string>}
 */
HtmlWebpackInlineSVGPlugin.prototype.getBase64SrcForPng = function (pngPath) {

    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(pngPath), {}, (err, data) => {
            if (err) {
                return reject(err);
            }

            return resolve(`data:image/png;base64,${new Buffer(data).toString('base64')}`);
        });
    });

}

/**
 * get the HTML snippet an inlined asset
 * @param {string} src
 * @returns {Promise<string>}
 */
HtmlWebpackInlineSVGPlugin.prototype.transformNode = function (node) {

    let src = _.find(node.attrs, a => a.name === 'src').value;

    if (/\.png$/i.test(src)) {
        return this.getBase64SrcForPng(src).then(srcString => {
            _.forEach(node.attrs, (n, i, attrs) => {
                if (n && n.name === 'src') {
                    attrs[i].value = srcString;
                }
            });
            Promise.resolve();
        });
    } else if (/\.svg$/i) {
        return this.getHtmlFragmentForSvg(src).then(fragment => {
            // Parses the html fragment in the context of the parsed <table> element.
            let fragmentNode = parse5.parseFragment(fragment);
            if (fragmentNode && fragmentNode.childNodes && fragmentNode.childNodes.length) {
                _.forEach(fragmentNode.childNodes, child => {
                    parse5.treeAdapters.default.insertBefore(node.parentNode, child, node);
                });
                parse5.treeAdapters.default.detachNode(node);
            }
            
            return Promise.resolve();
        }).catch(e => {
            return Promise.resolve();
        });
    } else {
        return Promise.reject();
    }

}

module.exports = HtmlWebpackInlineSVGPlugin
