const fs = require('fs-extra');
const config = require('./config');
const snoowrap = require('snoowrap');
const utils = require('./utils');
const request = require('request');
const rp = require('request-promise');
const parseString = require('xml2js').parseString;
const async = require('async');

const NoSQL = require('nosql');

const FDROID_REPO_XML = "https://f-droid.org/repo/index.xml";
const REPO_FILENAME = 'repo.xml';
const NO_APP_FOUND = 'no-app-found';
const NO_REPLY_FOUND = 'no-reply-found';

const DATABASE_APPS = './database.nosql';
const DATABASE_COMMENTS = './comments.nosql';

let db = NoSQL.load(DATABASE_APPS);
let commentDb = NoSQL.load(DATABASE_COMMENTS);

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
            fs.removeSync(this.repoFileDirectory);
            fs.removeSync(DATABASE_APPS);
            console.log('Downloading repository..');
            rp(FDROID_REPO_XML)
                .then(data => {
                    fs.writeFileSync(this.repoFileDirectory, data);
                    console.log('Downloaded repository..');
                    parseString(fs.readFileSync(this.repoFileDirectory), (err, result) => {
                        this.repoFile = result.fdroid.application;
                        console.log(`${this.repoFile.length} application loaded..`);
                        this.repoFile.forEach((app, index) => {
                            console.log(`Inserting ${index}`);
                            this.insertToDatabase(app);
                        });

                        return callback();
                    });
                })
                .catch(error => {
                    return callback(error);
                });
        } else {
            console.log('Repository is up-to-date..');
            parseString(fs.readFileSync(this.repoFileDirectory), (err, result) => {
                this.repoFile = result.fdroid.application;
                console.log(`${this.repoFile.length} application loaded..`);
                return callback();
            });
        }
    }

    generateReply(apps, callback) {
        let requestedApps = apps.split(',');
        let body = '';
        console.log('Searching for apps in comments: ' + requestedApps);
        async.eachSeries(requestedApps, (appName, cb) => {
            console.log(`Searching for ${appName.trim()}`);
            const data = this.findApp(appName.trim()).then(data => {
                if (data === NO_APP_FOUND) {
                    body += `No application found for "${appName.trim()}"\n\n`;
                    return cb();
                }

                if (requestedApps.length == 1) {
                    body = `[${data.name}](https://f-droid.org/en/packages/${data.id}/)\n\n> ${data.description}`;
                } else {
                    body += `[${data.name}](https://f-droid.org/en/packages/${data.id}/) - ${data.summary}\n\n`;
                }

                return cb();
            }).catch(error => {
                return cb();
            });
        }, error => {
            return callback(error, body);
        });
    }

    findApp(appName) {
        let details = null;
        return new Promise((resolve, reject) => {
            db.find().make(builder => {
                builder.filter((app) => app.name.toLowerCase().indexOf(appName.toLowerCase()) > -1);
                builder.callback((error, data) => {
                    if (error || data.length < 1) {
                        details = NO_APP_FOUND;
                        return resolve(NO_APP_FOUND);
                    }

                    details = data[0];
                    return resolve(details);
                });
            });
        });
    }

    isReplied(commentId, callback) {
        let details = null;
        return new Promise((resolve, reject) => {
            commentDb.find().make(filter => {
                filter.where('id', '=', commentId);
                filter.callback((error, response) => {
                    if (error || response.length < 1) {
                        details = NO_REPLY_FOUND;
                        return resolve(null, NO_REPLY_FOUND);
                    }

                    details = response[0];
                    return resolve(null, response);
                });
            });
        });
    }

    addReplied(commentId) {
        commentDb.insert({
            id: commentId,
        }, true).where('id', commentId);
    }

    insertToDatabase({
        id,
        lastupdated,
        name,
        summary,
        marketversion,
        desc
    }) {
        db.insert({
            id: id[0],
            updated: lastupdated[0],
            name: name[0],
            summary: summary[0],
            version: marketversion[0],
            description: desc[0]
        }, true).where(id, id[0]);
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
        this.reddit.getSubreddit(config.subreddits.join('+')).getNewComments().filter(comment => {
            let converted = utils.convertMarkdown(comment.body);
            var commentRegex = /foss[\s]*me[\s]*:[\s]*(.*?)(?:\.|;|$)/gim;
            var match = commentRegex.exec(converted);
            return match != null;
        }).then(comments => {
            async.eachSeries(comments, (comment, callback) => {
                this.isReplied(comment.id).then(replied => {
                    if (replied != NO_REPLY_FOUND) {
                        console.log(`[${comment.id}]: Replied before.`);
                        return callback();
                    }

                    let converted = utils.convertMarkdown(comment.body);
                    var commentRegex = /foss[\s]*me[\s]*:[\s]*(.*?)(?:\.|;|$)/gim;
                    var match = commentRegex.exec(converted);
                    if (match == null) {
                        return callback();
                    }

                    this.generateReply(match[1], (error, result) => {
                        if (error) {
                            return callback();
                        }

                        setTimeout(() => {
                            this.reddit.getComment(comment.id).reply(result).then(() => {
                                console.log(`[${comment.id}] Replied to comment ${comment.id}`);
                                this.addReplied(comment.id);
                                return callback();
                            }).catch(error => {
                                console.log(`${comment.id} Error replying to comment ${comment.id} -> ${error}`);
                                return callback();
                            });
                        }, 2000);
                    });
                }).catch(error => {
                    console.log(`[${comment.id}] Error: ${error}`);
                    return callback();
                });
            }, error => {
                setTimeout(() => {
                    this.stop();
                }, 3000);
            });
        });
    }
}

module.exports = new RedditBot();