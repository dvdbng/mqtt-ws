# mqtt-ws
[MQTT](http://mqtt.org/)/[WebSocket](http://en.wikipedia.org/wiki/WebSocket) bridge. Runs as a WebSocket server and connects to an MQTT server. WebSocket clients subscribe to an MQTT topic by specifying the topic as part of the WebSocket URL (see below). The client would then begin receiving data on the topic through the connection, and could even publish by sending data on the WS connection.

You can also subscribe to wildcard topics the same way (URL encoded, of course), but you won't be able to publish on any wildcard topics.

This module uses Einar Stangvik's [ws](https://github.com/einaros/ws) module for the WebSocket side, and Adam Rudd's [mqtt.js](https://github.com/adamvr/MQTT.js) module for the MQTT side.

## Rationale
The reason I wrote this was to allow browser-based clients to have access to information being published over MQTT. There are other solutions to this problem as well; for instance, there is currently a [Paho Javascript client](http://git.eclipse.org/c/paho/org.eclipse.paho.mqtt.javascript.git) which tunnels the MQTT protocol through a WebSocket. While tunneling will certainly work (once the MQTT servers all support it), it makes the browser code more complex, and it also means that if you decide to change to a different pub/sub protocol, you then have to change all of your browser code to match. Using a bridge, you could simply change the backend pub/sub mechanism (and, of course, the bridge), and all you would have to change in your browser code would be, possibly, the URL that they connect to. This adds a great deal of flexibility in your architecture.

## Installation
    $ npm install mqtt-ws

## mqttwsBridge
### Usage
    Usage: mqttwsBridge

    Options:
      -p, --port        MQTT port to connect to      [default: 1883]
      -h, --host        Hostname of MQTT server      [default: "localhost"]
      -l, --listen      WebSocket port to listen on  [default: 80]
      -c, --configFile  Configuration file
      --help            Show this help

### Configuration File
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

### Logging
Logging is done via [log4js](https://github.com/nomiddlename/log4js-node). Configuration for it may be added in the configuration file under key "log4js"; see the example in the `example` folder. By default, everything logs to the console.

### Connecting
To connect to the bridge and subscribe to an MQTT topic, connect using the URL `ws://`_host[:port]_`/`_topic_[`?`_options]_. For instance, if I have the bridge running on host `myHost`, and port 8080, and want to subscribe to topic `room1/temperature`, I would use the URL `ws://myHost:8080/room1/temperature`. I could then publish on that topic by simply sending data over the WebSocket connection.

You can also subscribe to [wildcard topics](http://www.eclipse.org/paho/files/mqttdoc/Cclient/wildcard.html). For instance, if I wanted to listen to all topics I could connect to the URL `ws://myHost:8080/%23` (_Note:_ the `#` has to be URL encoded).

### Messages

#### Receiving Messages
The websocket will receive just the message payload, unless it is subscribed to a wildcard topic, in which case it will receive the message in the form '_topic_: _payload_'.

#### Publishing Messages
Messages sent over the websocket connection will be published on the MQTT topic the websocket is subscribed to, unless it is a wildcard topic, in which case the message will be handled however the MQTT server handles such messages (in most cases, it will be dropped).

### Options
In addition to a topic, you can specify MQTT options as query parameters in the URL. There are two sets of options you can specify - connection options and publishing options. Both are passed to [MQTT.js](https://github.com/adamvr/MQTT.js/) whenever a connection is created or a message is published.

#### Connection Options
The connection options are:

* protocolId - String protocol ID
* protocolVersion - Integer between 0 and 255
* clean - Set to nonzero for a clean session, zero (the default) otherwise
* keepalive - Set to keepalive value, between 0 and 65535
* clientId - Set to the client ID, otherwise on is generated
* username - Set to the username for authentication
* password - Set to the password for authentication

#### Publishing Options
The publishing options are:

* qos - Quality of service value, either 0 (the default), 1 or 2
* retain - Set to true to retain the published value on the server, false (the default) not to

#### Example
For example, in the scenario above, to set up a connection subscribed to topic `foobar` with clientId `myClient`, username `foo`, password `myPassword`, and which always publishes with a QOS value of 1, use the URL:

    ws://myHost:8080/foobar?clientId=myClient&username=foo&password=myPassword&qos=1

## API
There is an [API](doc/mqtt-ws.md) as well, which will allow you to create your own bridge server.
