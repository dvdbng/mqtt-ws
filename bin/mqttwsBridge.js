#!/usr/bin/env node

/*!
 * mqtt-ws: a node.js MQTT/WebSocket bridge
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
    url = require('url'),
    util = require('util'),
    errno = require('errno'),
    log4js = require('log4js'),
    logger = log4js.getLogger(),
    mqttws = require('../lib/mqtt-ws');

if (myArgs.help) {
    optimist.showHelp();
    process.exit(0);
}

// If we are given a config file, parse that,
// otherwise just parse command line
if (myArgs.c || myArgs.configFile) {
    var configFile = myArgs.c || myArgs.configFile;
    logger.info("Reading configuration from %s", configFile);
    require('fs').readFile(configFile, 'utf8', function(err, data) {
        if (err) {
            logger.info("Error reading config file %s: %s", configFile, err);
            process.exit(-1);
        }
        config = JSON.parse(data);
        run(parseCommandLine(myArgs, config));
    });
} else {
    run(parseCommandLine(myArgs, {mqtt: {}, websocket: {}}));
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
    var e;
    if (typeof err.errno == 'number') {
        e = errno.errno[err.errno];
        if (e) {
            return e.description;
        } else {
            return undefined;
        }
    } else if (typeof err.errno == 'string') {
        for (e in errno.errno) {
            if (errno.errno[e].code == err.code) {
                return errno.errno[e].description;
            }
        }
        return undefined;
    }
}

function logError(err, message) {
    if (err.syscall) {
        var description = getErrnoDescription(err) || err.code;
        logger.error("%s on %s: %s", message, err.syscall, description);
    } else {
        logger.error("%s: %s", message, err);
    }
}

// Start the bridge
function run(config) {
    if (config.log4js) {
        log4js.configure(config.log4js);
    }

    // Create our bridge
    bridge = mqttws.createBridge(config);
    logger.info("Listening for incoming WebSocket connections on port %d",
        bridge.port);

    // Set up error handling
    bridge.on('error', function(err) {
        logError(err, "WebSocket Error");
    });

    // Handle incoming WS connection
    bridge.on('connection', function(ws) {
        // URL-decode the URL, and use the URI part as the subscription topic
        logger.info("WebSocket connection from %s received", ws.connectString);

        var self = this;

        ws.on('error', function(err) {
            logError(err, util.format("WebSocket error in client %s", ws.connectString));
        });

        // Parse the URL
        var parsed = url.parse(ws.upgradeReq.url, true);
        // Connect to the MQTT server using the URL query as options
        var mqtt = bridge.connectMqtt(parsed.query);
        mqtt.topic = decodeURIComponent(parsed.pathname.substring(1));

        ws.on('close', function() {
            logger.info("WebSocket client %s closed", ws.connectString);
            mqtt.end();
        });

        ws.on('message', function(message) {
            message = new Buffer(message);
            var char = " ";
            var topic = "";
            var offset = 0;
            while(char != "|" && offset < message.length){
                topic += char;
                char = String.fromCharCode(message.readUInt16LE(offset));
                offset += 2;
            }
            topic = topic.substring(1);
            logger.info("WebSocket client %s publishing to %s", ws.connectString, topic);
            mqtt.publish(topic, message.slice(offset), mqtt.options);
        });

        mqtt.on('error', function(err) {
            logError(err, "MQTT error");
        });

        mqtt.on('connect', function() {
            logger.info("Connected to MQTT server at %s:%d", mqtt.host, mqtt.port);
            logger.info("WebSocket client %s subscribing to '%s'", ws.connectString, mqtt.topic);
            mqtt.subscribe(mqtt.topic);
        });

        mqtt.on('close', function() {
            logger.info("MQTT connection for client %s closed",
                ws.connectString);
            ws.terminate();
        });

        mqtt.on('message', function(topic, message, packet) {
            ws.send(Buffer.concat([new Buffer(topic + "|", "utf16le"), new Buffer(message)]), {binary: true, mask: true});
        });
    });
}

