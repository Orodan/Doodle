var async = require('async');


function vote () {}

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

module.exports = vote;


