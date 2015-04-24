// Dependencies ------------------------------------------------
var async = require('async');
var assert = require('assert');
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
		this.saveNotificationForUsers.bind(this),
		this.saveNotificationsForDoodle.bind(this)

	], function (err) {
		return callback(err);
	});
};

/**
 * Create the notification between the notifications and the doodle
 * @param callback
 */
notification.prototype.saveNotificationsForDoodle = function (callback) {

	var query = 'INSERT INTO notifications_by_doodle (doodle_id, notification_id) values (?, ?)';
	notification.db.execute(query, [ this.doodle_id, this.notification_id ], { prepare: true }, callback);
};

/**
 * Delete the association between the user and the notifications ( from a single doodle )
 * @param data
 * @param callback
 */
notification.deleteAssociationsWithUser = function (data, callback) {

	async.each(data.user_ids, function (user_id, done) {
		async.each(data.notification_ids, function (notification_id, finish) {

			var query = 'DELETE FROM notifications_by_user WHERE user_id = ? AND notification_id = ?';
			notification.db.execute(query, [ user_id, notification_id.notification_id ], { prepare: true }, function (err) {
				return finish(err);
			});
		}, function (err) {
			return done(err);
		});
	}, function (err) {

		console.log("deleteAssociationsWithUser");
		return callback(err);
	});
};

/**
 * Delete the association between the doodle and its notifications
 * @param data
 * @param callback
 */
notification.deleteAssociationsWithDoodle = function (doodle_id, callback) {

	var query = 'DELETE FROM notifications_by_doodle WHERE doodle_id = ?';
	notification.db.execute(query, [ doodle_id ], { prepare : true }, function (err) {
		console.log("deleteAssociationsWithDoodle");
		return callback(err);
	});
};

/**
 * Delete all the notifications specified
 * @param notification_ids
 * @param callback
 */
notification.deleteAll = function (notification_ids, callback) {

	async.each(notification_ids, function (notification_id, done) {
		notification.delete(notification_id.notification_id, done);
	},
	function (err) {
		console.log("deleteAll");
		return callback(err);
	});
}

/**
 * Delete the notification
 * @param notification_id
 * @param callback
 */
notification.delete = function (notification_id, callback) {

	var query = 'DELETE FROM notification WHERE notification_id = ?';
	notification.db.execute(query, [ notification_id ], { prepare : true }, function (err) {
		return callback(err);
	});
};

/**
*	Save notification for the users with the good profile configuration
**/
notification.prototype.saveNotificationForUsers = function (callback) {

	async.waterfall([
		// Get the users of the doodle
		function _getDoodleUsers (finish) {
			var query = 'SELECT user_id FROM users_by_doodle WHERE doodle_id = ?';
			notification.db.execute(query, [ this.doodle_id ], { prepare : true }, function (err, result){
				if (err || result.rows.length === 0) {
					return finish(err);
				}

				return finish(err, result.rows);
			}.bind(this));
		}.bind(this),
		// Filter the users to only have the ones who have activated the notifications for this doodle
		// The user who emited the notification does not get it no matter his configuration
		function _getUsersWhoWantNotification (user_ids, finish) {
			
			var userIdsWhoWantNotif = [];

			async.each(user_ids, function (user_id, end) {

				// We do not send a notification to the user who provoked this notification
				if (user_id.user_id.equals(this.user_id)) {
					return end();
				}

				var query = 'SELECT user_id, notification FROM configuration_by_user_and_doodle WHERE user_id = ? AND doodle_id = ?';
				notification.db.execute(query, [ user_id.user_id, this.doodle_id ], { prepare : true }, function (err, result) {
					if (err || result.rows.length === 0) {
						return end(err);
					}

					// Good configuration
					if (result.rows[0].notification === true) {
						userIdsWhoWantNotif.push(result.rows[0].user_id);
					}

					return end(err);
				}.bind(this));
			}.bind(this),
			function (err) {
				return finish(err, userIdsWhoWantNotif);
			});
		}.bind(this),
		// Associate the notification with these users
		function _saveNotification (user_ids, finish) {

			async.each(user_ids, function (user_id, end) {

				var query = 'INSERT INTO notifications_by_user (user_id, notification_id, is_read) values (?, ?, ?)';
				notification.db.execute(query, [ user_id, this.notification_id, false ], { prepare : true }, function (err) {
					return end(err);
				}.bind(this));
			}.bind(this), 
			function (err) {
				return finish(err);
			});
		}.bind(this)
	], function (err) {
		return callback(err);
	});
};

/**
*	Set the notification as read by the user
**/
notification.isRead = function (user_id, notification_id, callback) {

	var query = 'UPDATE notifications_by_user SET is_read = ? WHERE user_id = ? AND notification_id = ?';
	notification.db.execute(query, [ true, user_id, notification_id ], { prepare : true }, function (err) {
		return callback(err);
	});
};

/**
*	Get the informations about the notification
**/
notification.getInformations = function (notification_obj, callback) {

	async.parallel({
		// Get the user information from its id
		user: function _getUser (done) {
			var query = 'SELECT first_name, last_name FROM user WHERE id = ?';
			notification.db.execute(query, [ notification_obj.user_id ], { prepare : true }, function (err, result) {
				if (err || result.rows.length === 0) {
					return done(err);
				}

				return done(null, result.rows[0]);
			});
		},
		// Get the doodle information from its id
		doodle: function _getDoodle (done) {
			var query = 'SELECT name FROM doodle WHERE id = ?';
			notification.db.execute(query, [ notification_obj.doodle_id ], { prepare : true }, function (err, result) {
				if (err || result.rows.length === 0) {
					return done(err);
				}

				return done(null, result.rows[0]);
			});
		},
		// Get the schedule information from its id
		schedule: function _getSchedule (done) {
			var query = 'SELECT begin_date, end_date FROM schedule WHERE id = ?';
			notification.db.execute(query, [ notification_obj.schedule_id ], { prepare : true }, function (err, result) {
				if (err || result.rows.length === 0) {
					return done(err);
				}

				return done(null, result.rows[0]);
			});
		}
	}, function (err, results) {

		results.notification_id = notification_obj.notification_id;
		return callback(err, results);
	});
};

/**
 * Get if the user has already read the notification or not
 * @param user_id
 * @param notification_id
 * @param callback
 */
notification.getIsRead = function (user_id, notification_id, callback) {

	var query = 'SELECT is_read FROM notifications_by_user WHERE user_id = ? AND notification_id = ?';
	notification.db.execute(query, [ user_id, notification_id ], { prepare : true }, function (err, result) {
		if (err || result.rows.length === 0) {
			return callback(err);
		}

		return callback(null, result.rows[0].is_read);
	});
};

/**
*	Get all the notifications specified
**/
notification.getAll = function (notification_ids, callback) {

	var notifications = [];

	if (!notification_ids) {
		return callback(null, []);
	}

	async.each(notification_ids, function (notification_data, done) {

		async.waterfall([
			function _getNotification (finish) {

				var query = 'SELECT * FROM notification WHERE notification_id = ?';
				notification.db.execute(query, [ notification_data.notification_id ], { prepare : true }, function (err, result) {

					if (err || result.rows.length === 0) {
						return finish(err);	
					}

					return finish(null, result.rows[0]);
				});
			},
			function _getInformations (notification_obj, finish) {
				notification.getInformations(notification_obj, finish);
			}
		], function (err, result) {

			// We send the result inside the notifications array because
			// it is sorted according to the time each notification was
			// send, if we don't, we lose this order
			notification_data.user = result.user;
			notification_data.schedule = result.schedule;
			notification_data.doodle = result.doodle;

			return done(err, result);
		});
			
	}, function (err) {
		return callback(err, notification_ids);
	});
};

/**
*	Get the notification
**/
notification.get = function (notification_id, callback) {

	var query = 'SELECT * from notification_id WHERE notification_id = ?';
	notification.db.execute(query, [ notification_id ], { prepare : true }, function (err, result) {
		if (err || result.rows.length === 0) {
			return callback(err);
		}

		return callback(null, result.rows[0]);
	});
};

/**
 * Delete the notifications of the doodle
 * @param doodle_id
 * @param callback
 */
notification.deleteNotifications = function (doodle_id, callback) {

	// Get notification ids and user ids associated to the doodle
	async.parallel({
		notification_ids: function _getNotificationIds(done) {
			var query = 'SELECT notification_id FROM notifications_by_doodle WHERE doodle_id = ?';
			notification.db.execute(query, [doodle_id], {prepare: true}, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(result.rows);
			})
		},
		user_ids: function _getUserIds(done)
		{
			var query = 'SELECT user_id FROM users_by_doodle WHERE doodle_id = ?';
			notification.db.execute(query, [doodle_id], {prepare: true}, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(result.rows);
			});
		}
	}, function (err, results) {
		return callback(err, results);
	});

	async.waterfall([
		// Get the notification ids associated with the doodle
		function _getNotificationIds (done) {
			notification.getNotificationIdsFromDoodle(doodle_id, done)
		},
		function _deleteNotif (notification_ids, done) {
			async.parallel([
				notification.deleteAssociationUserNotifications(),
				notification.deleteAssociationDoodleNotification(),
				notification.delete()
			], callback);
		}
	]);
};

/**
*	Get all the notifications associated with the user
**/
notification.getNotificationIdsFromUser = function (user_id, callback) {

	var query = 'SELECT notification_id FROM notifications_by_user WHERE user_id = ? order by notification_id desc';
	notification.db.execute(query, [ user_id ], { prepare : true }, function (err, result) {
		if (err || result.rows.length === 0) {
			return callback(err, null);
		}

		return callback(err, result.rows);
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
