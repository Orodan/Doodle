/**
*	Module dependencies
**/
var async = require('async');
var db = require('../config/db.js');

function client () {}

client.findById = function (client_id, callback) {

	var query = 'SELECT client_id, client_secret, redirect_uri FROM oauth_clients WHERE client_id = ?';
	db.execute(query, [ client_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		if (result.rows.length === 0){
			return callback('No client found.');
		}

		return callback(null, result.rows[0]);
	});
};

module.exports = client;