const fs = require('fs-extra');
const config = require('./config');
const snoowrap = require('snoowrap');
const utils = require('./utils');
class RedditBot {
    constructor() {
        this.botRunningFile = `${__dirname}/${config.botRunningFile}`;
        this.reddit = new snoowrap(config.account);
        if (typeof this.reddit.getMe() == 'undefined') {
            console.error('Unable to get bot info..');
            return process.exit(1);
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
            // console.log(comment.body);
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