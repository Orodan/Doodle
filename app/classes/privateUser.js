var util = require('util');
var user = require('./user');
var Global = require('./global');
var async = require('async');

function privateUser (email, first_name, last_name, password) {

	user.call(this, email, first_name, last_name, password);

	this.email = first_name;
	this.password = Global.generateHash(password);
	this.statut = 'registred';

}

util.inherits(privateUser, user);

/**
*	Check if a user with that email exists
*	@return true if he exists, false otherwise
**/
privateUser.check = function (email, callback) {

	var query = 'SELECT * FROM user_by_email WHERE email = ?';
	privateUser.super_.db.execute(query, [ email ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		if (result.rows.length > 0) {
			return callback(null, true);
		}
		else {
			return callback(null, false);
		}
	});
};

/**
*	Find a user with his id
**/
privateUser.findById = function (id, callback) {
	privateUser.super_.findById(id, callback);
};

/**
*	Save user information in base
**/
privateUser.prototype.save = function (callback) {

	// We save the general informations about the user
	privateUser.super_.prototype.save.call(this, callback);

	// We save the informations specific to a private user
	var query = 'INSERT INTO user_by_email (email, user_id) values (?, ?)';
	privateUser.db.execute(query, [ this.email, this.id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Find user by email
**/
privateUser.findByEmail = function (email, callback) {

	async.waterfall([
		function (callback) {

			var query = 'SELECT user_id FROM user_by_email WHERE email = ?';
			privateUser.db.execute(query, [ email ], { prepare : true }, function (err, result) {
				if (err) {
					return callback(err);
				}

				if (!result.rows[0]) {
					return callback('No user with that email');
				}

				return callback(null, result.rows[0].user_id);
			});
		},

		function (user_id, callback) {
			privateUser.get(user_id, callback);	
		}
	], function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result);
	});
};

/**
*	Basic authentication of user
**/
privateUser.basicAuthentication = function (email, password, callback) {

	// We check if there is an user with this email
	privateUser.findByEmail(email, function (err, user_data) {
		if (err) {
			return callback(err);
		}

		if (!user_data) {
			return callback('No user found with the email ' + email, false);
		}

		if (!user.validPassword(password, user_data.password) ) {
			return callback('Wrong password', false);
		}

		return callback(null, user_data);
	});
};

module.exports = privateUser;