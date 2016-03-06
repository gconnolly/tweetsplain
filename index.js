/* globals process */
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
const storage = require('node-persist')

storage.initSync()

app.use(bodyParser.json())

app.post('/', (req, res) => {
  const twitterId = twitterParse(req.body.link).id
  const accessToken = storage.getItem('accessToken')
  const accessTokenSecret = storage.getItem('accessTokenSecret')

  console.log(accessToken)
  if (accessToken && accessTokenSecret) {
    twitter.search(
      {
        q: req.body.text,
        max_id: bigInt(twitterId).minus(1).toString()
      },
      accessToken,
      accessTokenSecret,
      (err, data, response) => {
        if(err) {
          console.log(err)
        }
        else if (data && data.statuses && data.statuses[0]) {
          twitter.statuses(
            'update',
            {
              status: 'ney' + data.statuses[0].id_str//'@horse_js @' + data.statuses[0].user.screen_name + ' https://twitter.com/' + data.statuses[0].user.screen_name + '/status/' + data.statuses[0].id_str,
              //in_reply_to_status_id: twitterId
            },
            accessToken,
            accessTokenSecret,
            function (error, data, response) {
              if (error) {
                console.log(error)
              }
            }
          )
        }
      })
  }
  res.end()
})

app.get('/authenticate', (req, res) => {
  twitter.getRequestToken(function (error, requestToken, requestTokenSecret, results) {
    if (error) {
      console.log('Error getting OAuth request token : ' + error)
    } else {
      storage.setItem('requestToken', requestToken)
      storage.setItem('requestTokenSecret', requestTokenSecret)

      res.redirect(twitter.getAuthUrl(requestToken))
    }
  })
})

app.get('/oauth', (req, res) => {
  const requestToken = storage.getItem('requestToken')
  const requestTokenSecret = storage.getItem('requestTokenSecret')

  twitter.getAccessToken(
    requestToken,
    requestTokenSecret,
    req.query.oauth_verifier,
    (error, accessToken, accessTokenSecret, results) => {
      if (error) {
        console.log(error)
      } else {
        storage.setItem('accessToken', accessToken)
        storage.setItem('accessTokenSecret', accessTokenSecret)

        twitter.verifyCredentials(
          accessToken,
          accessTokenSecret,
          {},
          (error, data, response) => {
            if (error) {
              console.log(error)
            } else {
              res.send(data['screen_name'])
            }
          })
      }
    })
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))
