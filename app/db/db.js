/**
*	Module dependencies
**/
var cassandra = require('cassandra-driver');

var client = new cassandra.Client({keyspace: 'doodle', contactPoints: ['127.0.0.1']});
console.log("création client cassandra");
client.connect( function(err) {
	(err) ? console.log("An error happened : " + err) : console.log("Connected to Cassandra");
});

module.exports = client;