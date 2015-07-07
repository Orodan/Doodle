/**
*	Module dependencies
**/
var db = require ('./db');

exports.save = function (code, clientId, redirectUri, userId, callback) {

	var query = 'INSERT INTO oauth_authorization_code (code, client_id, redirect_uri, user_id) values (?, ?, ?, ?)';
	db.execute(query, [ code, clientId, redirectUri, userId ], { prepare : true }, function (err) {
		return callback(err);
	});
};

exports.find = function (code, callback) {

	var query = 'SELECT code, client_id, redirect_uri, user_id FROM oauth_authorization_code WHERE code = ?';
	db.execute(query, [ code ], { prepare : true }, function (err, result) {
		if (err) { return callback(err); }
		if (result.rows.length === 0) { return callback(); }

		return callback(null, result.rows[0]);
	});
};

exports.delete = function (code, callback) {

	var query = 'DELETE FROM oauth_authorization_code WHERE code = ?';
	db.execute(query, [ code ], { prepare : true }, function (err) {
		return callback(err);
	});
};