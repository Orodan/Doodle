var util = require('util');
var async = require('async');

function participationRequest (doodle_id, user_id) {

	this.doodle_id = doodle_id;
	this.user_id = user_id;
}

participationRequest.prototype.save = function (callback) {

	async.series([
		// Useless
		function _verifyUserId (done) {

			var query = 'SELECT id FROM user WHERE id = ?';
			participationRequest.db.execute(query, [ this.user_id ], { prepare : true }, function (err, result) {

				if (err) {
					return done(err);
				}

				if (result.rows.length === 0) {
					return done('No user with that id');
				}

				return done(null, true);
			});
		}.bind(this),

		// Useless
		function _verifyDoodleId (done) {

			var query = 'SELECT id FROM doodle WHERE id = ?';
			participationRequest.db.execute(query, [ this.doodle_id ], { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				if (result.rows.length === 0) {
					return done('No doodle with that id');
				}

				return done(null, true);
			});
		}.bind(this),

		// Check if there is already a participation request on this doodle for the specified user
		function _checkIfNoParticipationRequestAlreadySent (done) {

			var query = 'SELECT * FROM doodle_requests_by_doodle WHERE doodle_id = ? AND user_id = ?';
			participationRequest.db.execute(query, [ this.doodle_id, this.user_id ], { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				if (result.rows.length !== 0) {
					return done('A participation request already exist on this doodle for the specified user');
				}

				return done(null);
			});
		}.bind(this),

		function _process (done) {
			var queries = [
				{
					query: 'INSERT INTO doodle_requests_by_user (user_id, doodle_id) values (?, ?)',
					params: [ this.user_id, this.doodle_id ]
				},
				{
					query: 'INSERT INTO doodle_requests_by_doodle (doodle_id, user_id) values (?, ?)',
					params: [ this.doodle_id, this.user_id ]
				}
			];
			participationRequest.db.batch(queries, { prepare : true }, function (err) {
				if (err) {
					return done(err);
				}

				return done(null, true);
			});
		}.bind(this)

	], function (err) {
		if (err) {
			return callback(err);	
		}

		return callback(null, true);
		
	});
};

module.exports = participationRequest;