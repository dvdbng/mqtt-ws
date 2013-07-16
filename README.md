# mqtt-ws
[MQTT](http://mqtt.org/)/[WebSocket](http://en.wikipedia.org/wiki/WebSocket) bridge. Runs as a WebSocket server and connects to an MQTT server. WebSocket clients subscribe to an MQTT topic by specifying the topic as part of the WebSocket URL, like so: `ws://localhost/topic`. For instance, if I wanted to subscribe to `/sensors/server_room/temperature`, and my bridge was running on host `bridgehost`, I would use the URL `ws://bridgehost/sensors/server_room/temperature`. The client would then begin receiving data on the topic through the connection, and could even publish by sending data on the WS connection.

You can also subscribe to wildcard topics the same way (URL encoded, of course), but you won't be able to publish on any wildcard topics.

This module uses Einar Stangvik's [ws](https://github.com/einaros/ws) module for the WebSocket side, and Adam Rudd's [mqtt.js](https://github.com/adamvr/MQTT.js) package for the MQTT side.

## Usage
    Usage: node mqttwsBridge.js

    Options:
      -p, --port        MQTT port to connect to      [default: 1883]
      -h, --host        Hostname of MQTT server      [default: "localhost"]
      -l, --listen      WebSocket port to listen on  [default: 80]
      -c, --configFile  Configuration file
      --help            Show this help

## Configuration File
If you specify a configuration file on the command line, it is expecting a JSON-formatted file that looks something like this:

    {
        "mqtt": {
            "host": "mqttHost",
            "port": 1883
        },
        "websocket": {
            "port": 8080
        }
    }

The `mqtt` section specifies the MQTT connection parameters - `host` and `port`, and the `websocket` section is configuration information passed to the `ws` module.