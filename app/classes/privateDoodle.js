// Dependencies ------------------------------------------
var Doodle = require('./doodle');
var Configuration = require('./configuration');
var util = require('util');
var async = require('async');

/**
*	Constructor
**/
function privateDoodle (name, description) {
	Doodle.call(this, name, description);
}

// Doodle's heritage
util.inherits(privateDoodle, Doodle);

/**
*	Save a private doodle in db
**/
privateDoodle.prototype.save = function (user_id, callback) {

	async.series([
		// Save the doodle itself in db
		function saveDoodle (done) {
			privateDoodle.super_.prototype.save.call(this, done);
		}.bind(this),

		// Associate user-doodle and doodle-user
		function associateDoodleUser (done) {

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
				return done(err);
			});
		}.bind(this),

		// Create a new configuration about the user who just created the doodle and the doodle
		function _createConfiguration (done) {

			var config = new Configuration(user_id, this.id);
			config.save(function (err) {
				return done(err);
			});
		}.bind(this)


	], function (err) {
		return callback(err);
	});
};

module.exports = privateDoodle;