#!/usr/bin/env node

var express = require('express')  
var app = express(),
    bodyParser = require('body-parser'),
    path = require('path')

const port = 3000

var io = require('socket.io-client')

var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('power.db', function(data) { 
    console.log("Opened local database")
});

// Keys for your Loop device
// You can get these by logging into your-loop.com, opening your browser's terminal, and typing in 
// Drupal.settings.navetas_realtime
var elec_serial = process.env.ELEC_SERIAL
var elec_secret = process.env.ELEC_SECRET

var totalEnergy = 0
var lastTimestamp = 0

//support parsing of application/json type post data
app.use(bodyParser.json())

// Connect to Loop (need version 0.9.16, newer versions incompatible with their server)
var socket = io.connect('https://www.your-loop.com', {reconnect: true})

socket.on('connect', function(){

  console.log("Connected to Loop")

  // Subscribe to electricity readings in watts
  socket.emit("subscribe_electric_realtime", {
    serial: elec_serial,
    clientIp: '127.0.0.1',
    secret: elec_secret
  })

  // Subscribe to gas readings
  // socket.emit("subscribe_gas_interval", {
  //   serial: gas_serial,
  //   clientIp: '127.0.0.1',
  //   secret: gas_secret
  // });

  db.exec("CREATE TABLE IF NOT EXISTS energy (serial TEXT, power INTERGER, totalEnergy REAL, timeStamp INTEGER)")

  db.get("SELECT totalEnergy, timeStamp FROM energy WHERE serial = ?", elec_serial.replace(/^0+/, ''), function(err, row) {
      
      if (row == null) {
        db.run("INSERT INTO energy (serial, totalEnergy, power, timeStamp) VALUES (?,?,?,?)", [elec_serial.replace(/^0+/, ''), 0, 0, 0], function(err) {
          console.log("Initialised energy db")
        })
      }
      else
      {
        console.log("Starting with totalEnergy %j kWh", row.totalEnergy)
      }
  })

})

// Output electricity readings (~1 per 10 seconds)
socket.on('electric_realtime', function(data) { 
    // console.log("Got new data: %j", data)

    db.get("SELECT totalEnergy, timeStamp FROM energy WHERE serial = ?", elec_serial.replace(/^0+/, ''), function(err, row) {

        var periodEnergy = data.inst/1000 * (data.deviceTimestamp - row.timeStamp)/3600

        // console.log("Got totalEnergy %j", row.totalEnergy)
        // console.log("Got periodEnergy %j", periodEnergy)

        totalEnergy = row.totalEnergy + periodEnergy
        // console.log("New totalEnergy %j", totalEnergy)

        var params = [totalEnergy, data.inst, data.deviceTimestamp, data.serial.replace(/^0+/, '')]

        db.run("UPDATE energy SET totalEnergy = ?, power = ?, timeStamp = ? WHERE serial = ?", params, function(err) {
            // console.log("Updated energy db, params", params);
        })

    })

})

socket.on('disconnect', function(){ 
    console.log("Disconnected from Loop")
})


app.get('/', (req, res) => {

    db.get("SELECT serial, totalEnergy, power, timeStamp FROM energy WHERE serial = ?", elec_serial.replace(/^0+/, ''), function(err, row) {

        var q = {   "serial": row.serial,
                    "data": { "latestData": new Date(row.timeStamp * 1000), "power": row.power, "totalEnergy": round(row.totalEnergy,0) }
        }

        res.json([q]);
    })
})

app.post('/', function (req, res) {

    var timeStamp = Math.floor(Date.now() / 1000)

    var params = [req.body.totalEnergy, req.body.serial.replace(/^0+/, '')]

    db.run("UPDATE energy SET totalEnergy = ?, power = 0 WHERE serial = ?", params, function() {
        console.log("Updated energy db, params", params);
    })

})

app.listen(process.env.PORT || port, (err) => {  
  if (err) {
    return console.log('Something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})


function getMean(values) {
    var sum = 0;
    for( var i = 0; i < values.length; i++ ){
        sum += parseInt( values[i], 10 ); //don't forget to add the base
    }

    return sum / values.length;
}

function getMedian(values) {
    values.sort( function(a,b) {return a - b;} );

    var half = Math.floor(values.length/2);

    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;
}

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}
