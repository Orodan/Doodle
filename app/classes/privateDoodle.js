var doodle = require('./doodle'),
	util = require('util'),
	async = require('async');


function privateDoodle (name, description) {

	doodle.call(this, name, description);

}

util.inherits(privateDoodle, doodle);

privateDoodle.prototype.save = function (user_id, callback) {

	async.series([
		function saveDoodle (done) {
			privateDoodle.super_.prototype.save.call(this, done);
		}.bind(this),

		function associateDoodleUser (done) {

			// We associate user-doodle and doodle-user
			var queries = [
				{
					query : 'INSERT INTO users_by_doodle (doodle_id, user_id, admin_statut) values (?, ?, ?)',
					params : [ this.id, user_id, 'admin' ]
				},
				{
					query : 'INSERT INTO doodles_by_user (user_id, doodle_id) values (?, ?)',
					params : [ user_id, this.id ]
				}
			];

			privateDoodle.super_.db.batch(queries, { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}

				return done(null, result);
			});
		}.bind(this)


	], function (err, result) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

module.exports = privateDoodle;