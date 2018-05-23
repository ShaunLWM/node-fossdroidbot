module.exports = {
    account: {
        userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.36 Safari/535.7',
        clientId: '', // revoked. use your own
        clientSecret: '', // revoked. use your own
        refreshToken: '' // revoked. use your own
    },
    subreddits: ['test'],
    maxAppsPerComment: 10,
    maxAppsBodyFormula: "\n\nMaximum of 10 applications only",
    closingFormula: "\n\n---------------\n\n[^(Source Code)](https://github.com/ShaunLWM/node-fossdroidbot) ^(| A bot by) [^(shaunidiot)](https://www.reddit.com/u/shaunidiot)",
    logFile: "bot.log",
    botRunningFile: "botRunning",
    appsDatabaseFilename: "database.nosql",
    commentsDatabaseFilename: "comments.nosql",
    repositoryFilename: "repo.xml"
}