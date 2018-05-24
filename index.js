const RedditBot = require('./src/bot');
let bot = new RedditBot({
    dataFolder: `${__dirname}/data`,
    logFolder: `${__dirname}/logs`
});

bot.updateRepository(error => {
    if (error) {
        return console.log(error);
    }

    return bot.start();
});