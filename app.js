const express = require('express')
const http = require('http');

const app = express()

const PORT = process.env.PORT || 9090

app.use(express.static(__dirname))

let pingOptions = {
    host: 'https://volthread-spring-boot.herokuapp.com',
    path: '/ping'
}

function ping(){
    console.log("Pinging at " + new Date())
    http.request(pingOptions).end()
}

setInterval(ping, 20*60000) // ping heroku backend every 20 mins to keep it from idling

app.listen(PORT, err => { console.log("Listening at " + PORT) })
