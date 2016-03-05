const express = require('express')
const app = express()
const bodyParser = require("body-parser")
const twitterParse = require('twitter-url-parser')
const twitterAPI = require('node-twitter-api')
const twitter = new twitterAPI({
	consumerKey: process.env.TWITTER_CONSUMER_KEY,
	consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
	callback: process.env.TWITTER_OAUTH_CALLBACK || 'http://localhost:8080/oauth'
})
let sessionRequestToken
let sessionRequestTokenSecret

twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
    if (error) {
        console.log("Error getting OAuth request token : " + error)
    } else {
        sessionRequestToken = requestToken
        sessionRequestTokenSecret = requestTokenSecret

        console.log(twitter.getAuthUrl(sessionRequestToken))
    }
});

app.use(bodyParser.json());

app.post('/', (req, res) => {
  console.log(twitterParse(req.body.link).id)
  res.end()
})

app.post('/oauth', (req, res) => {
  console.log(req)
  res.end()
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))