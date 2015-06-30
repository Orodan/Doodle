// Dependencies ------------------------------------------------
var async = require('async');
var assert = require('assert');
var moment = require('moment');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

/**
*	Constructor
**/
function notification (user_id, doodle_id) {

	this.id = notification.timeuuid();
	this.user_id = user_id;
	this.doodle_id = doodle_id;

}

/**********************************\
 ***** PROTOTYPAL FUNCTIONS ******
\**********************************/

/**
*	Save the notification in db
**/
notification.prototype.save = function (callback) {

	async.parallel([
		// Save the notification and associate it with the doodle
		function _saveNotification (done) {

			var query = 'INSERT INTO notification (id, user_id, doodle_id) values (?, ?, ?)';
			notification.db.execute(query, [ this.id, this.user_id, this.doodle_id ], { prepare : true }, function (err) {
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
					notification.db.execute(query, [ user_id, this.id, false ], { prepare : true }, function (err) {
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
 * Create the association between the notifications and the doodle
 * @param callback
 */
notification.prototype.saveNotificationsForDoodle = function (callback) {

	var query = 'INSERT INTO notifications_by_doodle (doodle_id, notification_id) values (?, ?)';
	notification.db.execute(query, [ this.doodle_id, this.id ], { prepare: true }, callback);
};

/**
*	Send email to user with the good configuration
**/
notification.prototype.sendEmailNotifications = function (callback) {

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
		function _getUsersWhoWantNotificationByEmail (user_ids, finish) {

			var userIdsWhoWantNotifByEmail = [];

			async.each(user_ids, function (user_id, end) {

					// We do not send a notification to the user who provoked this notification
					if (user_id.user_id.equals(this.user_id)) {
						return end();
					}

					var query = 'SELECT user_id, notification_by_email FROM configuration_by_user_and_doodle WHERE user_id = ? AND doodle_id = ?';
					notification.db.execute(query, [ user_id.user_id, this.doodle_id ], { prepare : true }, function (err, result) {
						if (err || result.rows.length === 0) {
							return end(err);
						}

						// Good configuration
						if (result.rows[0].notification_by_email === true) {
							userIdsWhoWantNotifByEmail.push(result.rows[0].user_id);
						}

						return end(err);
					}.bind(this));
				}.bind(this),
				function (err) {
					return finish(err, userIdsWhoWantNotifByEmail);
				});
		}.bind(this),

		function _sendEmail (user_ids, finish) {

			async.each(user_ids, function (_user_id, done) {

				async.waterfall([
					function _getUserEmail (end) {
						var query = 'SELECT email FROM user WHERE id = ?';
						notification.db.execute(query, [ _user_id ], { prepare : true }, function (err, result) {
							if (err) {
								return end(err);
							}

							if (result.rows.length === 0) {
								return end(null, false);
							}

							var user_mail = result.rows[0].email;
							return end(null, user_mail);
						});
					}.bind(this),

					function _sendMessage (user_mail, end) {

						async.parallel({
							user_name: function _getUserName (theEnd) {

								var query = 'SELECT first_name, last_name FROM user WHERE id = ?';
								notification.db.execute(query, [ _user_id ], { prepare : true }, function (err, result) {
									if (err) {
										return theEnd(err);
									}

									if (result.rows.length === 0) {
										return theEnd('No user found');
									}

									var user_name = result.rows[0].first_name + ' ' + result.rows[0].last_name;

									return theEnd(null, user_name);
								});
							},
							doodle_name: function _getDoodleName (theEnd) {
								var query = 'SELECT name FROM doodle WHERE id = ?';
								notification.db.execute(query, [ this.doodle_id ], { prepare : true }, function (err, result) {
									if (err) {
										return theEnd(err);
									}

									if (result.rows.length === 0) {
										return theEnd('No doodle found');
									}

									return theEnd(null, result.rows[0].name);
								});
							}.bind(this)
						},
						function (err, results) {
							if (err) {
								return end(err);
							}

							// create reusable transporter object using SMTP transport
							var transporter = nodemailer.createTransport(smtpTransport({
								host: 'mail.univ-lr.fr',
								port: 25,
								debug: true,
								auth: {
								        user: 'jkasprza',
								        pass: 'Univlr17'
								    }
							}));

							// setup e-mail data with unicode symbols
							var mailOptions = {
							  from: 'doodledevmail@gmail.com', // sender address
							  to: 'jimmykasprzak@gmail.com', // list of receivers
							  subject: 'Doodle notification', // Subject line
							  html: '<p><strong>' + results.user_name + '</strong> updated his/her votes on the doodle <strong> ' + results.doodle_name + ' </strong></p>' // html body
							};

							// send mail with defined transport object
							transporter.sendMail(mailOptions, function(err){
							  return end(err);
							});
						}.bind(this));

					}.bind(this)

				], function (err) {
					return done(err);
				});

			}.bind(this),
			function (err) {
				return finish(err);
			});

		}.bind(this)
	], function (err) {
		return callback(err);
	});


};

/***********************************\
 *********** FUNCTIONS ************
\***********************************/

/**
 * GETTERS
 */

/**
 *	Get the notification
 **/
notification.get = function (notification_id, callback) {

	var query = 'SELECT * from notification WHERE id = ?';
	notification.db.execute(query, [ notification_id ], { prepare : true }, function (err, result) {
		if (err || result.rows.length === 0) {
			return callback(err);
		}

		return callback(null, result.rows[0]);
	});
};

/**
 *	Get all the notifications specified
 **/
notification.getAllInformationsFromIds = function (notification_ids, callback) {

	var notifications = [];

	if (!notification_ids) {
		return callback(null, []);
	}

	async.each(notification_ids, function (notification_data, done) {

		async.waterfall([
			function _getNotification (finish) {

				var query = 'SELECT * FROM notification WHERE id = ?';
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
			notification_data.doodle = result.doodle;

			return done(err, result);
		});

	}, function (err) {

		return callback(err, notification_ids);
	});
};

/**
*	Sort the notifications from the sooner to the older
**/
notification.sortNotifications = function (notifications, callback) {
	notifications.sort(function (notification1, notification2) {

		notification1.created = moment(notification1.created);
		notification2.created = moment(notification2.created);

		if (notification1.created < notification2.created) {
			return 1;
		}
		else if (notification1.created > notification2.created) {
			return -1;
		}
		return 0;
	});

	return callback();
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
		}
	}, function (err, results) {

		results.id = notification_obj.id;
		return callback(err, results);
	});
};

/**
 * Get if the user has already read the notification or not
 * @param user_id
 * @param notification_id
 * @param callback
 */
notification.isRead = function (user_id, notification_id, callback) {

	var query = 'SELECT is_read FROM notifications_by_user WHERE user_id = ? AND notification_id = ?';
	notification.db.execute(query, [ user_id, notification_id ], { prepare : true }, function (err, result) {
		if (err || result.rows.length === 0) {
			return callback(err);
		}

		return callback(null, result.rows[0].is_read);
	});
};

/**
 * Get the notifications of the user
 * @param user_id
 * @param callback
 */
notification.getNotificationIdsFromUser = function (user_id, callback) {

	var query = 'SELECT notification_id FROM notifications_by_user WHERE user_id = ?';
	notification.db.execute(query, [ user_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result.rows);
	});
};

/**
 * SETTERS
 */

/**
*	Set the notification has been read by the user
**/
 notification.update = function (notification_id, user_id, callback) {

 	var query = 'UPDATE notifications_by_user SET is_read = True WHERE user_id = ? AND notification_id = ?';
 	notification.db.execute(query, [ user_id, notification_id ], function (err) {
 		return callback(err);
 	});
 };

/**
 * DELETE
 */

/**
 * Delete the notification
 * @param notification_id
 * @param callback
 */
notification.delete = function (notification_id, callback) {

	var query = 'DELETE FROM notification WHERE id = ?';
	notification.db.execute(query, [ notification_id ], { prepare : true }, function (err) {
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
			return callback(err);
		});
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
		return callback(err);
	});
};


module.exports = notification;
