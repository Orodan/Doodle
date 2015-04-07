var util = require('util');
var user = require('./user');
var async = require('async');

function publicUser (first_name, last_name) {

	user.call(this, null, first_name, last_name);

	this.statut = 'temporary';
}

util.inherits(publicUser, user);

publicUser.prototype.save = function (doodle_id, callback) {

	async.series([
		function (done) {
			// We save the general informations about the user
			publicUser.super_.prototype.save.call(this, done);
		}.bind(this),

		function (done) {
			// We save the association user-doodle and doodle-user
			var queries = [
				{
					query : 'INSERT INTO users_by_doodle (doodle_id, user_id, admin_statut) values (?, ?, ?)',
					params : [ doodle_id, this.id , 'unregistred' ]
				},
				{
					query : 'INSERT INTO doodles_by_user (user_id, doodle_id) values (?, ?)',
					params : [ this.id, doodle_id ]
				}
			];

			publicUser.super_.db.batch(queries, { prepare : true }, function (err, result) {
				if (err) {
					return done(err);
				}
				
				return done(null, result);
			});
		}.bind(this)
	], function (err, results) {
		if (err) {
			return callback(err);
		}

		return callback(null, true);
	});
};

module.exports = publicUser;