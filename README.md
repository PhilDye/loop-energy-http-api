# Loop Energy Meter API HTTP Proxy

This is a *very* simple API for the [Loop Energy Saver](https://www.your-loop.com),
a realtime energy monitoring device.

There is no official API, but the dashboard uses a WebSocket service to display current
usage data. Inspired by [Loop Graphing](https://github.com/marcosscriven/loop), 
this simple Node server effectively proxies this data into a simple HTTP API.

Each `GET /` returns average usage data *since the last request* (as the underlying
WebSocket feeds data about every 10s, depending on usage). This is not very RESTful,
since each request 'resets' the counters, but for my usage (to be polled by the 
[SmartThings home automation](https://www.smartthings.com) platform), this suffices.

Both mean and median usage of the cumulative readings are returned; use whichever suits
your needs best.

## Deployment

Note the configuration needed, `elec_serial` and `elec_secret` - get these values
by logging into your-loop.com, opening your browser's console, and typing in 
`Drupal.settings.navetas_realtime` - the returned JSON object contains these values.

These values can then be set in environment (eg to run in Heroku), or set locally.

## ToDo

- Gas support
- More robust retry and restart

## Releases

### 1.0.0

Initial version

