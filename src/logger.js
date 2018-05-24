const moment = require("moment");
var winston = require('winston');
require('winston-daily-rotate-file');

class Logger {
    constructor(dir) {
        this.logDirectory = dir;
        this.logger = new (winston.Logger)({
            level: 'silly',
            transports: [
                new (winston.transports.DailyRotateFile)({
                    filename: `${this.logDirectory}/application-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD-HH',
                    zippedArchive: false,
                    maxSize: '20m',
                    maxFiles: '14d'
                }),
                new (winston.transports.Console)({ colorize: true })
            ]
        });
    }

    timestamp() {
        const format = "YYYY-MM-DD HH:mm:ss";
        const tz = "UTC+00:00";
        const time = moment().utcOffset(tz).format(format);
        return time;
    }

    error(...args) {
        this.logger.error(this.timestamp(), ...args);
    }

    warn(...args) {
        this.logger.warn(this.timestamp(), ...args);
    }

    info(...args) {
        this.logger.info(this.timestamp(), ...args);
    }

    debug(...args) {
        this.logger.debug(this.timestamp(), ...args);
    }

    silly(...args) {
        this.logger.silly(this.timestamp(), ...args);
    }

    raw(...args) {
        this.logger.verbose(...args);
    }
}

module.exports = Logger;