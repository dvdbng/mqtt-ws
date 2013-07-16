/*!
 * mqttws: a node.js MQTT/WebSocket bridge
 * Copyright(c) 2013 M2M Connections, Inc <info@m2mconnectionsinc.com>
 * MIT Licensed
 */

var optimist = require('optimist'),
    myArgs = optimist
    .usage('MQTT/WebSocket Bridge\nUsage: $0')
    .alias({
        'p': 'port',
        'h': 'host',
        'l': 'listen',
        'c': 'configFile',
    })
    .describe({
        'p': 'MQTT port to connect to',
        'h': 'Hostname of MQTT server',
        'l': 'WebSocket port to listen on',
        'c': 'Configuration file',
        'help': 'Show this help'
    })
    .argv,
    errno = require('errno');

if (myArgs.help) {
    optimist.showHelp();
    process.exit(0);
}

var underscore = require('underscore');
var config = {
    "mqtt": {
        "host": "localhost",
        "port": 1883,
    },
    "websocket": {
        "port": 80
    }
};

// If we are given a config file, parse that,
// otherwise just parse command line
if (myArgs.c || myArgs.configFile) {
    var configFile = myArgs.c || myArgs.configFile;
    console.log("Reading configuration from %s", configFile);
    require('fs').readFile(configFile, 'utf8', function(err, data) {
        if (err) {
            console.log("Error reading config file %s: %s", configFile, err);
            process.exit(-1);
        }
        config = underscore.extend(config, JSON.parse(data));
        run(parseCommandLine(myArgs, config));
    });
} else {
    run(parseCommandLine(myArgs, config));
}

// Parse the command line
function parseCommandLine(args, config) {
    if (args.p || args.port) {
        config.mqtt.port = args.p || args.port;
    }
    if (args.h || args.host) {
        config.mqtt.host = args.h || args.host;
    }
    if (args.l || args.listen) {
        config.websocket.port = args.l || args.listen;
    }

    return config;
}

function getErrnoDescription(err) {
    if (!err.errno) return undefined;
    if (typeof err.errno == 'number') {
        var e = errno.errno[err.errno];
        if (e) {
            return e.description;
        } else {
            return undefined;
        }
    } else if (typeof err.errno == 'string') {
        for (var e in errno.errno) {
            if (errno.errno[e].code == err.code) {
                return errno.errno[e].description;
            }
        }
        return undefined;
    }
}

// Start the bridge
function run(config) {
    // Create our bridge
    console.log("Listening for incoming WebSocket connections on port %d",
        config.websocket.port);
    bridge = require('../lib/mqtt-ws').createBridge(config);

    // Set up error handling
    bridge.on('wserror', function(err, mqtt, ws) {
        if (err.syscall != undefined) {
            var description = getErrnoDescription(err) || err.code;
            console.error("WebSocket Error: %s", description);
        } else {
            console.error("Websocket error: %s", err);
        }
        if (ws) {
            ws.terminate();
        }
    });

    bridge.on('mqtterror', function(err, mqtt, ws) {
        if (err.syscall == 'connect') {
            var description = getErrnoDescription(err) || err.code;
            console.error("Error connecting to MQTT server at %s:%d: %s",
                mqtt.host, mqtt.port, description);
            mqtt.end();
        } else if (err.syscall) {
            var description = getErrnoDescription(err) || err.code;
            console.error("MQTT Error: %s", description);
            mqtt.end();
        } else {
            console.error("MQTT %s", err);
        }
    });

    // Handle incoming WS connection
    bridge.on('wsconnection', function(ws, mqtt) {
        // URL-decode the URL, and use the URI part as the subscription topic
        console.log("WebSocket connection from %s received", ws.connectString);
        mqtt.topic = decodeURIComponent(ws.upgradeReq.url.substring(1));
    });

    // Log our MQTT connection
    bridge.on('mqttconnection', function(mqtt, ws) {
        console.log("Connected to MQTT server at %s:%d", config.mqtt.host, config.mqtt.port);
        console.log("WebSocket client %s subscribing to '%s'", ws.connectString, mqtt.topic);
        mqtt.subscribe(mqtt.topic);
    });

    // Publish any WS messages on our topic. Note that if the topic is a wildcard,
    // nothing will be published, and no error raised
    bridge.on('wsmessage', function(message, ws, mqtt) {
        console.log("WebSocket client %s publishing '%s' to %s",
            ws.connectString, message, topics[ws]);
        mqtt.publish(mqtt.topic, message);
    });

    // Log the client closing connection, and delete from our topics list
    bridge.on('mqttclose', function(mqtt, ws) {
        console.log("MQTT connection for client %s closed",
            ws.connectString);
    });

    // Log the client closing connection, and delete from our topics list
    bridge.on('wsclose', function(mqtt, ws) {
        console.log("Websocket client %s closed", ws.connectString);
    });
};