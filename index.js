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
const bigInt = require("big-integer")

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
    {
      q: req.body.text,
      max_id: bigInt(twitterParse(req.body.link).id).minus(1).toString()
    },
    sessionAccessToken,
    sessionAccessTokenSecret,
    (err, data, response) => {
      console.log(data)
      onsole.log(data.search_metadata.count)
      if (data.statuses[0]) {
        console.log(data.statuses[0])
        twitter.statuses(
          'update',
          {
            status: 'ney ' + data.statuses[0].id_str
          },
          sessionAccessToken,
          sessionAccessTokenSecret,
          function (error, data, response) {
            if (error) {
              console.log(error)
            }
          }
        )
      }
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
              console.log(data['screen_name'])
            }
          })
      }
    })

  res.end()
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))
