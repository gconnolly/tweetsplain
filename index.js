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

// request-json
const request = require('request')

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
      console.log(twitterId)
      twitter.statuses(
        'show',
        {
          id: twitterId
        },
        access.token,
        access.tokenSecret,
        (error, tweet, showResponse) => {
          if (error) {
            console.log(error)
          } else {
            console.log(tweet.text)
            twitter.search(
              {
                q: tweet.text,
                max_id: bigInt(twitterId).minus(1).toString()
              },
              access.token,
              access.tokenSecret,
              (error, data, response) => {
                if (error) {
                  console.log(error)
                } else if (data && data.statuses) {
                  const sourceTweet = data.statuses[0].retweeted_status
                    ? data.statuses[0].retweeted_status
                    : data.statuses[0]

                  if (sourceTweet) {
                    console.log(sourceTweet.id_str)
                    console.log(sourceTweet.user.screen_name)
                    twitter.statuses(
                      'update',
                      {
                        status: '@' + req.body.username + ' @' + sourceTweet.user.screen_name + ' https://twitter.com/' + sourceTweet.user.screen_name + '/status/' + sourceTweet.id_str,
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
                  } else {
                    console.log('no matching tweet')
                    request(
                      {
                        uri: process.env.ALGOLIA_URL,
                        method: 'POST',
                        json: {
                          'params': 'query=' + encodeURIComponent(tweet.text)
                        }
                      },
                      (error, response, body) => {
                        if (error) {
                          console.log(error)
                        } else {
                          if (body && body.hits && body.hits[0]) {
                            console.log('@' + req.body.username + ' https://hn.algolia.com/?query=' + encodeURIComponent(tweet.text) + '&type=all ' + body.hits[0].story_url)

                            twitter.statuses(
                              'update',
                              {
                                status: '@' + req.body.username + ' https://hn.algolia.com/?query=' + encodeURIComponent(tweet.text) + '&type=all ' + body.hits[0].story_url,
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
                          } else {
                            console.log('no matching comment')
                          }
                        }
                      }
                    )
                  }
                }
              }
            )
          }
        }
      )
    }
  })
  res.end()
})

// request body:
// id
// text
// username
app.post('/test', (req, res) => {
  const twitterId = twitterParse(req.body.link).id
  client.hgetall('access', (error, access) => {
    if (error) {
      console.log(error)
      res.end()
    } else if (access) {
      console.log(twitterId)
      twitter.statuses(
        'show',
        {
          id: twitterId
        },
        access.token,
        access.tokenSecret,
        (error, tweet, showResponse) => {
          if (error) {
            console.log(error)
            res.end()
          } else {
            console.log(tweet.text)
            twitter.search(
              {
                q: tweet.text,
                max_id: bigInt(twitterId).minus(1).toString()
              },
              access.token,
              access.tokenSecret,
              (error, data, response) => {
                if (error) {
                  console.log(error)
                  res.end()
                } else if (data && data.statuses) {
                  console.log(data.statuses)
                  const sourceTweet = data.statuses[0].retweeted_status
                    ? data.statuses[0].retweeted_status
                    : data.statuses[0]

                  if (sourceTweet) {
                    console.log('@' + req.body.username + ' @' + sourceTweet.user.screen_name + ' https://twitter.com/' + sourceTweet.user.screen_name + '/status/' + sourceTweet.id_str)
                    res.send('@' + req.body.username + ' @' + sourceTweet.user.screen_name + ' https://twitter.com/' + sourceTweet.user.screen_name + '/status/' + sourceTweet.id_str)
                  } else {
                    console.log('no matching tweet')
                    request(
                      {
                        uri: process.env.ALGOLIA_URL,
                        method: 'POST',
                        json: {
                          'params': 'query=' + encodeURIComponent(tweet.text)
                        }
                      },
                      (error, response, body) => {
                        if (error) {
                          console.log(error)
                          res.end()
                        } else {
                          if (body && body.hits && body.hits[0]) {
                            console.log('@' + req.body.username + ' https://hn.algolia.com/?query=' + encodeURIComponent(tweet.text) + '&type=all ' + body.hits[0].story_url)
                            res.send('@' + req.body.username + ' https://hn.algolia.com/?query=' + encodeURIComponent(tweet.text) + '&type=all ' + body.hits[0].story_url)
                          } else {
                            console.log('no matching comment')
                            res.end()
                          }
                        }
                      }
                    )
                  }
                }
              }
            )
          }
        }
      )
    }
  })
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
