// Dependencies ------------------------------------------------
var async = require('async');

/**
*	Constructor
**/
function notification (user_id, doodle_id, schedule_id) {

	this.notification_id = notification.timeuuid();
	this.user_id = user_id;
	this.doodle_id = doodle_id;
	this.schedule_id = schedule_id;

}

/**
*	Save the notification in db
**/
notification.prototype.save = function (callback) {

	async.parallel([
		// Save the notification and associate it with the doodle
		function _saveNotification (done) {

			var query = 'INSERT INTO notification (notification_id, user_id, doodle_id, schedule_id) values (?, ?, ?, ?)';
			notification.db.execute(query, [ this.notification_id, this.user_id, this.doodle_id, this.schedule_id ], { prepare : true }, function (err) {
				return done(err);
			});
		}.bind(this),
		// Save notification for the users with the good profile configuration
		function _saveNotificationForUsers (done) {
			async.waterfall([
				// Get the users of the doodle
				function _getDoodleUsers (finish) {
					var query = 'SELECT user_id FROM users_by_doodle WHERE doodle_id = ?';
					notification.db.execute(query, [ this.doodle_id ], { prepare : true }, function (err, result){
						if (err || result.rows.length === 0) {
							return finish(err);
						}

						console.log("2");
						return finish(err, result.rows);
					});
				}.bind(this),
				// Filter the users to only have the ones who have activated the notifications for this doodle
				function _getUsersWhoWantNotification (user_ids, finish) {
					
					var userIdsWhoWantNotif = [];

					async.each(user_ids, function (user_id, end) {

						var query = 'SELECT user_id, notification FROM user_configuration WHERE user_id = ? AND doodle_id = ?';
						notification.db.execute(query, [ user_id.user_id, this.doodle_id ], { prepare : true }, function (err, result) {
							if (err || result.rows.length === 0) {
								return end(err);
							}

							if (result.rows[0].notification === true) {
								userIdsWhoWantNotif.push(result.rows[0].user_id);
							}

						}, function (err) {
							console.log("3");
							return finish(err, userIdsWhoWantNotif); 
						});
					});
				}.bind(this),
				// Associate the notification with these users
				function _saveNotification (user_ids, finish) {

					async.each(user_ids, function (user_id, end) {

						var query = 'INSERT INTO notifications_by_user (user_id, notification_id, is_read) values (?, ?, ?)';
						notification.db.execute(query, [ user_id, this.notification_id, false ], { prepare : true }, function (err) {
							return end(err);
						});
					}, function (err) {
						console.log("4");
						return finish(err);
					});
				}.bind(this)
			], function (err) {
				console.log("5");
				return done(err);
			});
		}.bind(this)
	], function (err) {
		console.log("6");
		return callback(err);
	});
};

/**
*	Delete the notification
**/
notification.delete = function (notification_id, callback) {
	
	var query = 'DELETE FROM notifications_by_user WHERE user_id = ? AND doodle_id = ? AND schedule_id = ?';
	notification.db.execute(query, [ user_id, doodle_id, schedule_id ], { prepare : true }, function (err) {
		return callback(err);
	});
};

/**
*	Get all the notifications associated with the user
**/
notification.getAllFromUser = function (user_id, callback) {

	var query = 'SELECT * FROM notifications_by_user WHERE user_id = ?';
	notification.db.execute(query, [ user_id ], { prepare : true }, function (err, result) {
		if (err || result.rows.length === 0) {
			return callback(err, null);
		}

		return callback(err, result);
	});
};

/**
*	Delete all the notifications associated with the doodle and the users
**/
notification.deleteAllFromDoodle = function (doodle_id, user_ids, callback) {

	async.each(user_ids, function (user_id, done) {

		var query = 'DELETE FROM notifications_by_user WHERE user_id = ? AND doodle_id = ?';
		notification.db.execute(query, [ user_id, doodle_id ], { prepare : true }, function (err) {
			return done(err);
		});

	}, function (err) {
		return callback(err);
	});
};

/**
*	Delete all the notifications associated with the user
**/
notification.deleteAllFromUser = function (user_id , callback) {

	var query = 'DELETE FROM notifications_by_user WHERE user_id = ?';
	notification.db.execute(query, [ user_id ], { prepare : true }, function (err) {
		return callback(err);
	});
};

module.exports = notification;
