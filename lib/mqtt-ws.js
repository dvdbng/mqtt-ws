/*!
 * mqtt-ws: a node.js MQTT/WebSocket bridge
 * Copyright(c) 2013 M2M Connections, Inc <info@m2mconnectionsinc.com>
 * MIT Licensed
 */

var mqtt = require('mqtt'),
    WebSocketServer = require('ws').Server,
    events = require('events'),
    util = require('util'),
    https = require('https'),
    fs = require('fs'),
    underscore = require('underscore');

var defaultOptions = {
    mqtt: {
        host: "localhost",
        port: 1883,
    },
    websocket: {
        port: 80
    }
};

var Bridge = module.exports = function Bridge(options) {
    options = options || {mqtt: {}, websocket: {}};
    this.options = {};
    this.options.mqtt = underscore.extend(defaultOptions.mqtt, options.mqtt);
    this.options.websocket = underscore.extend(defaultOptions.websocket, options.websocket);
    this.port = this.options.websocket.port;

    var self = this;

    // Create Websocket Server
    var app = https.createServer({
        key: fs.readFileSync(this.options.websocket.ssl_key),
        cert: fs.readFileSync(this.options.websocket.ssl_cert)
    }, function(req, res){
        res.writeHead(418);
        res.end("<h1>418 - I'm a teapot</h1>");
    }).listen(this.port);
    this.wss = new WebSocketServer({server:app});
    this.wss.on('error', function(err) {
        self.emit('error', err);
    });

    // Incoming WS connection
    this.wss.on('connection', function(ws) {
        // Set connection string we can use as client identifier
        ws.connectString = util.format("%s:%d",
            ws.upgradeReq.connection.remoteAddress, ws.upgradeReq.connection.remotePort);

        // Signal we've got a connection
        self.emit('connection', ws);
    });
    events.EventEmitter.call(this);
};
util.inherits(Bridge, events.EventEmitter);

Bridge.prototype.connectMqtt = function(options) {
    // Create our client
    options.encoding = "binary";
    var mqttClient = mqtt.createClient(this.options.mqtt.port, this.options.mqtt.host, options);
    mqttClient.options = options;

    // Note: Have to do this because the MQTT client blocks connection
    // errors, which we want to capture
    mqttClient.stream.on('error', mqttClient.emit.bind(mqttClient, 'error'));

    // Disable reconnection
    mqttClient._reconnect = function() {};

    // Set the host and port
    mqttClient.host = this.options.mqtt.host;
    mqttClient.port = this.options.mqtt.port;

    return mqttClient;
}

Bridge.prototype.close = function() {
    this.wss.close();
    this.emit('close');
}

module.exports.createBridge = function(options) {
    return new Bridge(options);
};

