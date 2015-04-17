// Dependencies ------------------------------------------------
var async = require('async');

/**
*	Constructor
**/
function notification (user_id, doodle_id, schedule_id) {

	this.notification_id = notification.TimeUuid.now();
	this.send_by = user_id;
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
			var queries = [
				{
					query: 'INSERT INTO notification (notification_id, send_by, doodle_id, schedule_id) values (?, ?, ?, ?)',
					params: [ this.notification_id, this.send_by, this.doodle_id, this.schedule_id ]
				},
				{
					query: 'INSERT INTO notifications_by_doodle (doodle_id, notification_id) values (?, ?)',
					params: [ this.doodle_id, this.notification_id ]
				}
			];

			notification.db.batch(queries, { prepare : true }, function (err) {
				return done(err);
			});
		},
		// Save notification for the users with the good profile configuration
		function _saveNotificationForUsers (done) {
			async.waterfall([
				// Get the users of the doodle
				function _getDoodleUsers (finish) {
					var query = 'SELECT user_id FROM users_by_doodle WHERE doodle_id = ?';
					notification.db.execute(query, [ doodle_id ], { prepare : true }, function (err, result){
						if (err || result.rows.length === 0) {
							return callback(err);
						}

						return finish(err, result.rows);
					});
				},
				// Filter the users to only have the ones who have activated the notifications for this doodle
				function _getUsersWhoWantNotification (user_ids, finish) {
					
					async.each(user_ids, function (user_id, end) {

						var query = 'SELECT user_id, notification FROM user_configuration WHERE user_id = ? AND doodle_id = ? AND notification = ?';
						notification.db.execute(query, [ user_id.user_id, this.doodle_id, true ], { prepare : true }, function (err, result) {
							if (err || result.rows.length === 0) {
								return end(err);
							}
						}, function (err, result) {
							return callback(err, result); 
						});
					});
				},
				// Associate the notification with these users
				function _saveNotification (user_ids, finish) {

					async.each(user_ids, function (user_id, end) {

						var query = 'INSERT INTO notifications_by_user (user_id, notification_id, is_read) values (?, ?, ?)';
						notification.db.execute(query, [ user_id, this.notification_id, false ], { prepare : true }, function (err) {
							return finish(err);
						});
					});
				}
			], function (err) {
				return done(err);
			});
		}
	], function (err) {
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
