const RedditBot = require('./bot');
/*RedditBot.findApp('open', () => {

});*/

RedditBot.updateRepository(error => {
    if (error) {
        return console.log(error);
    }

    RedditBot.start();
});