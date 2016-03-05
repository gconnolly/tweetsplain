const express = require('express')
const app = express()

app.post('/', (req, res) => {
  console.log(req)
  res.end()
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))