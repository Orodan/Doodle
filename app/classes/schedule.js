// dependencies ===============================================================
var async = require('async');
var Vote = require('./vote');
var moment = require('moment');

/**
*	Construtor
**/
function schedule (begin_date, end_date) {

	this.id = schedule.uuid();
	this.begin_date = begin_date;
	this.end_date = end_date;
}

schedule.lang = 'en';

/**
*	Save the schedule in database
**/
schedule.prototype.save = function (doodle_id, callback) {

	async.parallel([
		function _saveSchedule (done) {

			var query = 'INSERT INTO schedule (id, begin_date, end_date) values (?, ?, ?)';
			schedule.db.execute(query, [ this.id, this.begin_date.format(), this.end_date.format() ], { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(null, result);
			});
		}.bind(this),

		function _associateScheduleToDoodle (done) {

			var query = 'INSERT INTO schedules_by_doodle (doodle_id, schedule_id) values (?, ?)';
			schedule.db.execute(query, [ doodle_id, this.id ], { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(null,  result);
			});
		}.bind(this)
	],
	function (err) {
		if (err) {
			return callback(err);
		}

		return callback(null);
	});
};

/**
*	Get the schedule
**/
schedule.get = function (id, callback) {

	var query = 'SELECT * FROM schedule WHERE id = ?';

	schedule.db.execute(query, [ id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result.rows[0]);
	});
};

/**
*	Delete the specified schedule
**/
schedule.delete = function (doodle_id, schedule_id, callback) {

	var queries = [
		{
			query: 'DELETE FROM Schedule WHERE id = ?',
			params: [ schedule_id ]
		},
		{
			query: 'DELETE FROM schedules_by_doodle WHERE doodle_id = ? AND schedule_id = ?',
			params: [ doodle_id, schedule_id ]
		}
	];

	schedule.db.batch(queries, { prepare : true }, function (err) {
		return callback(err);
	});
};

/**
*	Get the schedules of the doodle
**/
schedule.getAllSchedulesFromDoodle = function (doodle_id, callback) {

	async.waterfall([
		function _getScheduleIds (done) {
			schedule.getScheduleIds(doodle_id, done);
		},

		function _getSchedulesFromIds (schedule_ids, done) {
			schedule.getSchedulesFromIds(schedule_ids, done);			
		}
	], function (err, results) {
		if (err) {
			return callback(err);
		}

		return callback(null, results);
	});
};

/**
*	Get schedules from schedule ids
**/
schedule.getSchedulesFromIds = function (schedule_ids, callback) {

	var schedules = [];

	async.each(schedule_ids, 
		function (schedule_id, done) {
			schedule.get(schedule_id.schedule_id, function (err, result) {
				if (err) {
					return done(err);
				}

				result.begin_date = moment(result.begin_date);
				result.end_date = moment(result.end_date);

				result.begin_date.locale(schedule.lang);
				result.end_date.locale(schedule.lang);


				schedules.push(result);

				return done(null);
			});
		}, 

		function (err) {
			if (err) {
				return callback(err);
			}

			// Sort the tab
			schedules.sort(function (schedule1, schedule2) {
				if ( schedule1.begin_date < schedule2.begin_date ) {
					return -1;
				}
				else if (schedule1.begin_date > schedule2.begin_date ) {
					return 1;
				}

				return 0;
			});

			return callback(null, schedules);
		}
	);
};

/**
*	Get schedules ids of a doodle
**/
schedule.getScheduleIds = function (doodle_id, callback) {

	var query = 'SELECT schedule_id FROM schedules_by_doodle WHERE doodle_id = ?';
	schedule.db.execute(query, [ doodle_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result.rows);
	});
};



module.exports = schedule;


