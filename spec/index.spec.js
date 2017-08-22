/* eslint-env jasmine */
var path = require('path')
var fs = require('fs')
var chalk = require('chalk')
var cheerio = require('cheerio')
var webpack = require('webpack')
var rm = require('rimraf')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var HtmlWebpackInlineSVGPlugin = require('../')

var OUTPUT_DIR = path.join(__dirname, '../dist')

rm(OUTPUT_DIR, (err) => {

    if (err) console.log(chalk.red(err))

})

describe('HtmlWebpackInlineSVGPlugin', function () {

    let $;
    let data;

    beforeEach(function (done) {

        webpack({
            entry: path.join(__dirname, 'fixtures', 'entry.js'),
            output: {
                path: OUTPUT_DIR,
            },
            plugins: [
                new HtmlWebpackPlugin({
                    template: path.join(__dirname, 'fixtures', 'index.html'),
                }),
                new HtmlWebpackPlugin({
                    filename: path.resolve(OUTPUT_DIR, 'partial.html'),
                    template: path.join(__dirname, 'fixtures', 'partial.html'),
                }),
                new HtmlWebpackInlineSVGPlugin(),
            ],
        }, function (err) {

            expect(err).toBeFalsy()

            let htmlFile = path.resolve(OUTPUT_DIR, 'index.html')
            
            fs.readFile(htmlFile, 'utf8', function (er, d) {
    
                expect(er).toBeFalsy()
    
                $ = cheerio.load(d)
                
                data = d
    
                done()
    
            })

        })

    })

    afterEach(function () {
        $ = undefined;
        data = undefined;
    })

    it('should not inline imgs without inline attribute', function () {

            expect($('img.leave-me').length).toBe(1)

    })

    it('should inline imgs with inline attribute', function () {

            expect($('svg#inline-me').length).toBe(1)

    })

    xit('should persist classes and other attributes when inlining', function () {

        let obj = $('svg#inline-me')[0]
        expect(obj.attribs.class).toBe('the-class-should-persist')
        expect(obj.attribs.someotherattrib).toBeTruthy()

    })

    it('should inline deep imgs with inline attribute', function () {

            expect($('svg#deep-inline-me').length).toBe(1)

    })

    it('should remove img tags with inline attribute', function () {

            expect($('#replace-me').length).toBe(0)

    })

    it('should not base64 inline images that are not png', function () {

        let obj = $('#not-a-png-or-svg');
        expect(obj.length).toBe(1)
        
        expect(obj[0].attribs.src).toBe('some/image.jpg')

    })

    it('should ignore inline images that are not png or svg', function () {

            expect($('#a-jpg').length).toBe(0)

    })

    it('should ignore img tags with PNG or SVG sources but no inline tag', function () {
        let notInlinePng = $('#not-inline-png');
        let notInlineSvg = $('#not-inline-svg');
        
        expect(notInlinePng.length).toBe(1);
        expect(notInlinePng[0].attribs.src).toBe('foo/bar.png');
        expect(notInlineSvg.length).toBe(1);
        expect(notInlineSvg[0].attribs.src).toBe('baz/bang.svg');
        
    })

    xit('do not html decode content', function () {

            $ = cheerio.load(data, {
                decodeEntities: false,
            })

            expect($('#do-not-decode').html())
                .toBe('<?= $foo->bar; ?>')

    })

    xit('do not touch broken tags', function () {

            var re1 = /should output broken tags<\/p>/gi;

            expect(data.match(re1))
                .not.toBe(null)

            var re2 = /<p>should output unclosed tags/gi;

            expect(data.match(re2))
                .not.toBe(null)

    })

    xit('allow partials to have broken tags', function (done) {

        let htmlFile = path.resolve(OUTPUT_DIR, 'partial.html')
        
        fs.readFile(htmlFile, 'utf8', function (er, d) {

            expect(er).toBeFalsy()

            const dataSquashed = d.replace(/\s/g,'')

            expect(dataSquashed.startsWith('<\/p><\/div>'))
                .toBe(true)

            done()

        })

    })

})
