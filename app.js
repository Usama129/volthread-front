const express = require('express')
const http = require('http');

const app = express()

const PORT = process.env.PORT || 9090

app.use(express.static(__dirname + "/public"))

function ping(){
    console.log("Pinging at " + new Date())
    http.get('http://employees-sb.herokuapp.com/ping')
    http.get('http://musiqhq.herokuapp.com/ping') // another project of mine, needs to be kept alive
}

setInterval(ping, 20*60000) // ping heroku backend every 20 minutes to keep it from idling

app.listen(PORT, err => { console.log("Listening at " + PORT) })
