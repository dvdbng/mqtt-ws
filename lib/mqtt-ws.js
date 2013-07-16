/*!
 * mqtt-ws: a node.js MQTT/WebSocket bridge
 * Copyright(c) 2013 M2M Connections, Inc <info@m2mconnectionsinc.com>
 * MIT Licensed
 */

var mqtt = require('mqtt'),
    WebSocketServer = require('ws').Server,
    events = require('events'),
    util = require('util');

var mqttws = exports.mqttws = function(options) {
    options.websocket.port = options.websocket.port || 80;
    options.mqtt.host = options.mqtt.host || 'localhost';
    options.mqtt.port = options.mqtt.port || 1883;

    var self = this;
    
    // Create Websocket Server
    var wss = new WebSocketServer(options.websocket);
    wss.on('error', function(err) {
        self.emit('wserror', err);
    });
    
    // On incoming WS connection, connect to MQTT and send messages
    // from MQTT to WS (depending on subscriptions)
    wss.on('connection', function(ws) {
        ws.connectString = util.format("%s:%d",
            ws.upgradeReq.connection.remoteAddress, ws.upgradeReq.connection.remotePort);
        var mqttClient = mqtt.createClient(options.mqtt.port, options.mqtt.host);

        // Note: Have to do this because the MQTT client blocks connection
        // errors, which we want to capture
        mqttClient.stream.on('error', mqttClient.emit.bind(mqttClient, 'error'));

        // Disable reconnection
        mqttClient._reconnect = function() {};

        // Set the host and port
        mqttClient.host = options.mqtt.host;
        mqttClient.port = options.mqtt.port;

        // Signal we've got a connection
        self.emit('wsconnection', ws, mqttClient);
        
        // Error handling
        mqttClient.on('error', function(err) {
            self.emit('mqtterror', err, mqttClient, ws);
        });
        ws.on('error', function(err) {
            self.emit('wserror', err, mqttClient, ws);
        });
        
        // On either side closing, close the other
        ws.on('close', function() {
            self.emit('wsclose', mqttClient, ws);
            if (mqttClient.connected) {
                mqttClient.end();
            }
        });

        mqttClient.on('close', function() {
            self.emit('mqttclose', mqttClient, ws);
            ws.terminate();
        });
        
        // When we get connected, handle the messages
        mqttClient.on('connect', function() {
            self.emit('mqttconnection', mqttClient, ws);
            // MQTT messages get sent through the WS connection
            mqttClient.on('message', function(topic, message) {
                self.emit('mqttmessage', topic, message, ws, mqttClient);
                ws.send(message, function(err) {
                    if (err) {
                        self.emit('wserror', err);
                    }
                });
            });

            // WS messages get handled by the caller, since
            // there might be some processing required
            ws.on('message', function(message) {
                self.emit('wsmessage', message, ws, mqttClient);
            });
        });
    });
    events.EventEmitter.call(this);
};

util.inherits(mqttws, events.EventEmitter);

exports.createBridge = function(options) {
    return new mqttws(options);
};