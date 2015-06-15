// Dependencies ------------------------------------------
var Doodle = require('./doodle');
var util = require('util');
var async = require('async');

/**
 * Constructor
 * @param name
 * @param description
 */
function publicDoodle (name, description) {
    Doodle.call(this, name, description);

    this.category = 'public';
}

// Doodle's heritage
util.inherits(publicDoodle, Doodle);


/**********************************\
 ***** PROTOTYPAL FUNCTIONS ******
\**********************************/

/**
 * Save the doodle in db
 * @param callback
 * @returns {*}
 */
publicDoodle.prototype.save = function (callback) {

    publicDoodle.super_.prototype.save.call(this, callback);
};

/**
 * Add the schedules to the doodle
 * @param doodle_id
 * @param schedules
 * @param callback
 */
publicDoodle.prototype.addSchedules = function (schedules, callback) {

    var doodle_id = publicDoodle.super_.prototype.getId.call(this);

    async.each(schedules, function _saveSchedule (schedule, done) {
        publicDoodle.super_.addSchedule(doodle_id, schedule.begin_date, schedule.end_date, done);
    }, function (err) {
        return callback(err);
    });
};

/**
 * Generate access links to the doodle
 * @param callback
 */
publicDoodle.prototype.generateLinks = function (callback) {

    var admin_link_id = publicDoodle.super_.uuid();
    var doodle_id = publicDoodle.super_.prototype.getId.call(this);

    var query = 'INSERT INTO Doodle.doodle_by_admin_link_id (admin_link_id, doodle_id) values (?, ?)';
    publicDoodle.super_.db.execute(query, [ admin_link_id, doodle_id ], { prepare : true }, function (err) {
        if (err) {
            return callback(err);
        }

        var data = {};
        data.admin_link_id = admin_link_id;
        data.user_link_id = doodle_id;

        return callback(null, data);
    });
};

/***********************************\
 *********** FUNCTIONS ************
\***********************************/

/*********************\
 ****** GETTERS ******
\*********************/

/**
 * Get the doodle_id
 * @param admin_link_id
 */
publicDoodle.getDoodleIdFromAdminLinkId = function (admin_link_id, callback) {

    var query = 'SELECT doodle_id FROM doodle_by_admin_link_id WHERE admin_link_id = ?';
    publicDoodle.super_.db.execute(query, [ admin_link_id ], { prepare : true }, function (err, result) {
        if (err) {
            return callback(err);
        }

        if (result.rows.length === 0) {
            return callback();
        }

        return callback(null, result.rows[0].doodle_id);
    });
};


/**
 * Check the link id
 * @param link_id
 * @param callback
 * @return  administrator   -> the link id is a administrator link
 *          user            -> the link id is a user link
 *          null            -> the link id is not referenced
 */
publicDoodle.checkLinkId = function (link_id, callback) {

    var response = null;
    var query = 'SELECT * FROM Doodle.doodle_by_admin_link_id WHERE admin_link_id = ?';
    async.series([
        function _checkIfAdmin (done) {
            publicDoodle.getDoodleIdFromAdminLinkId(link_id, function (err, result) {
                if (err) {
                    return done(err);
                }

                // Admin link
                if (result) {
                    response = 'administrator';
                }

                return done();
            });
        },
        function _checkIfUser (done) {
            // Link already found
            if (response) {
                return done();
            }

            publicDoodle.super_.get(link_id, function (err, result) {
                if (err) {
                    return done(err);
                }

                // User link
                if (result) {
                    response = 'user';
                }

                return done();
            });
        }
    ], function (err) {
        return callback(err, response);
    });
};

/**
 * Get the doodle id from the admin link id
 * @param admin_link_id
 * @param callback
 */
publicDoodle.getAllInformationsFromAdminLinkId = function (admin_link_id, callback) {

    async.waterfall([
        function _getDoodleId (done) {
            var query = 'SELECT doodle_id FROM Doodle.doodle_by_admin_link_id WHERE admin_link_id = ?';
            publicDoodle.super_.db.execute(query, [ admin_link_id ], { prepare : true }, function (err, data) {
                if (err) {
                    return done(err);
                }

                var doodle_id = data.rows[0].doodle_id;
                return done(null, doodle_id);
            });
        },
        function _getInformations (doodle_id, done) {
            publicDoodle.super_.getAllInformations(doodle_id, function (err, data) {
                if (err) {
                    return done(err);
                }

                return done(null, data);
            });
        }
    ], function (err, result) {
        return callback(err, result);
    });
};

/**
 * Get all informations about the doodle
 * @param doodle_id
 * @param callback
 */
publicDoodle.getAllInformations = function (doodle_id, callback) {
    publicDoodle.super_.getAllInformations(doodle_id, function (err, data) {
        if (err) {
            return callback(err);
        }

        return callback(null, data);
    });
};

module.exports = publicDoodle;