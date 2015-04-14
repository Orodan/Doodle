// Dependencies -----------------------------------------------
var async = require('async');

/**
*	Constructor
**/
function vote (doodle_id, user_id, schedule_id, vote_value) {

	this.doodle_id = doodle_id;
	this.user_id = user_id;
	this.schedule_id = schedule_id;
	this.vote_value = vote_value;
}

/**
*	Save the vote in db
**/
vote.prototype.save = function (callback) {

	var queries = [
		{
			query: 'INSERT INTO votes_by_user (doodle_id, user_id, schedule_id, vote) values (?, ?, ?, ?)',
			params: [ this.doodle_id, this.user_id, this.schedule_id, Number(this.vote_value) ]
		},
		{
			query: 'INSERT INTO votes_by_schedule (doodle_id, schedule_id, user_id, vote) values (?, ?, ?, ?)',
			params: [ this.doodle_id, this.schedule_id, this.user_id, Number(this.vote_value) ]
		}
	];

	vote.db.batch(queries, { prepare : true }, function (err) {
		return callback(err);
	});
};

/**
*	Get all the votes of the doodle about the user
**/
vote.getVotesFromUser = function (doodle_id, user_id, callback) {

	var query = 'SELECT * FROM votes_by_user WHERE doodle_id = ? AND user_id = ?';

	vote.db.execute(query, [ doodle_id, user_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result.rows);
	});
};

/**
*	Get votes of the doodle for each user 
**/
vote.getVotesForEachUser = function (doodle_id, users, done) {

	async.each(users,
		function _getVotesFromUser (user, done) {
			vote.getVotesFromUser(doodle_id, user.id, function (err, result) {
				if (err) {
					return done(err);
				}

				user.votes = result;
				return done(null);
			});
		},

		function (err) {
			if (err) {
				return done(err);
			}

			return done(null, users);
		}
	);
};

/**
*	Generate a default vote for every users of the doodle on the schedule
**/	
vote.generateDefaultVoteForSchedule = function (doodle_id, schedule_id, users, callback) {

	async.each(users, 
		function (user, done) {
			vote.generateDefaultVote(user, doodle_id, schedule_id, done);
		},

		function (err) {
			if (err) {
				return callback(err);
			}

			return callback(null);
		}
	);

};

/**
*	Associate a default vote for the user on the schedule
**/
vote.generateDefaultVote = function (user, doodle_id, schedule_id, callback) {

	var queries = [
		{
			query : 'INSERT INTO votes_by_user (doodle_id, user_id, schedule_id, vote) values (?, ?, ?, ?)',
			params : [ doodle_id, user.id, schedule_id, default_vote ]
		},
		{
			query : 'INSERT INTO votes_by_schedule (doodle_id, schedule_id, user_id, vote) values (?, ?, ?, ?)',
			params : [ doodle_id, schedule_id, user.id, default_vote ]
		}
	];

	vote.db.batch(queries, { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, result);
	});

};

module.exports = vote;


