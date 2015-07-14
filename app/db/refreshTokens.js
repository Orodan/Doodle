/**
*	Module dependencies
**/
var db = require('./db');

exports.save = function (refresh_token, access_token, callback) {

	var query = 'INSERT INTO oauth_refresh_tokens (refresh_token, access_token) values (?, ?)';
	db.execute(query, [ refresh_token, access_token ], { prepare : true }, function (err) {
		return callback(err);
	});
};

exports.find = function (refresh_token, callback) {

	var query = 'SELECT refresh_token, access_token FROM oauth_refresh_tokens WHERE refresh_token = ?';
	db.execute(query, [ refresh_token ], { prepare : true }, function (err, result) {
		if (err) { return callback(err); }
		if (result.rows.length === 0) { return callback(null, false); }

		return callback(null, result.rows[0]);
	});
};

exports.updateAccessToken = function (refresh_token, access_token, callback) {

	var query = 'UPDATE oauth_refresh_tokens SET access_token = ? WHERE refresh_token = ?';
	db.execute(query, [ access_token, refresh_token ], { prepare : true }, function (err) {
		return callback(err);
	});
};