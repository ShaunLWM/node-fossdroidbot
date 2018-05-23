const RedditBot = require('./src/bot');
RedditBot.updateRepository(error => {
    if (error) {
        return console.log(error);
    }

    return RedditBot.start();
});