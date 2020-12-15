const express = require('express')
const app = express()

const PORT = process.env.PORT || 9090

app.use(express.static(__dirname))

app.listen(PORT, err => { console.log("Listening at " + PORT) })
