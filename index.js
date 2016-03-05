'use strict'

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
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

twitter.getRequestToken(function (error, requestToken, requestTokenSecret, results) {
  if (error) {
    console.log('Error getting OAuth request token : ' + error)
  } else {
    sessionRequestToken = requestToken
    sessionRequestTokenSecret = requestTokenSecret

    console.log(twitter.getAuthUrl(sessionRequestToken))
  }
})

app.use(bodyParser.json())

app.post('/', (req, res) => {
  twitter.search(
    { q: '"' + req.body.text + '"' },
    sessionRequestToken,
    sessionRequestTokenSecret,
    (err, data, response) => {
      console.log('error: ' + err)
      console.log('data: ' + data)
    })

  res.end()
})

app.get('/oauth', (req, res) => {
  twitter.getAccessToken(
    sessionRequestToken,
    sessionRequestTokenSecret,
    req.query.oauth_verifier,
    (error, accessToken, accessTokenSecret, results) => {
      if (error) {
        console.log(error)
      } else {
        sessionAccessToken = accessToken
        sessionAccessTokenSecret = accessTokenSecret
        twitter.verifyCredentials(
          sessionAccessToken,
          sessionAccessTokenSecret,
          {},
          (error, data, response) => {
            if (error) {
              console.log(error)
            } else {
              // accessToken and accessTokenSecret can now be used to make api-calls (not yet implemented)
              // data contains the user-data described in the official Twitter-API-docs
              // you could e.g. display his screen_name
              console.log(data['screen_name'])
            }
          })
      }
    })



  res.end()
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))
