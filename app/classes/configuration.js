// Dependencies -----------------------------------------------
var async = require('async');

var default_notification = false;
var default_notification_by_email = false;

/**
*	Constructor
**/
function configuration (user_id, doodle_id, notification, notification_by_email) {

	this.user_id = user_id;
	this.doodle_id = doodle_id;

	(notification) ? this.notification = notification : this.notification = default_notification;
	(notification_by_email) ? this.notification_by_email = notification_by_email : this.notification_by_email = default_notification_by_email;

}

/**
*	Save the configuration in db
**/
configuration.prototype.save = function (callback) {

	var query = 'INSERT INTO configuration_by_user_and_doodle (user_id, doodle_id, notification, notification_by_email) values (?, ?, ?, ?)';
	configuration.db.execute(query, [ this.user_id, this.doodle_id, this.notification, this.notification_by_email ], { prepare : true }, function (err) {
		return callback(err);
	});
};


/**
*	Get the configuration
**/
configuration.get = function (user_id, doodle_id, callback) {

	var query = 'SELECT * FROM configuration_by_user_and_doodle WHERE user_id = ? AND doodle_id = ?';
	configuration.db.execute(query, [ user_id, doodle_id ], { prepare : true }, function (err, result) {
		if (err || result.rows.length === 0) {
			return callback(err);
		}

		return callback(null, result.rows[O]);
	});
};

/**
*	Delete the configuration
**/
configuration.delete = function (user_id, doodle_id, callback) {

	var query = 'DELETE FROM configuration_by_user_and_doodle WHERE user_id = ? AND doodle_id = ?';
	configuration.db.execute(query, [ user_id, doodle_id ], { prepare : true }, function (err) {
		return callback(err);
	});
};


module.exports = configuration;