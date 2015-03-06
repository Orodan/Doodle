// dependencies ===============================================================
var async = require('async');

/**
*	Construtor
**/
function schedule () {}

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

				schedules.push(result);

				return done(null);
			});
		}, 

		function (err) {
			if (err) {
				return callback(err);
			}

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


