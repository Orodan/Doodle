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