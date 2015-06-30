var util = require('util');
var user = require('./user');
var Global = require('./global');
var async = require('async');
var bcrypt = require('bcrypt-nodejs');

function privateUser (email, first_name, last_name, password) {

	user.call(this, email, first_name, last_name, password);

	this.email = email;
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
	privateUser.super_.prototype.save.call(this, function (err) {
		// We save the informations specific to a private user
		var query = 'INSERT INTO user_by_email (email, user_id) values (?, ?)';
		privateUser.super_.db.execute(query, [ this.email, this.id ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			return callback(null, true);
		});
	}.bind(this));
};

/**
*	Find user by email
**/
privateUser.findByEmail = function (email, callback) {

	if (email.length === 0) {
		return callback('No user found with that email.', false);
	}

	async.waterfall([
		function findIdByEmail (done) {

			var query = 'SELECT user_id FROM user_by_email WHERE email = ?';
			privateUser.super_.db.execute(query, [ email ], { prepare : true }, function (err, result) {

				if (err) {
					return done(err);
				}

				// No user found
				if (!result.rows[0]) {
					return done('No user found with that email.', false);
				}

				return done(null, result.rows[0].user_id);
			});
		},

		function getUser (user_id, done) {
			privateUser.super_.get(user_id, done);
		}
	], function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result);
	});
};

/**
* Check if valid password
**/
privateUser.validPassword = function (password, user_password) {
	return bcrypt.compareSync(password, user_password);
};


module.exports = privateUser;
