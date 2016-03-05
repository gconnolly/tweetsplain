"use strict"

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
let sessionAccessToken
let sessionAccessTokenSecret

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
  console.log('test')
  twitter.search(
      { q: '"' + req.body.text + '"' },
      sessionAccessToken,
      sessionAccessTokenSecret,
      (err, data, response) => {
        console.log(err)
        console.log(data)
        console.log(response)
      })

  res.end()
})

app.get('/oauth', (req, res) => {
  sessionAccessToken = req.query.oauth_token
  sessionAccessTokenSecret = req.query.oauth_verifier
  res.end()
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))