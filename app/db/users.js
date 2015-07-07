/**
*	Module dependencies
**/
var db = require('./db');

exports.find = function (id, callback) {

	var query = 'SELECT id, email, first_name, last_name, password, statut FROM user WHERE id = ?';
	db.execute(query, [ id ], { prepare : true }, function (err, result) {
		if (err) { return callback(err); }
		if (result.rows.length === 0) { return callback(); }

		return callback(null, result.rows.length === 0);
	});
};