const RedditBot = require('./src/bot');
let bot = new RedditBot({
    dataFolder: __dirname
});

bot.updateRepository(error => {
    if (error) {
        return console.log(error);
    }

    return bot.start();
});