// dependencies ===============================================================
var uuid = require('node-uuid');
var async = require('async');
var Schedule = require('./schedule');
var User = require('./user');
var Vote = require('./vote');
var Notification = require('./notification');
var Configuration = require('./configuration');
var moment = require('moment');

// FUNCTIONS ===============================================================

/**
*	Create a new public doodle from the data
* 	It is not associated with any user at the begining
**/
doodle.newPublic = function (doodle_name, doodle_description, callback) {

	var id = uuid.v4();

	var query = 'INSERT INTO Doodle.doodle (id, name, description) values (?, ?, ?)';
	doodle.db.execute(query, [ id, doodle_name, doodle_description ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		query = 'SELECT * FROM Doodle.doodle WHERE id = ?';
		doodle.db.execute(query, [ id ], { prepare : true }, function (err, data) {
			if (err) {
				return callback(err);
			}

			return callback(null, data.rows[0]);
		});
	});
};

doodle.lang = 'en';

/**
 * Constructor
 * @param name
 * @param description
 * @param user_id
 * @param callback
 */
function doodle (name, description, user_id, callback) {

	this.id = doodle.uuid();
	this.name = name;
	this.description = description;
}

/**********************************\
 ***** PROTOTYPAL FUNCTIONS ******
\**********************************/

/**
*	Save the doodle in database
**/
doodle.prototype.save = function (callback) {

	var query = 'INSERT INTO doodle (id, name, description) values (?, ?, ?)';
	doodle.db.execute(query, [ this.id, this.name, this.description ], { prepare : true }, function (err) {
		return callback(err);
	});
};

/**
 * GETTERS
 */
doodle.prototype.getId = function () {
	return this.id;
};

/***********************************\
 *********** FUNCTIONS ************
\***********************************/

/**
 * GETTERS
 */

/**
 * Get the notification ids associated with the doodle
 * @param doodle_id
 * @param callback
 */
doodle.getNotifIds = function (doodle_id, callback) {

	var query = 'SELECT notification_id FROM notifications_by_doodle WHERE doodle_id = ?';
	doodle.db.execute(query, [ doodle_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result.rows);
	});
}

/**
*	Check if the doodle has still somes users left
**/
doodle.checkUsers = function (doodle_id, callback) {

	var query = 'SELECT * FROM Doodle.users_by_doodle WHERE doodle_id = ?';
	doodle.db.execute(query, [ doodle_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		// Still has some users
		if (result.rows.length > 0) {
			return callback(null, true);
		}
		else {
			return callback(null, false);
		}
	});
};

/**
*	Get the statut of the user about the doodle
**/
doodle.getUserAccess = function (id, user_id, callback) {

	var query = 'SELECT admin_statut FROM Doodle.users_by_doodle WHERE doodle_id = ? AND user_id = ?';
	doodle.db.execute(query, [ id, user_id], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		if ( data.rows.length > 0 ) {
			return callback(null, data.rows[0].admin_statut);	
		}
		// The user does not have access to the doodle
		else {
			return callback('The user does not have access to the doodle', null);
		}
	});
};

/**
*	Get the schedule ids assocatied with the doodle
**/
doodle.getScheduleIds = function (id, callback) {

	var query = 'SELECT schedule_id FROM Doodle.schedules_by_doodle WHERE doodle_id = ?';
	doodle.db.execute(query, [ id ], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		// We arrange the format
		var schedule_ids = [];
		for (var key in data.rows) {
			schedule_ids.push(data.rows[key].schedule_id);
		}

		return callback(null, schedule_ids);
	});
};

/**
*	Get all the schedule_ids associated the user on the doodle
**/
doodle.getScheduleIdsFromUser = function (id, user_id, callback) {

	var query = 'SELECT schedule_id FROM Doodle.votes_by_user WHERE doodle_id = ? AND user_id = ?';
	doodle.db.execute(query, [ id, user_id ], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		// We arrange the format
		var schedule_ids = [];
		for (var key in data.rows) {
			schedule_ids.push(data.rows[key].schedule_id);
		}

		return callback(null, schedule_ids);
	});
};

/**
*	Get all the votes of an user about a doodle
**/
doodle.getVotesFromUser = function (id, user_id, callback) {

	var query = 'SELECT schedule_id, vote FROM Doodle.votes_by_user WHERE doodle_id = ? AND user_id = ?';
	doodle.db.execute(query, [ id, user_id ], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		var user_votes = data.rows;
		return callback(null, user_votes);
	});
};

/**
*	Get all informations about a doodle
**/
doodle.getAllInformations = function (id, callback) {

	async.series({
		schedules : function (done) {
			Schedule.getAllSchedulesFromDoodle(id, done);
		},

		users : function (done) {
			User.getUsersWithVotesFromDoodle(id, done);
		},
		participation_requests : function (done) {
			doodle.getParticipationRequests(id, done);
		}
	}, function (err, results) {
		if (err) {
			return callback(err);
		}

		results.id = id;

		return callback(null, results);

	});
};

/**
*	Get the participation requests about the doodle
**/
doodle.getParticipationRequests = function (id, callback) {

	async.waterfall([
		function _getUsersId (done) {
			var query = 'SELECT * FROM doodle_requests_by_doodle WHERE doodle_id = ?';
			doodle.db.execute(query, [ id ], { prepare : true }, function (err, result) {
				if (err) {
					return callback(err);
				}

				return done(null, result.rows);
			});
		},
		function _getUsersInfos (user_ids, done) {
			User.getUsersFromIds(user_ids, done);
		}
	],
	function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result);
	});

};

/**
*	Get the users with theirs votes from an array of ids
**/
doodle.getUsersFromIdsWithVotes = function (id, user_ids, callback) {

	var users = [];

	doodle._processGetUsersFromIdsWithVotes(id, user_ids, users, 0, function (err, users) {
		if (err) {
			return callback(err);
		}

		return callback(null, users);
	});
};

/**
*	Get all the users of a doodle
**/
doodle.getUsers = function (id, callback) {

	doodle.getUsersIds(id, function (err, user_ids) {
		if (err) {
			return callback(err);
		}

		doodle.getUsersFromIds(user_ids, function (err, users) {
			if (err) {
				return callback(err);
			}

			return callback(err, users);
		});

	});
};

/**
*	Get the informations of the users from an array of ids
**/
doodle.getUsersFromIds = function (user_ids, callback) {

	var users = [];

	doodle._processGetUsersFromIds(user_ids, users, 0, function (err, users) {
		if (err) {
			return callback(err);
		}

		return callback(null, users);
	});
};

/**
*	Get all the schedules associated with the doodle
**/
doodle.getSchedules = function (id, callback) {

	async.waterfall([
		function _getScheduleIds (done) {
			var query = 'SELECT schedule_id FROM Doodle.schedules_by_doodle WHERE doodle_id = ?';
			doodle.db.execute(query, [ id ], { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(null, result.rows);
			});
		},
		function _getSchedulesFromIds(schedule_ids, done) {

			var schedules = [];
			async.each(schedule_ids, function (schedule_id, finish) {
				var query = 'SELECT * FROM schedule WHERE id = ?';
				doodle.db.execute(query, [ schedule_id.schedule_id ], { prepare : true }, function (err, result) {
					if (err) {
						return finish(err);
					}

					schedules.push(result.rows[0]);

					return finish(null);
				});
			}, function (err) {
				return done(err, schedules);
			});
		}
	], function (err, result) {
		return callback(err, result);
	});
};

/**
*	Get all the schedules from an array of ids
**/
doodle.getSchedulesFromIds = function (schedule_ids, callback) {

	var schedules = [];

	doodle._processGetSchedulesFromIds(schedule_ids, schedules, 0, function (err, schedules) {
		if (err) {
			return callback(err);
		}

		return callback(null, schedules);
	});
};

/**
*	Get basic informations of a doodle
**/
doodle.get = function (id, callback) {

	var query = 'SELECT * FROM Doodle.doodle WHERE id = ?';
	doodle.db.execute(query, [ id ], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		var doodle_data = data.rows[0];
		return callback(null, doodle_data);
	});
};

/**
*	Get every user ids associated with the doodle
**/
doodle.getUsersIds = function (id, callback) {

	var query = 'SELECT user_id FROM Doodle.users_by_doodle WHERE doodle_id = ?';
	doodle.db.execute(query, [ id ], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		// We arrange the format of the result
		var user_ids = [];
		for ( var key in data.rows ) {
			user_ids.push(data.rows[key].user_id);
		}

		return callback(null, user_ids);
	});
};

/**
*	Get all doodles from their ids and send it back in a array
**/
doodle.getDoodlesFromIds = function (user_id, doodle_ids, callback) {
	var doodles = [];

	doodle._processGetDoodlesFromIds(user_id, doodle_ids, doodles, 0, function (err, doodles) {
		if (err) {
			return callback(err);
		}

		return callback(null, doodles);
	});
};

/**
*	Get the base informations about all doodles of the user
**/
doodle.getDoodlesFromUser = function (user_id, callback) {

	var query = 'SELECT doodle_id FROM Doodle.doodles_by_user WHERE user_id = ?';

	// Get the doodle ids associate to the user
	doodle.db.execute(query, [ user_id ], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		var doodle_ids = [];

		for(var key in data.rows) {
			doodle_ids.push(data.rows[key].doodle_id);
		}

		// Get the doodle informations from every doodle ids
		doodle.getDoodlesFromIds(user_id, doodle_ids, function (err, doodles) {
			if (err) {
			
				return callback(err);
			}

			return callback(null, doodles);
		});
	});
};

/**
*	Check if the user is already associated with the doodle
* 	@return True if the user is already associated, False otherwise
**/
doodle.checkUserAlreadyAssociated = function (id, user_id, callback) {

	var query = 'SELECT * FROM Doodle.users_by_doodle WHERE doodle_id = ? AND user_id = ?';
	doodle.db.execute(query, [ id, user_id ], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		// An user has been found, the user is already associated with the doodle
		if ( data.rows.length > 0 ) {
			return callback(null, true);
		}
		else {
			return callback(null, false);	
		}
	});
};

/**
*	Check with the email if the user is registred
*	Return his id if he is registred, false otherwise
**/
doodle.checkUserByEmail = function (email, callback) {

	User.getIdByEmail(email, function (err, result) {
		if (err) {
			return callback(err);
		}

		// The user is registred
		if ( result ) {
			return callback(null, result.user_id);
		}
		else {
			return callback(null, false);
		}
	});
};

/**
*	Check if the user has access to the doodle
**/
doodle.checkUserAccess = function (id, user_id, callback) {

	var query = 'SELECT * FROM Doodle.users_by_doodle WHERE doodle_id = ? AND user_id = ?';
	doodle.db.execute(query, [ id, user_id ], { prepare : true }, function (err, data) {
		if (err) {
			return callback(err);
		}

		// User found, he still has access to the doodle
		if ( data.rows.length > 0 ) {
			return callback(null, true);
		}
		else {
			return callback(null, false);
		}
	});
};

// SETTERS =================================================================

/**
*	Save several votes associated with the doodle, the user and the schedules
**/
doodle.saveVotes = function (doodle_id, user_id, params, callback) {

	doodle.__processSaveVotes(doodle_id, user_id, params, 0, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Add a new schedule to the doodle
**/
doodle.addSchedule = function (doodle_id, params, callback) {

	var begin_date = moment(params.begin_date);
	var end_date = moment(params.end_date);

	// Create the schedule
	var schedule = new Schedule(begin_date, end_date);

	async.parallel([
		function _saveSchedule(done) {
			schedule.save(doodle_id, done);
		},

		function _generateDefaultVoteForUsersOnSchedule (done) {
			doodle.generateDefaultVoteForUsersOnSchedule(doodle_id, schedule.id, done);
		}
	], function (err) {
		if (err) {
			return callback(err);
		}

		return callback(null);
	});
};

/**
*	Generate a default vote for every user of the doodle on the schedule
**/
doodle.generateDefaultVoteForUsersOnSchedule = function (doodle_id, schedule_id, callback) {

	// Generate a default vote for every user of the doodle on the new schedule
	async.waterfall([
		function _getUsers (done) {
			User.getUsersFromDoodle(doodle_id, done);
		},

		function _generateDefaultVotesForSchedule (users, done) {
			Vote.generateDefaultVoteForSchedule(doodle_id, schedule_id, users, done);
		}
	], function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result);
	});
};

/**
*	Create a new vote concerning the schedule for each user of the doodle
**/
doodle.addDefaultVoteToUsers = function (id, schedule_id, callback) {

	// We get the ids of every user of the doodle
	doodle.getUsersIds(id, function (err, user_ids) {
		if (err) {
			return callback(err);
		}

		// We create the vote for each user
		doodle.__processAddDefaultVoteToUsers(id, schedule_id, user_ids, 0, function (err, result) {
			if (err) {
				return callback(err);
			}

			return callback(null, true);
		});
	});
};

/**
*	Create a new schedule
**/
doodle.createSchedule = function (id, begin_date, end_date, callback) {

	var query = "INSERT INTO Doodle.schedule (id, begin_date, end_date) values (?, ?, ?)";
	doodle.db.execute(query, [ id, begin_date, end_date ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Associate a schedule to a doodle
**/
doodle.associateScheduleToDoodle = function (doodle_id, schedule_id, callback) {

	var query = "INSERT INTO Doodle.schedules_by_doodle (doodle_id, schedule_id) values (?, ?)";
	doodle.db.execute(query, [ doodle_id, schedule_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Delete participation request between the user and the doodle
**/
doodle.declineParticipationRequest = function (id, user_id, callback) {

	var queries = [
		{
			query: 'DELETE FROM doodle_requests_by_user WHERE user_id = ? AND doodle_id = ?',
			params: [ user_id, id ]
		},
		{
			query: 'DELETE FROM doodle_requests_by_doodle WHERE doodle_id = ? AND user_id = ?',
			params: [ id, user_id ]
		}
	];
	doodle.db.batch(queries, { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}
		return callback(null, true);
	});
};

/**
*	Send request to participate to the doodle at the user
**/
doodle.addParticipationRequest = function (id, email, callback) {

	async.waterfall([
		// Check if the user is registred
		function _checkUserByEmail(done) {
			doodle.checkUserByEmail(email, function (err, user_id) {
				if (err) {
					return done(err);
				}

				// The user is not registred
				if (!user_id) {
					return done('The user you tried to add is not registred');
				}
				else {
					return done(null, user_id);
				}
			});
		},
		// Check if there is already a participation request send to this user
		function _checkUserAlreadyAsked (user_id, done) {
			doodle.checkUserAlreadyAsked(id, user_id, function (err, result) {
				if (err) {
					return done(err);
				}

				if (result) {
					return done('You already asked to participate to this user, wait for his response !');
				}
				else {
					return done(null, user_id);
				}
			});
		},
		// Check if the user is already associated with the doodle
		function _checkUserAlreadyAssociated (user_id, done) {
			doodle.checkUserAlreadyAssociated(id, user_id, function (err, result) {
				if (err) {
					return done(err);
				}

				if (result) {
					return done('The user you tried to add is already a member of this doodle');
				}
				else {
					return done(null, user_id);
				}
			});
		},
		function _addParticipationRequest  (user_id, done) {

			var queries = [
				{
					query : 'INSERT INTO doodle_requests_by_user (user_id, doodle_id) values (?, ?)',
					params : [ user_id , id ]
				},
				{
					query : 'INSERT INTO doodle_requests_by_doodle (doodle_id, user_id) values (?, ?)',
					params : [ id, user_id ]
				}
			];
			doodle.db.batch(queries, { prepare : true }, done);
		}
	], function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Check if there is already a participation request between this user and this doodle
**/
doodle.checkUserAlreadyAsked = function (id, user_id, callback) {

	var query = 'SELECT * FROM doodle_requests_by_doodle WHERE doodle_id = ? AND user_id = ?';
	doodle.db.execute(query, [ id, user_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		// Already requested
		if (result.rows.length > 0) {
			return callback(null, true);
		}

		return callback(null, false);
	});

};

/**
*	Associate a public user to a doodle
**/
doodle.addPublicUser = function(id, user_id, callback) {

	doodle.addUserToDoodle(id, user_id, function (err, result) {
		if (err) {
			return callback(err);
		}

		doodle.addDoodleToUser(user_id, id, function (err, result) {
			if (err) {
				return callback(err);
			}

			return callback(null, true);
		});
	});
};

/**
*	Associate an user to a doodle
**/
doodle.addUser = function (id, user_id, callback) {

	async.parallel([
		function _associateDoodleUser (done) {
			doodle.associateDoodleUser(id, user_id, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(null, user_id);
			});
		},
		// For each schedule of the doodle, we add a new undecided votes to the new user
		function _addDefaultVotesToUser (done) {
			doodle.addDefaultVotesToUser(id, user_id, done);
		},
		// Create a user configuration for this doodle
		function _addConfiguration (done) {
			var config = new Configuration(user_id, id);
			config.save(done);
		},
		function _deleteParticipationRequest (done) {
			
			var queries = [
				{
					query: 'DELETE FROM doodle_requests_by_user WHERE user_id = ? AND doodle_id = ?',
					params: [ user_id, id ]
				},
				{
					query: 'DELETE FROM doodle_requests_by_doodle WHERE doodle_id = ? AND user_id = ?',
					params: [ id, user_id ]
				}
			];
			doodle.db.batch(queries, { prepare : true }, done);
		}
	], function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Create the association doodle-user and user-doodle
**/
doodle.associateDoodleUser = function (id, user_id, callback) {

	// We associate user-doodle and doodle-user
	var queries = [
		{
			query : 'INSERT INTO users_by_doodle (doodle_id, user_id, admin_statut) values (?, ?, ?)',
			params : [ id, user_id, 'user' ]
		},
		{
			query : 'INSERT INTO doodles_by_user (user_id, doodle_id) values (?, ?)',
			params : [ user_id, id ]
		}
	];

	doodle.db.batch(queries, { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};


/**
*	Add for each schedules of the doodle new undecied votes to the user 
**/
doodle.addDefaultVotesToUser = function (id, user_id, callback) {

	// We get the schedules
	doodle.getSchedules(id, function (err, schedules) {
		if (err) {
			return callback(err);
		}

		// We create the new votes
		doodle.__processAddDefaultVotesToUser(id, user_id, schedules, 0, function (err, result) {
			if (err) {
				return callback(err);
			}

			return callback(null, true);
		});
	});
};

/**
*	Create the association doodle-user
*	( Table users_by_doodle )
**/
doodle.addUserToDoodle = function (doodle_id, user_id, callback) {

	var query = 'INSERT INTO Doodle.users_by_doodle (doodle_id, user_id) values (?, ?)';
	doodle.db.execute(query, [ doodle_id, user_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Create the association user-doodle
*	( Table doodles_by_user )
**/
doodle.addDoodleToUser = function (user_id, doodle_id, callback) {

	var query = 'INSERT INTO Doodle.doodles_by_user (user_id, doodle_id) values (?, ?)';
	doodle.db.execute(query, [ user_id, doodle_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};


/**
*	Delete a public doodle
**/
doodle.deletePublicDoodle = function (id, admin_link_id, callback) {

	// We delete every user associated with the doodle
	doodle.deleteUsersFromDoodle(id, function (err, result) {
		if (err) {
			return callback(err);
		}

		// We delete the administration link id associated with the doodle
		doodle.deleteLinkId(admin_link_id, function (err, result) {
			if (err) {
				return callback(err);
			}

			// We delete the doodle
			doodle.delete(id, function (err, result) {
				if (err) {
					return callback(err);
				}

				return callback(null, true);
			});
		});
	});
};

/**
*	Delete the association doodle - admin_link_id
**/
doodle.deleteLinkId = function (admin_link_id, callback) {

	var query = 'DELETE FROM Doodle.doodle_by_admin_link_id WHERE admin_link_id = ?';
	doodle.db.execute(query, [ admin_link_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Delete every user associted with the doodle
**/
doodle.deleteUsersFromDoodle = function (id, callback) {

	// We get the user ids associated with the doodle
	doodle.getUsersIds(id, function (err, user_ids) {
		if (err) {
			return callback(err);
		}

		doodle.__processDeleteUsersFromDoodle(user_ids, 0, function (err, result) {
			if (err) {
				return callback(err);
			}

			return callback(null, true);
		});
	});
};

/**
*	Delete all the votes of the doodle
**/
doodle.deleteVotes = function (id, callback) {

	async.parallel ([
		function _deleteVotesByUser (done) {
			var query = 'DELETE FROM Doodle.votes_by_user WHERE doodle_id = ?';
			doodle.db.execute(query, [ id ], { prepare : true }, done);
		},
		function _deleteVotesBySchedule (done) {
			var query = 'DELETE FROM Doodle.votes_by_schedule WHERE doodle_id = ?';
			doodle.db.execute(query, [ id ], { prepare : true }, done);
		}
	], 
	function (err, result) {
		return callback(err);
	});
};

/**
*	Delete a schedule
**/
doodle.deleteSchedule = function (id, schedule_id, callback) {

	// Remove the association doodle-schedule
	var query = 'DELETE FROM Doodle.schedules_by_doodle WHERE doodle_id = ? AND schedule_id = ?';
	doodle.db.execute(query, [ id, schedule_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		// Delete the schedule itself
		query = 'DELETE FROM Doodle.schedule WHERE id = ?';
		doodle.db.execute(query, [ schedule_id ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			// Delete all the votes associated with the schedule in the doodle
			doodle.deleteVotesOfSchedule(id, schedule_id, function (err, result) {
				if (err) {
					return callback(err);
				}

				return callback(null, true);
			});
		});
	});
};

/**
*	Delete all the votes associated with the schedule in the doodle
**/
doodle.deleteVotesOfSchedule = function (id, schedule_id, callback) {

	// We delete the votes on ( Table votes_by_schedule )
	var query = 'DELETE FROM Doodle.votes_by_schedule WHERE doodle_id = ? AND schedule_id = ?';
	doodle.db.execute(query, [ id, schedule_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		// We get every user id associated with the doodle
		doodle.getUsersIds(id, function (err, user_ids) {
			if (err) {
				return callback(err);
			}


			// For every user on the doodle we delete the vote ( Table votes_by_user ) 
			doodle.deleteVoteOnUserFromSchedule(id, schedule_id, user_ids, function (err, result) {
				if (err) {
					return callback(err);
				}

				return callback(null, true);
			});
		});
	});
};

/**
*	Delete the vote associated with the schedule for every user on the doodle
**/
doodle.deleteVoteOnUserFromSchedule = function (id, schedule_id, user_ids, callback) {

	doodle.__processDeleteVoteOnUserFromSchedule(id, schedule_id, user_ids, 0, callback);
};

/**
*	Remove a user from a public doodle = delete the user
**/
doodle.removeUserFromPublicDoodle = function (id, user_id, callback) {

	// We delete the user
	var query = 'DELETE FROM Doodle.user WHERE id = ?';
	doodle.db.execute(query, [ user_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		// We delete all of his associations with doodle and votes
		// We remove the association doodle-user
		var query = 'DELETE FROM Doodle.doodles_by_user WHERE user_id = ? AND doodle_id = ?';
		doodle.db.execute(query, [ user_id, id ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			// We remove the association user-doodle
			query = 'DELETE FROM Doodle.users_by_doodle WHERE doodle_id = ? AND user_id = ?';
			doodle.db.execute(query, [ id, user_id ], { prepare : true }, function (err, result) {
				if (err) {
					return callback(err);
				}

				// We delete every vote associated with the user on the doodle
				doodle.deleteVotesFromUser(id, user_id, function (err, result) {
					if (err) {
						return callback(err);
					}

					return callback(null, true);	
				});
			});
		});
	});
};

/**
*	Remove an user from a doodle
*
**/
doodle.removeUserFromDoodle = function (id, user_id, callback) {

	async.series([
		function _deleteUserIfNotRegistred (done) {
			User.getStatut(id, user_id, function (err, result) {
				if (err) {
					return done(err);
				}

				// Unregistred user, we delete him
				if ( result == 'unregistred' ) {

					var query = 'DELETE FROM user where id = ?';
					doodle.db.execute(query, [ user_id ], { prepare : true }, function (err, result) {
						if (err) {
							return done(err);
						}

						return done(null, true);
					});
				}
				else {
					return done(null);
				}
			});
		},
		function _removeData (done) {
			async.parallel([
		
				function _removeAssociationDoodleUser (done) {
					var query = 'DELETE FROM Doodle.doodles_by_user WHERE user_id = ? AND doodle_id = ?';
					doodle.db.execute(query, [ user_id, id ], { prepare : true }, done);
				},
				function _removeAssociationUserDoodle (done) {
					var query = 'DELETE FROM Doodle.users_by_doodle WHERE doodle_id = ? AND user_id = ?';
					doodle.db.execute(query, [ id, user_id ], { prepare : true }, done);
				},
				function _deleteVotesFromUser (done) {
					doodle.deleteVotesFromUser(id, user_id, done);
				}
			], function (err, result) {
				if (err) {
					return callback(err);
				}

				return callback(null, true);
			});
		},
		function _deleteDoodleIfNoOneLeft (done) {
			// We check if the user was the last one of the doodle
			doodle.getUsersIds(id, function (err, user_ids) {
				if (err) {
					return done(err);
				}

				// No user left associated with the doodle, we delete it
				if ( user_ids.length === 0 ) {
					doodle.delete(id, function (err, result) {
						if (err) {
							return done(err);
						}

						return done(null, false);
					});
				}
				else {
					return done(null, true);
				}
			});
		}
	], function (err, result) {
		if (err) {
			return done(err);
		}
	});
};

/**
*	Delete on the doodle all the votes associated with the user
**/
doodle.deleteVotesFromUser = function (id, user_id, callback) {
	
	// We get the schedules ids associated with the user on that doodle
	doodle.getScheduleIdsFromUser(id, user_id, function (err, schedule_ids) {
		if (err) {
			return callback(err);
		}

		// We remove the votes associated with the user on that doodle ( Table votes_by_user )
		var query = 'DELETE FROM Doodle.votes_by_user WHERE doodle_id = ? AND user_id = ?';
		doodle.db.execute(query, [ id, user_id ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			// We use the schedule_ids to remove the votes associated with the user on that doodle ( Table votes_by_schedule )
			doodle.deleteVoteFromSchedules(id, user_id, schedule_ids,  function (err, result) {
				if (err) {
					return callback(err);
				}

				return callback(null, true);
			});
		});
	});
};

/**
*	Delete the votes associated with the schedules and the user on that doodle
**/
doodle.deleteVoteFromSchedules = function (id, user_id, schedule_ids, callback) {

	doodle.__processDeleteVoteFromSchedules(id, user_id, schedule_ids, 0, function(err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

/**
*	Remove a doodle
**/
doodle.delete = function (id, callback) {

	async.parallel([
		// Delete votes
		function _deleteVotes (done) {
			doodle.deleteVotes(id, done);
		},
		// Delete schedules
		function _deleteSchedules (done) {
			doodle.deleteSchedules(id, done);
		},
		// Delete Participation requests
		function _deleteParticipationRequests (done) {
			doodle.deleteParticipationRequests(id, done);
		},
		// Remove association between users and doodle
		function _removeUsers (done) {
			doodle.removeUsers(id, done);
		},
		// Delete doodle itself
		function _deleteDoodle (done) {
			var query = 'DELETE FROM doodle WHERE id = ?';
			doodle.db.execute(query, [ id ], { prepare : true }, done);
		}
	],	function (err, result) {
			if (err) {
				return callback(err);
			}

			return callback(null, true);
		}
	);
};

/**
*	Remove the association between the doodle and its users
*	Delete the public users associated
**/
doodle.removeUsers = function (id, callback) {

	async.waterfall([
		function _getUserIds (done) {
			doodle.getUsersIds(id, done);
		},
		function (user_ids, done) {
			async.each(user_ids, function (user_id, done) {
				doodle.removeUser(id, user_id, done);
			}, 
			function (err) {
				return done(err);
			});
		}
	],
	function (err) {
		return callback(err);
	});
};

/**
*	Remove the association between the doodle and the user
*	Delete the user if he is public
**/
doodle.removeUser = function (id, user_id, callback) {

	async.parallel([
		function _deleteUserIfPublic (done) {
			var query = 'SELECT statut FROM user WHERE id = ?';
			doodle.db.execute(query, [ user_id ], { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				var statut;
				if (result.rows.length > 0) {
					statut = result.rows[0].statut;
				}				

				if (statut == 'temporary') {
					var query = 'DELETE FROM user WHERE id = ?';
					doodle.db.execute(query, [ user_id ], { prepare : true }, done);
				}
				else {
					return done(null, true);
				}
			});	
		},
		function _removeAssociation (done) {
			doodle.removeAssociation(id, user_id, done);
		}
	], 
	function (err) {
		return callback(err);
	});	
};

/**
*	Remove the association between the doodle and the user
**/
doodle.removeAssociation = function (id, user_id, callback) {
	async.parallel([
		function _removeAssocationDoodlesByUser (done) {
			var query = 'DELETE FROM doodles_by_user WHERE user_id = ? AND doodle_id = ?';
			doodle.db.execute(query, [ user_id, id ], { prepare : true }, done);
		},

		function _removeAssocationUsersByDoodle (done) {
			var query = 'DELETE FROM users_by_doodle WHERE doodle_id = ? AND user_id = ?';
			doodle.db.execute(query, [ id, user_id ], { prepare : true}, done);
		}
	],
	function (err, result) {
		if (err) {
			return callback(err);
		}
		return callback(null, true);
	});
};

/**
*	Delete the participation requests
**/
doodle.deleteParticipationRequests = function (id, callback) {

	async.waterfall([
		function _getUserIdsFromParticipationRequests (done) {
			var query = 'SELECT user_id FROM doodle_requests_by_doodle WHERE doodle_id = ?';
			doodle.db.execute(query, [ id ], { prepare : true }, function (err, result) {
				if (err) {
					return callback(err);
				}

				return done(null, result.rows);
			});
		},
		function _deleteParticipationRequests (user_ids, done) {
			async.each(user_ids, function _deleteParticipationRequest (user_id, finish) {
				doodle.deleteParticipationRequest(id, user_id, finish);
			}, 
			function (err) {
				return done(err);
			});
		}
	],
	function (err) {
		return callback(err);
	});

};

/**
*	Delete the participation request
**/
doodle.deleteParticipationRequest = function (doodle_id, user_id, callback) {

	async.parallel([
		function _deleteDoodleRequestByUser (done) {
			var query = 'DELETE FROM doodle_requests_by_user WHERE user_id = ? AND doodle_id = ?';
			doodle.db.execute(query, [ user_id, doodle_id ], { prepare: true }, done);
		},
		function _deleteDoodleRequestByDoodle (done) {
			var query = 'DELETE FROM doodle_requests_by_doodle WHERE doodle_id = ? AND user_id = ?';
			doodle.db.execute(query, [ doodle_id, user_id ], { prepare : true }, done);
		}
	], function (err) {
		return callback(err);
	});
};

/**
*	Delete every schedules associated with the doodle
**/
doodle.deleteSchedules = function (id, callback) {

	async.waterfall([
		function _getScheduleIds (done) {
			var query = 'SELECT schedule_id FROM schedules_by_doodle WHERE doodle_id = ?';
			doodle.db.execute(query, [ id ], { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(null, result.rows);
			});
		},
		function _deleteAssociationSchedulesDoodle (schedule_ids, done) {
			var query = 'DELETE FROM schedules_by_doodle WHERE doodle_id = ?';
			doodle.db.execute(query, [ id ], { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(null, schedule_ids);
			});
		}, 
		function _deleteSchedules (schedule_ids, done) {
			async.each(schedule_ids, function (schedule_id, finish) {
				var query = 'DELETE FROM schedule WHERE id = ?';
				doodle.db.execute(query, [ schedule_id.schedule_id ], { prepare : true }, finish);
			},
			function (err, result) {
				if (err) {
					return done(err);
				}

				return done(null, true);
			});
		}
	],
	function (err, result) {
		return callback(err, result);
	}
	);
};

/**
*	Remove a doodle from database
**/
doodle.deleteDoodle = function (id, callback) {

	var query = 'DELETE FROM Doodle.doodle WHERE id = ?';
	doodle.db.execute(query, [ id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};


// INTERNAL FUNCTIONS ===============================================================

/**
*	Recursive function to get all the doodles from an array of ids
*	( Table doodle)
**/
doodle._processGetDoodlesFromIds = function (user_id, doodle_ids, doodles, key, callback) {

	if ( doodles.length != doodle_ids.length ) {
		var query = 'SELECT * FROM Doodle.doodle WHERE id = ?';

		var doodle_id = doodle_ids[key];

		doodle.db.execute(query, [ doodle_id ], { prepare : true }, function (err, data) {
			if (err) {
				return callback(err);
			}

			var doodle_data = data.rows[0];

			// We get the statut of the user about the doodle
			query = 'SELECT admin_statut FROM Doodle.users_by_doodle WHERE doodle_id = ? AND user_id = ?';
			doodle.db.execute(query, [ doodle_id, user_id ], { prepare : true }, function (err, user_data) {
				if (err) {
					return callback(err);
				}

				doodle_data.user_statut = user_data.rows[0].admin_statut;

				doodles.push(doodle_data);
				key++;
				doodle._processGetDoodlesFromIds(user_id, doodle_ids, doodles, key, callback);
			});

		});
	}
	else {
		return callback(null, doodles);
	}
};

/**
*	Recursive function to get all the schedules from an array of ids
*	( Table schedule )
**/
doodle._processGetSchedulesFromIds = function (schedule_ids, schedules, key, callback) {

	if ( schedule_ids.length  != schedules.length ) {

		var schedule_id = schedule_ids[key];

		var query = "SELECT * FROM Doodle.schedule WHERE id = ?";
		doodle.db.execute(query, [ schedule_id ], { prepare : true }, function (err, data) {
			if (err) {
				return callback(err);
			}

			schedules.push(data.rows[0]);

			key++;
			doodle._processGetSchedulesFromIds(schedule_ids, schedules, key, callback);
		});
	}
	else {
		return callback(null, schedules);
	}
};

/**
*	Recursive function to get all the users from an array of ids
*	( Table users )
**/
doodle._processGetUsersFromIds = function (user_ids, users, key, callback) {

	if ( user_ids.length != users.length ) {

		var user_id = user_ids[key];

		var query = "SELECT * FROM Doodle.user WHERE id = ?";
		doodle.db.execute(query, [ user_id ], { prepare : true }, function (err, data) {
			if (err) {
				return callback(err);
			}

			users.push(data.rows[0]);
			key++;
			doodle._processGetUsersFromIds(user_ids, users, key, callback);
		});

	}
	else {
		return callback(null, users);
	}
};

/**
*	Recursive function to get all the users and theirs votes from an array of ids
*	( Table users and vote )
**/
doodle._processGetUsersFromIdsWithVotes = function (id, user_ids, users, key, callback) {

	if ( user_ids.length != users.length ) {

		var user_id = user_ids[key];

		// We get the informations of the user
		var query = "SELECT * FROM Doodle.user WHERE id = ?";
		doodle.db.execute(query, [ user_id ], { prepare : true }, function (err, user_data) {
			if (err) {
				return callback(err);
			}

			var user = user_data.rows[0];

			// We get the votes of the user
			doodle.getVotesFromUser(id, user_id, function (err, vote_data) {
				if (err) {
					return callback(err);
				}

				user.votes = vote_data;
				users.push(user);

				key++;
				doodle._processGetUsersFromIdsWithVotes(id, user_ids, users, key, callback);

			});
		});

	}
	else {
		return callback(null, users);
	}
};

/**
*	Recursive function to create for each schedules a new undecided vote 
*	( Table vote )
**/
doodle.__processAddDefaultVotesToUser = function (id, user_id, schedules, key, callback) {

	if ( schedules.length != key ) {

		var schedule_id = schedules[key].id;
		var undecided_vote = 0;

		// We associate vote and user
		var query = 'INSERT INTO Doodle.votes_by_user (doodle_id, user_id, schedule_id, vote) values (?, ?, ?, ?)';
		doodle.db.execute(query, [ id, user_id, schedule_id, undecided_vote ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			// We associate vote and schedule
			query = 'INSERT INTO Doodle.votes_by_schedule (doodle_id, schedule_id, user_id, vote) values (?, ?, ?, ?)';
			doodle.db.execute(query, [ id, schedule_id, user_id, undecided_vote ], { prepare : true }, function (err, result) {
				if (err) {
					return callback(err);
				}

				key++;
				doodle.__processAddDefaultVotesToUser(id, user_id, schedules, key, callback);
			});
		});
	}
	else {
		return callback(null, true);
	}
};

/**
*	Recursive function to create for each user a new undecied vote concerning the schedule
*	( Table vote )
**/
doodle.__processAddDefaultVoteToUsers = function (id, schedule_id, user_ids, key, callback) {

	if ( user_ids.length != key ) {

		var user_id = user_ids[key];
		var undecided_vote = 0;

		// we associate vote and user
		var query = 'INSERT INTO Doodle.votes_by_user (doodle_id, user_id, schedule_id, vote) values (?, ?, ?, ?)';
		doodle.db.execute(query, [ id, user_id, schedule_id, undecided_vote ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			// We associate schedule and vote
			query = 'INSERT INTO Doodle.votes_by_schedule (doodle_id, schedule_id, user_id, vote) values (?, ?, ?, ?)';
			doodle.db.execute(query, [ id, schedule_id, user_id, undecided_vote], { prepare : true }, function (err, result) {
				if (err) {
					return callback(err);
				}

				key++;
				doodle.__processAddDefaultVoteToUsers(id, schedule_id, user_ids, key, callback);
			});
		});
	}
	else {
		return callback(null, true);
	}
};

/**
*	Recursive function to delete the votes associated with the user on the doodle from an array of schedule_ids
*	( Table votes_by_schedule )
**/
doodle.__processDeleteVoteFromSchedules = function (id, user_id, schedule_ids, key, callback) {

	if (schedule_ids.length != key) {

		var schedule_id = schedule_ids[key];

		var query = 'DELETE FROM Doodle.votes_by_schedule WHERE doodle_id = ? AND schedule_id = ? AND user_id = ?';
		doodle.db.execute(query, [ id, schedule_id, user_id ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			key++;
			doodle.__processDeleteVoteFromSchedules(id, user_id, schedule_ids, key, callback);
		});

	}
	else {
		return callback(null, true);
	}
};

/**
*	Recursive function to delete the vote associated with the schedule on every user on the doodle
*	( Table votes_by_user )
**/
doodle.__processDeleteVoteOnUserFromSchedule = function (id, schedule_id, user_ids, key, callback) {
	
	if ( user_ids.length != key ) {

		var user_id = user_ids[key];

		var query = 'DELETE FROM Doodle.votes_by_user WHERE doodle_id = ? AND user_id = ? AND schedule_id = ?';
		doodle.db.execute(query, [ id, user_id, schedule_id ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			key++;
			doodle.__processDeleteVoteOnUserFromSchedule(id, schedule_id, user_ids, key, callback);
		});

	}
	else {
		return callback(null, true);
	}
};

/**
*	Recursive function to save several votes to the doodle
**/
doodle.__processSaveVotes = function (id, user_id, schedules, key, callback) {

	if ( schedules.length != key ) {

		var schedule_id = schedules[key].id;
		var vote = schedules[key].vote;

		// Saving vote in ( Table votes_by_user )
		var query = 'INSERT INTO Doodle.votes_by_user (doodle_id, user_id, schedule_id, vote) values (?, ?, ?, ?)';
		doodle.db.execute(query, [ id, user_id, schedule_id, Number(vote) ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			// Saving vote in ( Table votes_by_schedule )
			query = 'INSERT INTO Doodle.votes_by_schedule (doodle_id, schedule_id, user_id, vote) values (?, ?, ?, ?)';
			doodle.db.execute(query, [ id, schedule_id, user_id, Number(vote) ], { prepare : true }, function (err, result) {
				if (err) {
					return callback(err);
				}

				key++;
				doodle.__processSaveVotes(id, user_id, schedules, key, callback);
			});
		});
	}
	else {
		return callback(null, true);
	}
};

/**
*	Recursive function to delete several users from an array of user_ids
**/
doodle.__processDeleteUsersFromDoodle = function (user_ids, key, callback) {

	if (user_ids.length != key) {

		var user_id = user_ids[key];
		var query = 'DELETE FROM Doodle.user WHERE id = ?';
		doodle.db.execute(query, [ user_id ], { prepare : true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			key++;
			doodle.__processDeleteUsersFromDoodle(user_ids, key, callback);
		});
	}
	else {
		return callback(null, true);
	}
};

module.exports = doodle;

