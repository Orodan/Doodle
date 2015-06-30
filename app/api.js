// Dependencies ===========================
var Doodle = require('./classes/doodle');
var privateDoodle = require('./classes/privateDoodle');
var publicDoodle = require('./classes/publicDoodle');
var User = require('./classes/user');
var privateUser = require('./classes/privateUser');
var Vote = require('./classes/vote');
var Notification = require('./classes/notification');
var PublicUser = require('./classes/publicUser');
var Schedule = require('./classes/schedule');
var Configuration = require('./classes/configuration');
var ParticipationRequest = require('./classes/participationRequest');
var async = require('async');
var util = require('util');
var Validator = require('./classes/validator');

module.exports = function (app, passport) {

    // Get access token 
    app.all('/oauth/token', app.oauth.grant());

    // Create user
    app.post('/api/user',
        jsonRequest,
        function (req, res) {

            var user_data = req.body;
            var new_user = null;

            async.series([
                // Validate email, first_name, last_name, password
                function _validUser (done) {
                    Validator.validUser(user_data, done);
                },

                // Create the new user
                function _createUser (done) {
                    new_user = new privateUser(req.body.email, req.body.first_name, req.body.last_name, req.body.password);
                    new_user.save(done);
                }
            ], function (err) {
                if (err) {
                    return res.json({
                        type: 'error',
                        response: err
                    });
                }

                return res.json({
                    type: 'success',
                    response: new_user
                });
            });
        }
    );

    // =====================================
    // GET =================================
    // =====================================

    // ============================
    // PRIVATE DOODLE =============
    // ============================

    // Get doodle data
    app.get('/api/doodle/:doodle_id',
        app.oauth.authorise(),
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;

            var doodle_data = null;

            async.series([
                // Validate if the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the user has access to the doodle
                function _userAccess (done) {
                    Validator.userAccess(user_id, doodle_id, done);
                },

                // Get doodle data
                function _getDooodleData (done) {
                    Doodle.getAllInformations(doodle_id, function (err, _doodle) {
                        if (err) {
                            return done(err);
                        }

                        doodle_data = _doodle;
                        return done(null, true);
                    });
                }

            ], function (err) {
                if (err) {
                    return res.json({
                      type: 'error',
                      response: err
                    });
                }

                return res.json({
                    type: 'success',
                    response: doodle_data
                });
            });
        }
    );

    // ============================
    // PUBLIC DOODLE ==============
    // ============================

    // Get public doodle data
    app.get('/api/public-doodle/:doodle_id', function (req, res) {

        var doodle_id = req.params.doodle_id;

        var doodle_data = null;

        async.series([
            // Validate if the doodle id is a correct uuid and math a doodle
            function _validDoodleId (done) {
                Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
            },

            // Validate if the doodle is a public doodle
            function _isPublic (done) {
                Validator.isPublic(doodle_id, done);
            },

            // Get doodle data
            function _getDooodleData (done) {
                Doodle.getAllInformations(doodle_id, function (err, _doodle) {
                    if (err) {
                        return done(err);
                    }

                    doodle_data = _doodle;
                    return done(null, true);
                });
            }
        ], function (err) {
            if (err) {
                return res.json({
                  type: 'error',
                  response: err
                });
            }

            return res.json({
                type: 'success',
                response: doodle_data
            });
        });
    });

    // =====================================
    // POST ================================
    // =====================================

    // ============================
    // PRIVATE DOODLE =============
    // ============================

    // Create private doodle
    app.post('/api/doodle',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_data = req.body;

            var new_doodle = null;

            async.series([
                // Validate the doodle data is not empty and does not contain wrong data
                function _validDoodle (done) {
                    Validator.validDoodle(doodle_data, done);
                },

                function _createDoodle (done) {
                    new_doodle = new privateDoodle(req.body.name, req.body.description);
                    new_doodle.save(user_id, function (err) {
                        return done(err, new_doodle);
                    });
                }
            ],
            function (err) {
                if (err) {
                    return res.json({
                        type: 'error',
                        response: err
                    });
                }

                return res.json({
                    type: 'success',
                    response: new_doodle
                });
            });
        }
    );

    // Create participation request
    app.post('/api/doodle/:doodle_id/participation-request',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;

            async.series([
                // Validate if the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the user has access to the doodle
                function _userAccess (done) {
                    Validator.userAccess(user_id, doodle_id, done);
                },

                // Validate the user has the permission to create participation request for this doodle
                function _userPermission (done) {
                    Validator.userPermission(user_id, doodle_id, done);
                },

                // Validate if the user_id is a correct uuid and match a user
                // not already invated or participating in this doodle
                function _validParticipationRequest (done) {
                    Validator.validParticipationRequest(doodle_id, req.body, done);
                },

                // Create the participation request
                function _createParticipationRequest (done) {
                    var new_participation_request = new ParticipationRequest(doodle_id, req.body.user_id);
                    new_participation_request.save(done);
                }
            ], function (err) {
                // Error
                if (err) {
                    return res.json({
                        type: 'error',
                        response: err
                    });
                }

                return res.json({
                    type: 'success',
                    response: 'Participation request sent.'
                });
            });
        }
    );

    // ============================
    // PUBLIC DOODLE ==============
    // ============================

    // Create public doodle
    app.post('/api/public-doodle', jsonRequest, function (req, res) {

        var doodle_data = req.body;

        var new_doodle = null;

        async.waterfall([
            // Validate the public doodle data is not empty and does not contain wrong data
            function _validPublicDoodle (done) {
                Validator.validPublicDoodle(doodle_data, done);
            },

            function _createDoodle (done) {
                new_doodle = new publicDoodle(req.body.name, req.body.description);
                new_doodle.save(done);
            },

            function _addSchedules (done) {
                if (typeof req.body.schedules != 'undefined') {
                    new_doodle.addSchedules(req.body.schedules, done);
                }
                else {
                    return done();
                }
            },

            function _generateLinks (done) {
                new_doodle.generateLinks(done);
            }
        ],
        function (err, result) {
            if (err) {
              return res.json({
                  type: 'error',
                  response: err
              });
            }

            return res.json({
              type: 'success',
              response: result
            });
        });
    });

    // =====================================
    // PUT =================================
    // =====================================

    // ============================
    // PRIVATE DOODLE =============
    // ============================

    // Update configuration of the user
    app.put('/api/user',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.body.doodle_id;
            var configuration = req.body;

            async.series([
                // Validate the configuration is not empty and does not contain wrong data
                function _validConfiguration (done) {
                    Validator.validConfig(configuration, done);
                },

                // Validate the user has access to the doodle
                function _userAccess (done) {
                    Validator.userAccess(user_id, doodle_id, done);
                },

                // Update the configuration of the user about the doodle
                function updateConfiguration (done) {

                    var notifications = [];

                    if (Validator.isDefined(req.body.configuration.notification)) {
                        notifications.push({
                            type: 'notification',
                            value: req.body.configuration.notification
                        });
                    }

                    if (Validator.isDefined(req.body.configuration.notification_by_email)) {
                        notifications.push({
                            type: 'notification_by_email',
                            value: req.body.configuration.notification_by_email
                        });
                    }

                    async.each(notifications, function (notification, end) {
                        Configuration.update(user_id, doodle_id, notification.type, notification.value, end);
                    },
                    function (err) {
                        return done(err);
                    });
                }

            ], function (err) {
                if (err) {
                    return res.json({
                      type: 'error',
                      response: err
                    });
                }

                return res.json({
                    type: 'success',
                    response: 'Configuration updated.'
                });
            });
        }
    );

    // Update notification ( set it has been read by the user )
    app.put('/api/notification/:notification_id',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var notification_id = req.params.notification_id;

            async.series([
                // Validate the notification id is a correct timeuuid and match a notification
                function _validNotificationId (done) {
                    Validator.exists(notification_id, 'notification', 'Invalid notification id.', done);
                },

                // Validate the user has access to the notification
                function _userAccessToNotification (done) {
                    Validator.userAccessToNotification(user_id, notification_id, done);
                },

                // Validate the notification has not been already read
                function _notificationAlreadyRead (done) {
                    Notification.isRead(user_id, notification_id, function (err, isRead) {
                        if (err) {
                            return done(err);
                        }

                        if (isRead) {
                            return done('This notification has already been read by you.');
                        }

                        return done();
                    });
                },

                // Update the notification
                function _updateNotification (done) {
                    Notification.update(notification_id, user_id, done);
                }
            ], function (err) {
                if (err) {
                    return res.json({
                      type: 'error',
                      response: err
                    });
                }

                return res.json({
                    type: 'success',
                    response: 'Notification updated.'
                });
            });
        }
    );

    // Add a schedule to the doodle
    app.put('/api/doodle/:doodle_id/add-schedule',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;
            var schedule_data = req.body;

            async.series([
                // Validate the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the user has access to the doodle
                function _userAccess (done) {
                    Validator.userAccess(user_id, doodle_id, done);
                },

                // Validate the user has the permission to add a schedule to this doodle
                function _userPermission (done) {
                    Validator.userPermission(user_id, doodle_id, done);
                },

                // Validate if the schedule data are correct
                function _validSchedule (done) {
                    Validator.validSchedule(schedule_data, done);
                },

                // Add the schedule
                function _addSchedule (done) {
                    Doodle.addSchedule(doodle_id, schedule_data.begin, schedule_data.end_date, done);
                }
            ], function (err) {
                if (err) {
                  return res.json({
                      type: 'error',
                      response: err
                  });
                }

                return res.json({
                  type: 'success',
                  response: 'Schedule added.'
                });
            });
        }
    );

    // Remove a schedule from the doodle
    app.put('/api/doodle/:doodle_id/delete-schedule/:schedule_id',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;
            var schedule_id = req.params.schedule_id;

            async.series([
                // Validate the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the schedule id is a correct uuid and match a schedule
                function _validScheduleId (done) {
                    Validator.exists(schedule_id, 'schedule', 'Invalid schedule id', done);
                },

                // Validate the user has access to the doodle
                function _userAccess (done) {
                    Validator.userAccess(user_id, doodle_id, done);
                },

                // Validate the user has the permission to delete a schedule from this doodle
                function _userPermission (done) {
                    Validator.userPermission(user_id, doodle_id, done);
                },

                // Valitate the schedule is a part of the doodle
                function _validScheduleIsFromDoodle (done) {
                    Doodle.hasSchedule(doodle_id, schedule_id, done);
                },

                // Remove the schedule
                function _removeSchedule (done) {
                    Doodle.deleteSchedule(doodle_id, schedule_id, done);
                }
            ], function (err) {
                if (err) {
                  return res.json({
                      type: 'error',
                      response: err
                  });
                }

                return res.json({
                  type: 'success',
                  response: 'Schedule removed.'
                });
            });
        }
    );

    // Update vote of the user on the doodle
    app.put('/api/doodle/:doodle_id/vote',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;
            var vote_data = req.body;

            async.series([
                // Validate the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the user has access to the doodle
                function _userAccess (done) {
                    Validator.userAccess(user_id, doodle_id, done);
                },

                // Validate vote data are correct
                function _validVote (done) {
                    Validator.validVote(doodle_id, vote_data, done);
                },

                // Update vote
                function _updateVote (done) {
                    Doodle.updateVote(doodle_id, user_id, vote_data, done);
                }

            ], function (err) {

                if (err) {
                  return res.json({
                      type: 'error',
                      response: err
                  });
                }

                return res.json({
                  type: 'success',
                  response: 'Vote updated.'
                });
            });
        }
    );

    // Add the user to the doodle
    app.put('/api/doodle/:doodle_id/participate/',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;

            async.series([
                // Validate the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the user does not already participate to the doodle
                function _userParticipation (done) {
                    Validator.alreadyParticipate(doodle_id, user_id, done);
                },

                // Validate the user is invated to participate
                function _isInvated (done) {
                    Validator.isInvated(doodle_id, user_id, done);
                },

                // Confirme the participation
                function _confirmParticipation (done) {
                    Doodle.addUser(doodle_id, user_id, done);
                }
            ], function (err) {
                if (err) {
                  return res.json({
                      type: 'error',
                      response: err
                  });
                }

                return res.json({
                  type: 'success',
                  response: 'User added.'
                });
            });
        }
    );

    // Remove an user from the doodle
    app.put('/api/doodle/:doodle_id/remove-user/:user_id',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;
            var user_to_delete_id = req.params.user_id;

            async.series([
                // Validate the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the user (to delete) id is a correct uuid and match an user
                function _validUserId (done) {
                    Validator.exists(user_to_delete_id, 'user', 'Invalid user id', done);
                },

                // Validate the user has access to the doodle
                function _userAccess (done) {
                    Validator.userAccess(user_id, doodle_id, done);
                },

                // Validate the user has the permission to remove an user from this doodle
                function _userPermission (done) {
                    Validator.userPermission(user_id, doodle_id, done);
                },

                // Validate the user to remove participate to the doodle
                function _userParticipation (done) {
                    User.participate(doodle_id, user_to_delete_id, function (err, participate) {
                        if (err) {
                            return done(err);
                        }

                        if (!participate) {
                            return done('This user does not participate to this doodle.');
                        }

                        return done();
                    });
                },

                // Remove the user from the doodle
                function _removeUser (done) {
                    Doodle.removeUserFromDoodle(doodle_id, user_to_delete_id, done);
                }

            ], function (err) {
                if (err) {
                  return res.json({
                      type: 'error',
                      response: err
                  });
                }

                return res.json({
                  type: 'success',
                  response: 'User removed.'
                });
            });
        }
    );

    // ============================
    // PUBLIC DOODLE ==============
    // ============================

    // Add a schedule to the public doodle
    app.put('/api/public_doodle/:admin_id/add-schedule', jsonRequest, function (req, res) {

        var admin_id = req.params.admin_id;
        var schedule_data = req.body;

        var doodle_id = null;

        async.series([

            // Validate the admin id is a correct uuid and match a public doodle
            function _validAdminId (done) {
                Validator.validAdminId(admin_id, done);
            },

            // Validate if the schedule data are correct
            function _validSchedule (done) {
                Validator.validSchedule(schedule_data, done);
            },

            // Get doodle id from admin id
            function _getDoodleId (done) {
                publicDoodle.getDoodleIdFromAdminLinkId(admin_id, function (err, _doodle_id) {
                    doodle_id = _doodle_id;
                    return done(err);
                });
            },

            // Add the schedule
            function _addSchedule (done) {
                Doodle.addSchedule(doodle_id, schedule_data.begin, schedule_data.end_date, done);
            }
        ], function (err) {
            if (err) {
              return res.json({
                  type: 'error',
                  response: err
              });
            }

            return res.json({
              type: 'success',
              response: 'Schedule added.'
            });
        });
    });

    // Add an user to the public doodle
    app.put('/api/public-doodle/:doodle_id/add-user', jsonRequest, function (req, res) {

        var doodle_id = req.params.doodle_id;
        var user_data = req.body.user;
        var votes_data = req.body.votes;

        async.series([
            // Validate the doodle id is a correct uuid and math a doodle
            function _validDoodleId (done) {
                Validator.validPublicDoodleId(doodle_id, done);
            },

            // Validate the public user data (first name, last name)
            function _validPublicUser (done) {
                Validator.validPublicUser(user_data, done);
            },

            // Validate the votes data
            function _validVotes (done) {
                Validator.validPublicVotes(doodle_id, votes_data, done);
            },

            // Add the public user and save the votes
            function _addPublicUser (done) {
                var public_user = new PublicUser(user_data.first_name, user_data.last_name);
                public_user.save(doodle_id, votes_data, done);
            }

        ], function (err) {
            if (err) {
              return res.json({
                  type: 'error',
                  response: err
              });
            }

            return res.json({
              type: 'success',
              response: 'Public user added, vote(s) taken.'
            });
        });
    });

    // Remove a schedule from the public doodle
    app.put('/api/public-doodle/:admin_id/delete-schedule/:schedule_id', jsonRequest, function (req, res) {

        var admin_id = req.params.admin_id;
        var schedule_id = req.params.schedule_id;

        async.series([
            // Validate the admin id is a correct uuid and match a public doodle
            function _validAdminId (done) {
                Validator.validAdminId(admin_id, done);
            },

            // Validate the schedule id is a correct uuid and match a schedule
            function _validScheduleId (done) {
                Validator.exists(schedule_id, 'schedule', 'Invalid schedule id', done);
            },

            // Get doodle id from admin id
            function _getDoodleId (done) {
                publicDoodle.getDoodleIdFromAdminLinkId(admin_id, function (err, _doodle_id) {
                    doodle_id = _doodle_id;
                    return done(err);
                });
            },

            // Valitate the schedule is a part of the doodle
            function _validScheduleIsFromDoodle (done) {
                Doodle.hasSchedule(doodle_id, schedule_id, done);
            },

            // Remove the schedule
            function _removeSchedule (done) {
                Doodle.deleteSchedule(doodle_id, schedule_id, done);
            }

        ], function (err) {
            if (err) {
              return res.json({
                  type: 'error',
                  response: err
              });
            }

            return res.json({
              type: 'success',
              response: 'Schedule removed.'
            });
        });
    });

    // Remove an user from the public doodle
    app.put('/api/public-doodle/:admin_id/remove-user/:user_id', jsonRequest, function (req, res) {

        var doodle_id = null;
        var admin_id = req.params.admin_id;
        var public_user_id = req.params.user_id;

        async.series([
            // Validate the admin id is a correct uuid and match a public doodle
            function _validAdminId (done) {
                Validator.validAdminId(admin_id, done);
            },

            // Validate the public user id is a correct uuid and match a public doodle
            function _validPublicUserId (done) {
                Validator.validPublicUserId(public_user_id, done);
            },

            // Get doodle id from admin id
            function _getDoodleId (done) {
                publicDoodle.getDoodleIdFromAdminLinkId(admin_id, function (err, _doodle_id) {
                    doodle_id = _doodle_id;
                    return done(err);
                });
            },

            // Validate the user to remove participate to the doodle
            function _userParticipation (done) {
                User.participate(doodle_id, public_user_id, function (err, participate) {
                    if (err) {
                        return done(err);
                    }

                    if (!participate) {
                        return done('This user does not participate to this doodle.');
                    }

                    return done();
                });
            },

            // Delete the user
            function _deleteUser (done) {
                Doodle.removeUserFromDoodle(doodle_id, public_user_id, done);
            }

        ], function (err) {
            if (err) {
              return res.json({
                  type: 'error',
                  response: err
              });
            }

            return res.json({
              type: 'success',
              response: 'User removed.'
            });
        });
    });

    // =====================================
    // DELETE ==============================
    // =====================================

    // ============================
    // PRIVATE DOODLE =============
    // ============================

    // Delete the doodle
    app.delete('/api/doodle/:doodle_id',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;

            async.series([

                // Validate the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the user has access to the doodle
                function _userAccess (done) {
                    Validator.userAccess(user_id, doodle_id, done);
                },

                // Validate the user has the permission to delete this doodle
                function _userPermission (done) {
                    Validator.userPermission(user_id, doodle_id, done);
                },

                // Delete the doodle
                function _deleteDoodle (done) {
                    Doodle.delete(doodle_id, done);
                }
            ], function (err) {
                if (err) {
                  return res.json({
                      type: 'error',
                      response: err
                  });
                }

                return res.json({
                  type: 'success',
                  response: 'Doodle deleted.'
                });
            });
        }
    );

    // Delete the participation request
    app.delete('/api/doodle/:doodle_id/participation-request',
        app.oauth.authorise(),
        jsonRequest,
        function (req, res) {

            var user_id = req.user.id;
            var doodle_id = req.params.doodle_id;

            async.series([
                // Validate the doodle id is a correct uuid and math a doodle
                function _validDoodleId (done) {
                    Validator.exists(doodle_id, 'doodle', 'Invalid doodle id', done);
                },

                // Validate the user is invated to participate to the doodle
                function _isInvated (done) {
                    Validator.isInvated(doodle_id, user_id, done);
                },

                // Delete the participation request
                function _deleteParticipation (done) {
                    Doodle.declineParticipationRequest(doodle_id, user_id, done);
                }

            ], function (err) {
                if (err) {
                  return res.json({
                      type: 'error',
                      response: err
                  });
                }

                return res.json({
                  type: 'success',
                  response: 'Participation request deleted.'
                });
            });
        }
    );

    // ============================
    // PUBLIC DOODLE ==============
    // ============================

    // Delete the public doodle
    app.delete('/api/public-doodle/:admin_id', jsonRequest, function (req, res) {

        // Vérification admin id
        // Suppression

        var admin_id = req.params.admin_id;
        var doodle_id = null;

        async.series([

            // Validate the admin id is a correct uuid and match a public doodle
            function _validAdminId (done) {
                Validator.validAdminId(admin_id, done);
            },

            // Get doodle id from admin id
            function _getDoodleId (done) {
                publicDoodle.getDoodleIdFromAdminLinkId(admin_id, function (err, _doodle_id) {
                    doodle_id = _doodle_id;
                    return done(err);
                });
            },

            // Delete public doodle
            function _deletePublicDoodle (done) {
                Doodle.deletePublicDoodle(doodle_id, admin_id, done);
            }

        ], function (err) {
            if (err) {
              return res.json({
                  type: 'error',
                  response: err
              });
            }

            return res.json({
              type: 'success',
              response: 'Doodle deleted.'
            });
        });
    });

    // ====================================
    // MIDDLEWARE =========================
    // ====================================

    // Verify that the data from the client are json
    function jsonRequest (req, res, next) {
        if (req.is() == 'application/json') {
            next();
        }
        else {
            res.json({
                'type' : 'error',
                'response' : 'invalid data type, must be JSON.'
            });
        }
    }

    // Validate the referer the request is coming from
    function authenticateReferer (req, res, next) {

        passport.setTenant(req.headers['referer'], function (err) {
            if (err) {
                res.json({
                    'type' : 'error',
                    'response' : err
                });
            }
            else {
                next();
            }
        });
    }
};
