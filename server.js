

var express = require('express')  
var app = express()  
const port = 3000

var io = require('socket.io-client');

// Keys for your Loop device
// You can get these by logging into your-loop.com, opening your browser's terminal, and typing in 
// Drupal.settings.navetas_realtime
var elec_serial = process.env.ELEC_SERIAL; 
var elec_secret = process.env.ELEC_SECRET;


var intervalW = [];
var intervalStart = 0;
var intervalEnd = 0;

// Connect to Loop (need version 0.9.16, newer versions incompatible with their server)
var socket = io.connect('https://www.your-loop.com', {reconnect: true});

socket.on('connect', function(){

    console.log("Connected to Loop");

  // Subscribe to electricity readings in watts
  socket.emit("subscribe_electric_realtime", {
    serial: elec_serial,
    clientIp: '127.0.0.1',
    secret: elec_secret
  });

  // Subscribe to gas readings
  // socket.emit("subscribe_gas_interval", {
  //   serial: gas_serial,
  //   clientIp: '127.0.0.1',
  //   secret: gas_secret
  // });
});

// Output electricity readings (~1 per 10 seconds)
socket.on('electric_realtime', function(data) { 
    // if the first reading
    if (intervalStart === 0) { 
        intervalStart = data.deviceTimestamp;
        console.log("Started counters at ", intervalStart);
    };

    // else add the 'instanteous' usage reading (which is probably an average since the last anyway) to a running total
    intervalW.push(data.inst);
    intervalEnd = data.deviceTimestamp;

    console.log("Got new data: %j", data);
});

socket.on('disconnect', function(){ console.log("Disconnected from Loop")});


app.get('/', (req, res) => {



    var q = { "interval": intervalEnd - intervalStart, "meanW": getMean(intervalW), "medianW": getMedian(intervalW) };
    
    // reset the counters
    intervalW = [];
    intervalStart = 0;
    intervalEnd = 0;
    console.log("Reset counters");

    res.json(q);
});

app.listen(process.env.PORT || port, (err) => {  
  if (err) {
    return console.log('Something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
});



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

