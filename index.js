const express = require('express')
const app = express()
const bodyParser = require("body-parser")
const twitterParse = require('twitter-url-parser')

app.use(bodyParser.json());

app.post('/', (req, res) => {
  console.log(twitterParse(req.body.link).id)
  res.end()
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))