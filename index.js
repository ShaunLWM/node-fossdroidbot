const fastXmlParser = require('fast-xml-parser');
const snoowrap = require('snoowrap');
const request = require('request');
const config = require('./config');
// const jsonObj = fastXmlParser.convertToJson(tObj, options);

const FDROID_REPO_XML = "https://f-droid.org/repo/index.xml";

const r = new snoowrap(config.account);

r.getSubreddit('overwatch').getHot().map(post => post.title).then(console.log);