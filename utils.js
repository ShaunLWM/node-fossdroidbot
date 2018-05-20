const markdown = require("markdown").markdown;
const cheerio = require('cheerio');

module.exports = {
    convertMarkdown: (body) => {
        let converted = markdown.toHTML(body);
        const $ = cheerio.load(converted);
        $('blockquote').remove();
        $('a').remove();
        return $.text().trim();
    }
}