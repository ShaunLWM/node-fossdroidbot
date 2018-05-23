const colors = require("chalk");
const moment = require("moment");

function timestamp() {
    const format = "YYYY-MM-DD HH:mm:ss";
    const tz = "UTC+00:00";
    const time = moment().utcOffset(tz).format(format);
    return colors.dim(time);
}

module.exports = {
    error(...args) {
        console.error(timestamp(), colors.red("[ERROR]"), ...args);
    },
    warn(...args) {
        console.error(timestamp(), colors.yellow("[WARN]"), ...args);
    },
    info(...args) {
        console.log(timestamp(), colors.blue("[INFO]"), ...args);
    },
    debug(...args) {
        console.log(timestamp(), colors.green("[DEBUG]"), ...args);
    },
    raw(...args) {
        console.log(...args);
    }
};