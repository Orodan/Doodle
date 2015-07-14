/**
*	Module dependencies
**/
var db = require('./db');

exports.save = function (token, userId, clientId, expires, callback) {

	var query = 'INSERT INTO oauth_access_tokens (access_token, client_id, user_id, expires) values (?, ?, ?, ?)';
	db.execute(query, [ token, clientId, userId, new Date().getTime()  + (expires * 1000) ], { prepare : true }, function (err){
		return callback(err);
	});
};

exports.find = function (token, callback) {

	var query = 'SELECT access_token, expires, client_id, user_id FROM oauth_access_tokens WHERE access_token = ?';
	db.execute(query, [ token ], { prepare : true }, function (err, result) {
		if (err) { return callback(err); }
		if (result.rows.length === 0) { return callback(); }
		
		return callback(null, result.rows[0]);
	});
};

exports.delete = function (token, callback) {

	console.log("Token : ", token);

	var query = 'DELETE FROM oauth_access_tokens WHERE access_token = ?';
	db.execute(query, [ token ], { prepare : true }, function (err) {
		return callback(err);
	});
};