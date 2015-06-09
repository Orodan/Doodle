// Dependencies -----------------------------------------------
var async = require('async');
var moment = require('moment');

var default_vote = -1;

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

	async.waterfall([
		function (done) {
			var query = 'SELECT * FROM votes_by_user WHERE doodle_id = ? AND user_id = ?';

			vote.db.execute(query, [ doodle_id, user_id ], { prepare : true }, function (err, result) {
				if (err) {
					return callback(err);
				}

				return done(null, result.rows);
			});		
		},
		function (votes, done) {
			vote.sortVotes(votes, done);
		}
	], function (err, sortedVotes) {
		if (err) {
			return callback(err);
		}
		return callback(null, sortedVotes);
	});	
};

/**
*	Update the specified votes
**/
vote.updateVotes = function (doodle_id, user_id, votes, callback) {

	async.each(votes, function (_vote, done) {
		
		var queries = [
			{
				query: 'UPDATE votes_by_user SET vote = ? WHERE doodle_id = ? AND user_id = ? AND schedule_id = ?',
				params: [_vote.vote, doodle_id, user_id, _vote.schedule_id ]
			},
			{
				query: 'UPDATE votes_by_schedule SET vote = ? WHERE doodle_id = ? AND schedule_id = ? AND user_id = ?',
				params: [_vote.vote, doodle_id, _vote.schedule_id, user_id ]
			}
		];
		vote.db.batch(queries, { prepare : true }, function (err, result) {
			return done(err);
		});
	}, function (err) {
		return callback(err);
	});
};

/** 
*	Sort the votes according to the time of the schedule associated
**/
vote.sortVotes = function (votes, callback) {

	console.log("votes : ", votes);

	async.each(votes, function (_vote, done) {
		var query = 'SELECT begin_date from schedule where id = ?';
		vote.db.execute(query, [ _vote.schedule_id ], { prepare : true }, function (err, result) {

			console.log("schedule id : ", _vote.schedule_id);
			console.log("ERROR : ", err);

			_vote.begin_date = moment(result.rows[0].begin_date);

			return done(err);
		});
	}, function (err) {

		if (err) {
			return callback(err);
		}

		votes.sort(function (vote1, vote2) {
			if (vote1.begin_date.isAfter(vote2.begin_date)) {
				return 1;
			}
			else if (vote1.begin_date.isBefore(vote2.begin_date)) {
				return -1;
			}
			return 0;
		});

		return callback(null, votes);
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
			vote.generateDefaultVote(user.id, doodle_id, schedule_id, done);
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
vote.generateDefaultVote = function (user_id, doodle_id, schedule_id, callback) {

	var queries = [
		{
			query : 'INSERT INTO votes_by_user (doodle_id, user_id, schedule_id, vote) values (?, ?, ?, ?)',
			params : [ doodle_id, user_id, schedule_id, default_vote ]
		},
		{
			query : 'INSERT INTO votes_by_schedule (doodle_id, schedule_id, user_id, vote) values (?, ?, ?, ?)',
			params : [ doodle_id, schedule_id, user_id, default_vote ]
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


