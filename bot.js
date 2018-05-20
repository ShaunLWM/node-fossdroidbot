const fs = require('fs-extra');
const config = require('./config');
const snoowrap = require('snoowrap');
const utils = require('./utils');
const request = require('request');
const rp = require('request-promise');

const FDROID_REPO_XML = "https://f-droid.org/repo/index.xml";
const REPO_FILENAME = 'repo.xml';

class RedditBot {
    constructor() {
        this.repoFileDirectory = `${__dirname}/${REPO_FILENAME}`;
        this.repoFile = null;
        this.botRunningFile = `${__dirname}/${config.botRunningFile}`;
        this.reddit = new snoowrap(config.account);
        if (typeof this.reddit.getMe() == 'undefined') {
            console.error('Unable to get bot info..');
            return process.exit(1);
        }
    }

    updateRepository(callback) {
        if (!fs.pathExistsSync(this.repoFileDirectory) || ((parseInt(fs.statSync(__dirname + '/config.js').mtimeMs / 1000) + 86400) < Math.floor(new Date() / 1000))) {
            console.log('Downloading repository..');
            rp(FDROID_REPO_XML)
                .then(htmlString => {
                    fs.writeFileSync(this.repoFileDirectory, htmlString);
                    console.log('Downloaded repository..');
                    return callback();
                })
                .catch(error => {
                    return callback(error);
                });
        } else {
            console.log('Repository is up-to-date..');
            return callback();
        }
    }

    generateReply(apps) {
        let requestedApps = apps.split(',');
        requestedApps.forEach((app, index) => {

        });
    }

    stop() {
        console.log('Stopping bot..');
        if (fs.pathExistsSync(this.botRunningFile)) {
            console.log('Deleting lockfile..');
            fs.removeSync(this.botRunningFile);
        }

        process.exit(1);
    }

    start() {
        console.log('Starting bot..');
        if (fs.pathExistsSync(this.botRunningFile)) {
            console.warn('The bot is already running..');
            return this.stop();
        }

        fs.ensureFileSync(this.botRunningFile);
        console.debug('Bot logging in..');
        this.reddit.getSubreddit(config.subreddits.join('+')).getNewComments().map(comment => {
            let converted = utils.convertMarkdown(comment.body);
            var commentRegex = /foss[\s]*me[\s]*:[\s]*(.*?)(?:\.|;|$)/gim;
            var match = commentRegex.exec(converted);
            if (match != null) {
                console.log(match[1]);
            }
        }).then(() => {
            this.stop();
        });
    }
}

module.exports = new RedditBot();