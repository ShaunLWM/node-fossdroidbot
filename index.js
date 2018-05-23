const RedditBot = require('./bot');
RedditBot.updateRepository(error => {
    if (error) {
        return console.log(error);
    }

    RedditBot.start();
});