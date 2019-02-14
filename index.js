/* globals process */
'use strict'

// other
const bigInt = require('big-integer')
const moment = require('moment')

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
  tweetsplain(req, res, true)
})

app.post('/test', (req, res) => {
  tweetsplain(req, res, false)
})

function tweetsplain (req, res, tweetTheResult) {
  const twitterId = twitterParse(req.body.link).id

  client.hgetall('access', (error, access) => {
    if (error) {
      console.log(error)
      res.end()
    } else if (access) {
      const findSource = new Promise((resolve, reject) => {
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
              reject(error)
            } else {
              console.log(tweet.text)
              var tweetText = tweet.text.replace('(', '%28').replace(')', '%29')
              if (tweetText[0] === '.') {
                tweetText = tweetText.slice(1)
              }
              twitter.search(
                {
                  q: '"' + tweetText + '"',
                  max_id: bigInt(twitterId).minus(1).toString()
                },
                access.token,
                access.tokenSecret,
                (error, data, response) => {
                  if (error) {
                    reject(error)
                  } else {
                    const sourceTweet = data && data.statuses && data.statuses[0]
                      ? data.statuses[0].retweeted_status
                        ? data.statuses[0].retweeted_status
                        : data.statuses[0]
                      : undefined

                    if (sourceTweet) {
                      resolve('@' + req.body.username + ' @' + sourceTweet.user.screen_name + ' https://twitter.com/' + sourceTweet.user.screen_name + '/status/' + sourceTweet.id_str)
                    } else {
                      console.log('no matching tweet')
                      request(
                        {
                          uri: process.env.ALGOLIA_URL,
                          method: 'POST',
                          json: {
                            'params': 'query=%22' + encodeURIComponent(tweet.text) + '%22&advancedSyntax=true&numericFilters=%5B%22created_at_i%3E1462366389.934%22%5D'
                          }
                        },
                        (error, response, body) => {
                          if (error) {
                            reject(error)
                          } else {
                            if (body && body.hits && body.hits[0]) {
                              resolve('@' + req.body.username + ' https://hn.algolia.com/?query=%22' + encodeURIComponent(tweet.text) + '%22&dateRange=pastMonth&type=all ' + body.hits[0].story_url)
                            } else {
                              console.log('no matching hn comment')
                              request(
                                {
                                  url: 'https://www.googleapis.com/customsearch/v1',
                                  method: 'GET',
                                  qs: {
                                    q: tweet.text,
                                    exactTerms: tweet.text,
                                    cx: process.env.GOOGLE_CUSTOM_ENGINE_ID,
                                    key: process.env.GOOGLE_API_KEY
                                  },
                                  json: true
                                },
                                (error, response, body) => {
                                  if (error) {
                                    reject(error)
                                  } else {
                                    if (body && body.items && body.items[0]) {
                                      resolve('@' + req.body.username + ' ' + body.items[0].link)
                                    } else {
                                      resolve()
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
                }
              )
            }
          }
        )
      })

      findSource
        .then((tweet) => {
          if (tweet && tweetTheResult) {
            twitter.statuses(
              'update',
              {
                status: tweet,
                in_reply_to_status_id: twitterId
              },
              access.token,
              access.tokenSecret,
              (error, data, response) => {
                if (error) {
                  console.log(error)
                  res.status(500).end()
                } else {
                  console.log(tweet)
                  res.send(tweet)
                }
              }
            )
          } else if (tweet) {
            console.log(tweet)
            res.send(tweet)
          } else {
            console.log('no matching tweet')
            res.send('no matching tweet')
          }
        })
        .catch((error) => {
          console.log(error)
          res.status(500).end()
        })
    }
  })
}

app.get('/authenticate', (req, res) => {
  twitter.getRequestToken((error, requestToken, requestTokenSecret, results) => {
    if (error) {
      console.log('Error getting OAuth request token : ' + JSON.stringify(error))
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

app.post('/gnip', function(req, res) {
  let tweetId = req.body.id;
  client.hgetall('access', (error, access) => {
    if (error) {
      console.log(error)
      res.end()
    } else if (access) {
      twitter.statuses(
        'show',
        {
          id: tweetId
        },
        access.token,
        access.tokenSecret,
        (error, tweet) => {
          if (error) {
            reject(error)
          } else {
            console.log(tweet)
            request({
              url: `https://gnip-api.twitter.com/search/fullarchive/accounts/${process.env.GNIP_ACCOUNT}/prod.json`,
              headers: {
                Authorization: `Basic ${process.env.GNIP_TOKEN}`
              },
              method: 'POST',
              json: true,
              body: {
                query: '"' + tweet.text + '"',
                toDate: moment(tweet.created_at).format('YYYYMMDDhhmm')
              }
            },
            (error, response, body) => {
              if (error) {
                reject(error)
              } else {
                if (body && body.results && body.results[0]) {
                  res.send('@' + body.results[0].user.screen_name + ' ' + `https://twitter.com/${body.results[0].user.screen_name}/status/${body.results[0].id_str}`)
                } else {
                  res.send('FAIL')
                }
              }
            })
          }
        }
      )
    }
  })




})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))
