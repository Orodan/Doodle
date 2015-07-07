/**
*	Module dependencies
**/
var db = require('./db');

exports.save = function (token, userId, clientId, callback) {

	var query = 'INSERT INTO oauth_access_tokens (access_token, client_id, user_id) values (?, ?, ?)';
	db.execute(query, [ token, clientId, userId ], { prepare : true }, function (err){
		return callback(err);
	});
};

exports.find = function (token, callback) {

	var query = 'SELECT access_token, expires, client_id, user_id) FROM oauth_access_tokens WHERE access_token = ?';
	db.execute(query, [ token ], { prepare : true }, function (err, result) {
		if (err) { return callback(err); }
		if (result.rows.length === 0) { return callback(); }
		
		return callback(null, result.rows[0]);
	});
};