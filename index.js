const express = require('express')
const app = express()

app.post('/', (req, res) => {
  console.log(req)
})

app.listen(3000, () => console.log('listening 3000'))