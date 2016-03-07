/* globals process */
'use strict'

// other
const bigInt = require('big-integer')

// twitter api
const twitterParse = require('twitter-url-parser')
const twitterAPI = require('node-twitter-api')
const twitter = new twitterAPI({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callback: process.env.TWITTER_OAUTH_CALLBACK || 'http://localhost:8080/oauth'
})

// redis
const redis = require('redis')
const client = redis.createClient(process.env.REDIS_URL)

client.on('error', (error) => {
  console.log(error)
})

// express
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

app.use(bodyParser.json())

// request body:
// id
// text
// username
app.post('/', (req, res) => {
  const twitterId = twitterParse(req.body.link).id
  client.hgetall('access', (error, access) => {
    if (error) {
      console.log(error)
    } else if (access) {
      twitter.search(
        {
          q: req.body.text,
          max_id: bigInt(twitterId).minus(1).toString()
        },
        access.token,
        access.tokenSecret,
        (error, data, response) => {
          if (error) {
            console.log(error)
          }
          else if (data && data.statuses && data.statuses[0]) {
            twitter.statuses(
              'update',
              {
                status: '@' + req.body.username + ' @' + data.statuses[0].user.screen_name + ' https://twitter.com/' + data.statuses[0].user.screen_name + '/status/' + data.statuses[0].id_str,
                in_reply_to_status_id: twitterId
              },
              access.token,
              access.tokenSecret,
              (error, data, response) => {
                if (error) {
                  console.log(error)
                }
              }
            )
          }
        })
    }
  })
  res.end()
})

app.get('/authenticate', (req, res) => {
  twitter.getRequestToken((error, requestToken, requestTokenSecret, results) => {
    if (error) {
      console.log('Error getting OAuth request token : ' + error)
    } else {
      client.del('request')
      client.hmset('request', 'token', requestToken, 'tokenSecret', requestTokenSecret, (error, result) => {
        if (error) {
          console.log(error)
        } else {
          res.redirect(twitter.getAuthUrl(requestToken))
        }
      })

    }
  })
})

app.get('/oauth', (req, res) => {
  client.hgetall('request', (error, request) => {
    if (error) {
      console.log(error)
    } else if (request) {
      twitter.getAccessToken(
        request.token,
        request.tokenSecret,
        req.query.oauth_verifier,
        (error, accessToken, accessTokenSecret, results) => {
          if (error) {
            console.log(error)
          } else {
            twitter.verifyCredentials(
              accessToken,
              accessTokenSecret,
              {},
              (error, data, response) => {
                if (error) {
                  console.log(error)
                } else {
                  client.del('access')
                  client.hmset('access', 'token', accessToken, 'tokenSecret', accessTokenSecret, (error, result) => {
                    if (error) {
                      console.log(error)
                    } else {
                      res.send(data['screen_name'])
                    }
                  })
                }
              })
          }
        })
    }
  })
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))
