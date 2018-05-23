const moment = require("moment");
var winston = require('winston');
require('winston-daily-rotate-file');

var transport = new (winston.transports.DailyRotateFile)({
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '14d'
});

var logger = new (winston.Logger)({
    level: 'silly',
    transports: [
        transport,
        new (winston.transports.Console)({ colorize: true })
    ]
});

function timestamp() {
    const format = "YYYY-MM-DD HH:mm:ss";
    const tz = "UTC+00:00";
    const time = moment().utcOffset(tz).format(format);
    return time;
}

module.exports = {
    error(...args) {
        logger.error(timestamp(), ...args);
    },
    warn(...args) {
        logger.warn(timestamp(), ...args);
    },
    info(...args) {
        logger.info(timestamp(), ...args);
    },
    debug(...args) {
        logger.debug(timestamp(), ...args);
    },
    silly(...args) {
        logger.silly(timestamp(), ...args);
    },
    raw(...args) {
        logger.verbose(...args);
    }
};