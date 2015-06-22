// Dependencies -----------------------------------------------
var async = require('async');
var moment = require('moment');

/**
 * Constructor
 */
function validator () {}

/**
*   Check if the id math data in db
**/
validator.exists = function (id, type, error_msg, callback) {
    var query = 'SELECT * FROM ' + type + ' WHERE id = ?';
    validator.db.execute(query, [ id ], { prepare : true }, function (err, result) {
        if (err || result.rows.length === 0) {
            return callback(error_msg, false);
        }

        return callback(null, true);
    });
};

/**
*   Check if the user data are valid
**/
validator.validUser = function (user_data, callback) {

    var errors = [];

    async.series([
        // Validate email is defined, a string, and not already used
        function _validEmail (done) {

            if (!validator.isDefined(user_data.email)) {
                errors.push('Email is not defined.');
                return done();
            }

            if (!validator.is(user_data.email, 'string')) {
                errors.push('Expected email to be a string.');
                return done();
            }

            var query = 'SELECT * FROM user_by_email WHERE email = ?';
            validator.db.execute(query, [ user_data.email ], { prepare : true }, function (err, result) {
                if (err) {
                    errors.push('An error occured with the databse');
                    // If there is an error with the db, we stop the validating process now
                    return done(true);
                }

                // Email already used
                if (result.rows.length > 0) {
                    errors.push('Email already in use.');
                }

                return done();
            })
        },

        // Validate first name is defined and a string
        function _validFirstName (done) {
            validator.validFirstName(user_data.first_name, function (err) {
                if (err) {
                    errors.push(err);
                }

                return done();
            });
        },

        // Validate last name is defined and a string
        function _validLastName (done) {
            validator.validLastName(user_data.last_name, function (err) {
                if (err) {
                    errors.push(err);
                }

                return done();
            });
        },

        // Validate password is defined and a string
        function _validPassword (done) {
            if (!validator.isDefined(user_data.password)) {
                errors.push('Password is not defined.');
                return done();
            }

            if (!validator.is(user_data.password, 'string')) {
                errors.push('Expected password to be a string.');
                return done();
            }

            return done();
        }

    ], function () {
        if (errors.length > 0) {
            return callback(errors);
        }

        return callback();
    });
};

/**
*   Check if the first name is defined and valid (string)
**/
validator.validFirstName = function (first_name, callback) {
    if (!validator.isDefined(first_name)) {
        return callback('First name is not defined.');
    }

    if (!validator.is(first_name, 'string')) {
        return callback('Expected first name to be a string.');
    }

    return callback();
};

/**
*   Check if the last name is defined and valid (string)
**/
validator.validLastName = function (last_name, callback) {
    if (!validator.isDefined(last_name)) {
        return callback('Last name is not defined.');
    }

    if (!validator.is(last_name, 'string')) {
        return callback('Expected last name to be a string.');
    }

    return callback();
};

/**
*   Check if the first name and the last name of the public user are defined and correct
**/
validator.validPublicUser = function (user_data, callback) {

    var errors = [];

    async.series([
        // Validate user data are defined
        function _dataDefined (done) {
            if (!validator.isDefined(user_data)) {
                // If no user data are defined, we stop the valdiating process now
                return done('No public user defined.');
            }

            return done();
        },

        // Validate first name is defined and a string
        function _validFirstName (done) {
            validator.validFirstName(user_data.first_name, function (err) {
                if (err) {
                    errors.push(err);
                }

                return done();
            });
        },

        // Validate last name is defined and a string
        function _validLastName (done) {
            validator.validLastName(user_data.last_name, function (err) {
                if (err) {
                    errors.push(err);
                }

                return done();
            });
        }
    ], function (err) {
        if (err) {
            errors.push(err);
        }

        if (errors.length > 0) {
            return callback(errors);
        }

        return callback();
    });
};

/**
*   Check if the doodle data are valid
**/
validator.validDoodle = function (doodle_data, callback) {

    var errors = [];

    async.series([
        // Check if the name is defined and a string
        function _checkName (done) {

            if (validator.isDefined(doodle_data.name)) {
                if (!validator.is(doodle_data.name, 'string')) {
                    errors.push('Expect name to be a string.');
                }
            }
            else {
                errors.push('Name is not defined.');
            }

            return done();
        },

        function _checkDescription (done) {
            if (validator.isDefined(doodle_data.description)) {
                if (!validator.is(doodle_data.description, 'string')) {
                    errors.push('Expect description to be a string.');
                }
            }
            else {
                errors.push('Description is not defined.');
            }

            return done();
        }
    ], function () {
        if (errors.length > 0) {
            return callback(errors);
        }

        return callback();
    });
};

/**
*   Check if the public doodle data are valid
**/
validator.validPublicDoodle = function (doodle_data, callback) {

    // Use validDoodle to valid name and description
    // For each schedule of the data, use validSchedule to valid begin and end date

    async.series([
        // Validate name and description
        function _validNameAndDescription (done) {
            validator.validDoodle(doodle_data, done);
        },

        function _validSchedules (done) {
            if (validator.isDefined(doodle_data.schedules)) {

                async.each(doodle_data.schedules, function _validSchedule (schedule, end) {
                    validator.validSchedule(schedule, end)
                },
                function (err) {
                    return done(err);
                });

            }
            else {
                return done();
            }
        }
    ], function (err) {
        return callback(err);
    });
};

/**
*   Check if the doodle id is a correct uuid and match a public doodle
**/
validator.validPublicDoodleId = function (doodle_id, callback) {

    var query = 'SELECT * FROM doodle WHERE id = ?';
    validator.db.execute(query, [ doodle_id ], { prepare : true }, function (err, result) {
        if (err || result.rows.length === 0) {
            return callback('Invalid public doodle id.', false);
        }

        // Not a public doodle
        if (result.rows[0].category != 'public') {
            return callback("This doodle is not public.", false);
        }

        return callback(null, true);
    });

};

/**
*   Check if all the votes for the public doodle are correctly defined and valid
**/
validator.validPublicVotes = function (doodle_id, votes_data, callback) {

    // Récupération des ids des créneaux du doodle
    // Pour chacun de ces ids, vérifier qu'il y a bien un vote dans les données qui match
    // Vérifier la validité de ce vote.

    var errors = [];

    async.waterfall([
        function _VotesDataDefined (done) {
            if (!validator.isDefined(votes_data)) {
                return done('No votes defined.');
            }

            return done();
        },

        // Get schedule id(s) of the doodle
        function _getScheduleIds (done) {
            var query = 'SELECT schedule_id FROM schedules_by_doodle WHERE doodle_id = ?';
            validator.db.execute(query, [ doodle_id ], { prepare : true }, function (err, result) {
                if (err) {
                    // If an error occured with the db, we stop the validating process now
                    return done(err);
                }

                // Better format
                var schedule_ids = [];
                async.each(result.rows, function (schedule_data, end) {
                    schedule_ids.push(schedule_data.schedule_id);
                    return end();
                }, function (err) {
                    if (err) {
                        errors.push(err);
                    }
                    return done(null, schedule_ids);
                });
            });
        },

        // For each schedule of the doodle, check if there is a valid vote from the user
        function _checkScheduleIds (schedule_ids, done) {

            async.each(schedule_ids, function _validateSchedule (schedule_id, end) {

                var voteMatchSchedule = false;

                async.waterfall([

                    // Check if there is a vote from the votes data which match the schedule
                    function _voteMatchSchedule (finish) {

                        var concerned_vote = null;

                        async.each(votes_data, function (vote_data, _callback) {
                            if (vote_data.schedule_id == schedule_id) {
                                voteMatchSchedule = true;
                                concerned_vote = vote_data;
                            }

                            return _callback();
                        }, function (err) {
                            if (err) {
                                errors.push(err);
                            }

                            // No vote defined for this schedule
                            if (voteMatchSchedule === false) {
                                errors.push('No vote defined for the schedule with the id : ' + schedule_id);
                            }

                            return finish(null, concerned_vote);
                        });
                    },

                    // Check if the vote is valid for this schedule
                    function _validVote (concerned_vote, finish) {
                        if (voteMatchSchedule) {
                            validator.validVote(doodle_id, concerned_vote, function (err) {
                                if (err) {
                                    errors.push(err + ' ( concerning the vote for the schedule with the id : ' + schedule_id + ')');
                                }

                                return finish();
                            });
                        }
                        else {
                            return finish();
                        }
                    }
                ], function (err) {
                    return end(err);
                });
            }, function (err) {
                return done(err);
            });
        }

    ], function (err) {
        if (err) {
            errors.push(err);
        }

        if (errors.length > 0) {
            return callback(errors);
        }

        return callback();
    });


};

/**
*   Check if the vote data are valid
**/
validator.validVote = function (doodle_id, vote_data, callback) {

    var errors = [];

    async.series([

        // Validate the schedule id is defined, is a correct uuid and match a schedule
        function _validScheduleId (done) {

            if (validator.isDefined(vote_data.schedule_id)) {
                if (!validator.is(vote_data.schedule_id, 'string')) {
                    errors.push('Expect schedule id to be a string.');
                }
            }
            else {
                errors.push('Schedule id is not defined.');
            }

            return done();
        },

        // Validate the schedule is match a schedule from the doodle specified
        function _validScheduleIsFromDoodle (done) {

            console.log("_validScheduleIsFromDoodle");

            var query = 'SELECT * FROM schedules_by_doodle WHERE doodle_id = ? AND schedule_id = ?';
            validator.db.execute(query, [ doodle_id, vote_data.schedule_id ], { prepare : true }, function (err, result) {
                if (err) {
                    errors.push(err);
                    return done(true);
                }

                console.log("RESULT : ", result);

                if (result.rows.length === 0) {
                    errors.push('This schedule does not belong to this doodle.');
                }

                return done();
            });
        },

        // Validate the vote value is defined and is boolean
        function _validVote (done) {

            if (validator.isDefined(vote_data.vote)) {
                if (!validator.is(vote_data.vote, 'number')) {
                    errors.push('Expect vote value to be a number.');
                }
            }
            else {
                errors.push('Vote value is not defined.');
            }

            return done();
        }

    ], function() {
        if (errors.length > 0) {
            return callback(errors);
        }

        return callback();
    });
};

/**
*   Check if the schedule data are valid
**/
validator.validSchedule = function (schedule_data, callback) {

    var errors = [];

    async.series([
        // Validate if the schedule object is defined
        function _checkEmptyObject (done) {
            if (!validator.isDefined(schedule_data)) {
                errors.push('No schedule');
                // If there is no schedule, we stop the validating process now
                return done(true);
            }

            return done();
        },

        // Validate the begin date
        function _validBeginDate (done) {
            if (validator.isDefined(schedule_data.begin_date)) {
                if (!moment(schedule_data.begin_date).isValid()) {
                    errors.push('Invalid begin date.');
                }
            }
            else {
                errors.push('begin_date is not defined.');
            }

            return done();
        },

        // Validate the end date
        function _validEndDate (done) {
            if (validator.isDefined(schedule_data.end_date)) {
                if (!moment(schedule_data.end_date).isValid()) {
                    errors.push('Invalid end date.');
                }
            }
            else {
                errors.push('end_date is not defined.');
            }

            return done();
        }

    ], function (err) {
        if (errors.length > 0) {
            return callback(errors);
        }

        return callback();
    });
}

/**
*   Check if the admin id match a doodle
**/
validator.validAdminId = function (admin_id, callback) {

    var query = 'SELECT * FROM doodle_by_admin_link_id WHERE admin_link_id = ?';
    validator.db.execute(query, [ admin_id ], { prepare : true }, function (err, result) {
        if (err || result.rows.length === 0) {
            return callback('Invalid admin id');
        }

        return callback();
    });
};

/**
*   Check if the user id is a correct uuid and match a user who is public
**/
validator.validPublicUserId = function (user_id, callback) {

    var query = 'SELECT * FROM user WHERE id = ?';
    validator.db.execute(query, [ user_id ], { prepare : true }, function (err, result) {
        if (err || result.rows.length === 0) {
            return callback('Invalid user id.');
        }

        if (result.rows[0].statut != 'temporary') {
            return callback('This user is not public.');
        }

        return callback();
    })
};

/**
*   Check if the user is invated to participate to the doodle
**/
validator.isInvated = function (doodle_id, user_id, callback) {

    var query = 'SELECT * FROM doodle_requests_by_user WHERE user_id = ? AND doodle_id = ?';
    validator.db.execute(query, [ request_data.user_id, doodle_id ], { prepare : true }, function (err, result) {
        if (err) {
            return callback(err);
        }

        // User already invated
        if (result.rows.length === 0) {
            return callback('This user is not invated to participate to this doodle.');
        }

        return callback();
    });
};

/**
*   Check if the configuration is valid
**/
validator.validConfig = function (data, callback) {

    var errors = [];

    async.series([
        // Check if there is a doodle id and if this id match a doodle
        function _validDoodleId (done) {
            if (validator.isDefined(data.doodle_id)) {
                validator.exists(data.doodle_id, 'doodle', 'Invalid doodle id', function (err) {
                    if (err) {
                        errors.push(err);
                    }

                    return done();
                });
            }
            else {
                errors.push('No doodle id specified.');
                // If there is no doodle_id, we stop the validating process now
                return done(true);
            }
        },

        function _checkConfiguration (done) {
            if (validator.isDefined(data.configuration)) {
                if (validator.isEmptyObject(data.configuration)) {
                    errors.push('Configuration is empty');
                }
            }
            else {
                errors.push('No configuration');
                // If there is no configuration, we stop the validating process now
                return done(true);
            }

            return done();
        },
        function _checkNotification (done) {
            if (validator.isDefined(data.configuration.notification)) {
                if (!validator.is(data.configuration.notification, 'boolean')) {
                    errors.push('Expect notification to be a boolean.');
                }
            }

            return done();
        },
        function _checkNotificationByEmail (done) {
            if (validator.isDefined(data.configuration.notification_by_email)) {
                if (!validator.is(data.configuration.notification_by_email, 'boolean')) {
                    errors.push('Expect notification_by_email to be a boolean.');
                }
            }

            return done();
        }
    ], function () {
        if (errors.length > 0) {
            return callback(errors);
        }

        return callback(null, true);
    });
};

/**
*   Check if the participation request data is valid
**/
validator.validParticipationRequest = function (doodle_id, request_data, callback) {

    async.series([
        // Check if the user_id is defined and match an user
        function _exists (done) {
            if (validator.isDefined(request_data.user_id)) {
                validator.exists(request_data.user_id, 'user', 'Invalid user id', done);
            }
            else {
                return done('Participation request is empty, you must give an user id');
            }
        },

        // Check if the user already invated
        function _alreadyInvated (done) {

            var query = 'SELECT * FROM doodle_requests_by_user WHERE user_id = ? AND doodle_id = ?';
            validator.db.execute(query, [ request_data.user_id, doodle_id ], { prepare : true }, function (err, result) {
                if (err) {
                    return done(err);
                }

                // User already invated
                if (result.rows.length > 0) {
                    return done('This user is already invated to participate to this doodle.');
                }

                return done(null, true);
            });
        },

        function _alreadyParticipant (done) {

            var query = 'SELECT * FROM users_by_doodle WHERE doodle_id = ? AND user_id = ?';
            validator.db.execute(query, [ doodle_id, request_data.user_id ], { prepare : true }, function (err, result) {
                if (err) {
                    return done(err);
                }

                // User already participate
                if (result.rows.length > 0) {
                    return done('This user already participate to this doodle.');
                }

                return done(null, true);
            });
        }
    ], function (err) {
        return callback(err);
    });
}

/**
*   Check if the object is empty
**/
validator.isEmptyObject = function(obj) {
    return !Object.keys(obj).length;
};

/**
*   Check if the element is defined
**/
validator.isDefined = function (element) {
    return (typeof element != 'undefined');
};

/**
*   Check if the type of the element is the same as the type specified
**/
validator.is = function (element, type) {
    return (typeof element === type);
};

/*
*   Check if the id match a public doodle
**/
validator.isPublic = function (doodle_id, callback) {
    var query = 'SELECT category FROM doodle WHERE id = ?';
    validator.db.execute(query, [ doodle_id ], { prepare : true }, function (err, result) {
        if (err) {
            return callback(err);
        }

        if (result.rows[0].category != 'public') {
            return callback('This doodle is not public');
        }

        return callback(null, true);
    });
};

/**
*   Check if the user has access to the doodle
**/
validator.userAccess = function (user_id, doodle_id, callback) {

    var query = 'SELECT * FROM users_by_doodle WHERE doodle_id = ? AND user_id = ?';
    validator.db.execute(query, [ doodle_id, user_id ], { prepare : true }, function (err, result) {
        if (err) {
            return callback(err);
        }

        if (result.rows.length === 0) {
            return callback("You don't have access to this doodle.");
        }

        return callback(null, true);
    });
};

/**
*   Check if the user has access to the notification
**/
validator.userAccessToNotification = function (user_id, notification_id, callback) {

    var query = 'SELECT * FROM notifications_by_user WHERE user_id = ? AND notification_id = ?';
    validator.db.execute(query, [ user_id, notification_id ], { prepare : true }, function (err, result) {
        if (err) {
            return callback(err);
        }

        if (result.rows.length === 0) {
            return callback("You don't have access to this notification");
        }

        return callback();
    });
};

/**
*   Check if the user administrate the doodle
**/
validator.userPermission = function (user_id, doodle_id, callback) {

    var query = 'SELECT admin_statut FROM users_by_doodle WHERE doodle_id = ? AND user_id = ?';
    validator.db.execute(query, [ doodle_id, user_id ], { prepare : true }, function (err, result) {
        if (err) {
            return callback(err);
        }

        if (result.rows[0].admin_statut != 'admin') {
            return callback('You are not admin of this doodle.');
        }

        return callback(null, true);
    });
};

/**
*	Check if the user is invated to participate to the doodle
**/
validator.isInvated = function (doodle_id, user_id, callback) {

	var query = 'SELECT * FROM doodle_requests_by_user WHERE user_id = ? AND doodle_id = ?';
	validator.db.execute(query, [ user_id, doodle_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		// No participation request for this user about the doodle
		if (result.rows.length === 0) {
			return callback('You are not invated to participate to this doodle.');
		}

		return callback(null, true);
	});
};

/**
*	Check if the user already participate to the doodle
**/
validator.alreadyParticipate = function (doodle_id, user_id, callback) {

	var query = 'SELECT * FROM users_by_doodle WHERE doodle_id = ? AND user_id = ?';
	validator.db.execute(query, [ doodle_id, user_id ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		// The user does not participate to the doodle
		if (result.rows.length > 0) {
			return callback('You already participate to this doodle.');
		}

		return callback(null, true);
	});
};


module.exports = validator;
