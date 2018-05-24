const fs = require('fs-extra');
const config = require('./config');
const snoowrap = require('snoowrap');
const utils = require('./utils');
const request = require('request');
const rp = require('request-promise');
const parseString = require('xml2js').parseString;
const async = require('async');

const Logger = require('./logger');
const NoSQL = require('nosql');

const FDROID_REPO_XML = "https://f-droid.org/repo/index.xml";
const NO_APP_FOUND = 'no-app-found';
const NO_REPLY_FOUND = 'no-reply-found';

class RedditBot {
    constructor({ dataFolder, logFolder }) {
        this.dataFolder = dataFolder;
        this.logFolder = logFolder;
        this.logger = new Logger(this.logFolder);
        this.appDatabaseDirectory = `${dataFolder}/${config.appsDatabaseFilename}`;
        this.appsDatabase = NoSQL.load(this.appDatabaseDirectory);

        this.commentsDatabaseDirectory = `${dataFolder}/${config.commentsDatabaseFilename}`;
        this.commentsDatabase = NoSQL.load(this.commentsDatabaseDirectory);

        this.repoFileDirectory = `${this.dataFolder}/${config.repositoryFilename}`;
        this.repoFile = null;
        this.botRunningFile = `${this.dataFolder}/${config.botRunningFile}`;
        fs.ensureDirSync(this.dataFolder);
        fs.ensureDirSync(this.logFolder);
        this.reddit = new snoowrap(config.account);
        if (typeof this.reddit.getMe() == 'undefined') {
            this.logger.error('Unable to get bot info..');
            return process.exit(1);
        }
    }

    updateRepository(callback) {
        if (!fs.pathExistsSync(this.repoFileDirectory) || ((parseInt(fs.statSync(this.repoFileDirectory).mtimeMs / 1000) + 86400) < Math.floor(new Date() / 1000))) {
            fs.removeSync(this.repoFileDirectory);
            fs.removeSync(this.commentsDatabaseDirectory);
            this.logger.info('Downloading repository..');
            rp(FDROID_REPO_XML)
                .then(data => {
                    fs.writeFileSync(this.repoFileDirectory, data);
                    this.logger.info('Downloaded repository..');
                    parseString(fs.readFileSync(this.repoFileDirectory), (err, result) => {
                        this.repoFile = result.fdroid.application;
                        this.logger.info(`${this.repoFile.length} application loaded..`);
                        this.repoFile.forEach((app, index) => {
                            this.logger.debug(`Inserting ${index}`);
                            this.insertToDatabase(app);
                        });

                        return callback();
                    });
                })
                .catch(error => {
                    this.logger.error(error);
                    return callback(error);
                });
        } else {
            this.logger.info('Repository is up-to-date..');
            parseString(fs.readFileSync(this.repoFileDirectory), (err, result) => {
                this.repoFile = result.fdroid.application;
                this.logger.info(`${this.repoFile.length} application loaded..`);
                return callback();
            });
        }
    }

    generateReply(apps, callback) {
        let requestedApps = apps.split(',');
        let body = '';
        let isTooMany = false;
        if (requestedApps.length > config.maxAppsPerComment) {
            isTooMany = true;
            requestedApps = requestedApps.slice(0, config.maxAppsPerComment);
            this.logger.warn(`Too many apps request..`);
        }

        this.logger.info('Searching for apps in comments: ' + requestedApps);
        async.eachSeries(requestedApps, (appName, cb) => {
            this.logger.debug(`Searching for ${appName.trim()}`);
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
            if (isTooMany) {
                body += config.maxAppsBodyFormula;
            }

            body += config.closingFormula;
            return callback(error, body);
        });
    }

    findApp(appName) {
        let details = null;
        return new Promise((resolve, reject) => {
            this.appsDatabase.find().make(builder => {
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
            this.commentsDatabase.find().make(filter => {
                filter.where('id', '=', commentId);
                filter.callback((error, response) => {
                    if (error || response.length < 1) {
                        details = NO_REPLY_FOUND;
                        return resolve(NO_REPLY_FOUND);
                    }

                    details = response[0];
                    return resolve(response);
                });
            });
        });
    }

    addReplied(commentId) {
        this.commentsDatabase.insert({
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
        this.appsDatabase.insert({
            id: id[0],
            updated: lastupdated[0],
            name: name[0],
            summary: summary[0],
            version: marketversion[0],
            description: desc[0]
        }, true).where(id, id[0]);
    }

    stop() {
        this.logger.info('Stopping bot..');
        if (fs.pathExistsSync(this.botRunningFile)) {
            this.logger.info('Deleting lockfile..');
            fs.removeSync(this.botRunningFile);
        }

        process.exit(1);
    }

    start() {
        this.logger.info('Starting bot..');
        if (fs.pathExistsSync(this.botRunningFile)) {
            this.logger.error('The bot is already running..');
            return this.stop();
        }

        fs.ensureFileSync(this.botRunningFile);
        this.logger.debug('Bot logging in..');
        this.reddit.getSubreddit(config.subreddits.join('+')).getNewComments().filter(comment => {
            let converted = utils.convertMarkdown(comment.body);
            var commentRegex = /foss[\s]*me[\s]*:[\s]*(.*?)(?:\.|;|$)/gim;
            var match = commentRegex.exec(converted);
            return match != null;
        }).then(comments => {
            if (comments.length < 1) {
                this.logger.debug('No comments found.');
                return this.stop();
            }

            async.eachSeries(comments, (comment, callback) => {
                this.logger.silly(`Processing commentId ${comment.id}`);
                this.isReplied(comment.id).then(replied => {
                    if (replied != NO_REPLY_FOUND) {
                        this.logger.debug(`[${comment.id}]: Replied before.`);
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
                                this.logger.info(`[${comment.id}] Replied to comment ${comment.id}`);
                                this.addReplied(comment.id);
                                return callback();
                            }).catch(error => {
                                this.logger.error(`${comment.id} Error replying to comment ${comment.id} -> ${error}`);
                                return callback();
                            });
                        }, 2000);
                    });
                }).catch(error => {
                    this.logger.error(`[${comment.id}] Error: ${error}`);
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

module.exports = RedditBot;