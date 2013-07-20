# mqtt-ws

## Class: mqttws.Bridge

The main bridge server. It is an `EventEmitter`.

### new mqttws.Bridge([options])

* `options` Object, contains:
    * `mqtt` Object, contains:
        * `host` String - hostname of MQTT server
        * `port` Number - port MQTT server is listening on (default 1833)
    * `websocket` Object - contains options for [WebSocket server](https://github.com/einaros/ws/blob/master/doc/ws.md#new-wsserveroptions-callback). The main one is:
        * `port` Number - the port to listen on for incoming WS connections
    * `log4js` Object - contains options for [log4js](https://github.com/nomiddlename/log4js-node#configuration)

Creates the bridge and begins listening on the port specified in `options->websocket`.

### Bridge.close()

Closes the bridge and terminates all clients

### Bridge.connectMqtt(options)

* `options` Object - contains the host, port and options to be passed to [mqtt](https://github.com/adamvr/MQTT.js/wiki/mqtt#mqttcreateclientport-host-options)

Connects to the MQTT server, and returns the MQTT client.

### Event: 'error'

`function (error) { }`

WebSocket server errors, forwarded from the `ws` package

### Event: 'connection'

`function (ws) { }`

Incoming WebSocket connection. `ws` is the WebSocket client.

### Event: 'close'

`function () { }`

Closing the WebSocket server

## Class: ws.WebSocket

WebSocket client class (see [here](https://github.com/einaros/ws/blob/master/doc/ws.md#class-wswebsocket))

### Event 'error'

`function (err) { }`

WebSocket client errors

### Event 'close'

`function () { }`

WebSocket client closing

### Event 'message'

`function (message) { }`

Incoming message over the WebSocket

## Class mqtt.MqttClient

MQTT Client class (see [here](https://github.com/adamvr/MQTT.js/wiki/client#mqttclient))

### Event 'error'

`function (err) { }`

MQTT error

### Event 'connect'

`function () { }`

MQTT client connected to server

### Event 'message'

`function (topic, message, packet) { }`

MQTT incoming message

* `topic` - message topic
* `message` - message payload
* `packet` - MQTT packet, containing:
    * `cmd` - MQTT command, e.g., 'publish'
    * `retain` - MQTT retain flag
    * `qos` - MQTT QOS for the message
    * `dup` - Dup flag
    * `length` - Message length
    * `topic` - Message topic
    * `payload` - Message payload

### Event 'close'

`function () { }`

MQTT client closed