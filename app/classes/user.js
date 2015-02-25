// Dependencies =====================================================
var bcrypt = require('bcrypt-nodejs');
var uuid = require('node-uuid');
var Global = require('../classes/global');

// User Model to interact with database
var user = {};

/**
*	Basic authentication of user
**/
user.basicAuthentication = function (email, password, callback) {

	// We check if there is an user with this email
	user.findByEmail(email, function (err, user_data) {
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

/**
*	Create a new public user
**/
user.newPublicUser = function (params , callback) {

	var user_id = uuid.v4();
	params.id = user_id;

	user.create(params, 'temporary', function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, user_id);
	})
};

/**
* Check if valid password
**/
user.validPassword = function (password, user_password) {
	return bcrypt.compareSync(password, user_password);
};

/**
*	Find user by email
**/
user.findByEmail = function (email, callback) {

	var query = "SELECT * FROM Doodle.user WHERE email = ?";

	user.db.execute(query, [ email ], { prepare : true },
		function (err, data) {
			(err) ? callback(err) : callback(null, data.rows[0]);
		})
};

/**
*	Find a user with his id
**/
user.findById = function (id, callback) {

	var query = "SELECT * FROM Doodle.user WHERE id = ?";

	user.db.execute(query, [ id ], { prepare : true },
		function (err, data) {
			(err) ? callback(err) : callback(null, data.rows[0]);
		})
};

/**
*	Create a new user in databse
*/
user.create = function (newUser, statut, callback) {

	var user_id = uuid.v4();

	var query = "INSERT INTO Doodle.user (id, email, password, first_name, last_name, statut) values (?, ?, ?, ?, ?, ?)";

	user.db.execute(query, [ user_id, newUser.email, Global.generateHash(newUser.password), newUser.first_name, newUser.last_name, statut ], { prepare : true},
		function (err, result) {
			if (err) {
				return callback(err);
			}
			else {
				user.get(user_id, function (err, user_data) {
					if (err) {
						return callback(err);
					}

					return callback(null, user_data);
				});
			}
		}
	);
};

/**
*	Get user data
*/
user.get = function (id, callback) {

	var query = "SELECT * FROM Doodle.user WHERE id = ?";

	user.db.execute(query, [ id ], { prepare : true },
		function (err, result) {
			(err) ? callback(err) : callback(null, result.rows[0]);
		});
};

/**
*	Get user with the email
**/
user.getUserByEmail = function (email, done) {
	var query = "SELECT * From Doodle.user WHERE email = ?";

	user.db.execute(query, [ email ], { prepare : true },
		function (err, data) {
			(err) ? done(err) : done(null, data.rows[0])
		});
};

module.exports = user;
