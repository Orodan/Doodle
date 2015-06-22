// Dependencies ===========================
var Doodle = require('./classes/doodle');
var privateDoodle = require('./classes/privateDoodle');
var publicDoodle = require('./classes/publicDoodle');
var User = require('./classes/user');
var Vote = require('./classes/vote');
var Notification = require('./classes/notification');
var PublicUser = require('./classes/publicUser');
var Schedule = require('./classes/schedule');
var Configuration = require('./classes/configuration');
var async = require('async');
var util = require('util');

module.exports = function (app, passport) {

	// =====================================
    // INDEX PAGE ==========================
    // =====================================
    app.get('/', function (req, res) {

        // Language set
        if (req.cookies.mylanguage) {
            Doodle.lang = req.cookies.mylanguage;
            Schedule.lang = req.cookies.mylanguage;
        }
        else {
            res.cookie('mylanguage', Doodle.lang, { maxAge: 900000, httpOnly: true });
        }

    	res.render('pages/index', {
            message : req.flash('message'),
            language : req.cookies.mylanguage
        });
    });

    // =====================================
    // LOGIN ===============================
    // =====================================

    app.post('/login', passport.authenticate('local-login', {
    	successRedirect : '/home',	    // redirect to the secure home section
    	failureRedirect : '/',		    // redirect back to the index page if there is an error
    	failureFlash : true,			// allow flash messages on fail
        successFlash : true             // allow flash messages on success
    }));

    // =====================================
    // SIGNUP ==============================
    // =====================================

    // Process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
    	successRedirect : '/home',	    // redirect to the secure home section
    	failureRedirect : '/signup',	// redirect back to the signup page if there is an error
    	failureFlash : true				// allow flash messages
    }));

    // =====================================
    // LANGUAGE ============================
    // =====================================

    // AJAX call to set the language
    app.put('/choose-language', function (req, res) {

        // Language set
        Doodle.lang = req.body.language;
        Schedule.lang = req.body.language;

        res.cookie('mylanguage', req.body.language, { maxAge: 900000, httpOnly: true });
        res.status(200).end();
    });

    // =====================================
    // HOME SECTION ========================
    // =====================================

    // You have to be logged in to visit
    // We use route middleware to verify the user
    app.get('/home', isLoggedIn, function (req, res) {

        var user_id = req.user.id;

        async.parallel ({
            doodles:                    async.apply(Doodle.getDoodlesFromUser, user_id),
            participation_requests:     async.apply(User.getParticipationRequests, user_id),
            notifications:              async.apply(User.getNotifications, user_id)
        }, function(err, results) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }

            res.render('pages/home', {
                user : req.user,
                message : req.flash('message'),
                doodles : results.doodles,
                participation_requests: results.participation_requests,
                notifications: results.notifications
            });
        });
    });

    // AJAX call to update the notifications ( when the user read them )
    app.put('/update-notifications', isLoggedIn, function (req, res) {

        var user_id = req.user.id;
        var notification_ids = req.body.notifications;

        async.each(notification_ids,
            function (notification_id, callback) {
                Notification.update(notification_id, user_id, callback);
            },
            function (err) {
                if (err) {
                    return res.status(500).end(err);
                }

                return res.status(200).end();
            }
        );
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function (req, res) {
    	req.logout();
    	res.redirect('/');
    });

    // =====================================
    // CONFIGURATION =======================
    // =====================================
    app.get('/configuration', isLoggedIn, function (req, res) {

        async.waterfall([
            function _getDoodlesFromUser (done) {
                Doodle.getDoodlesFromUser(req.user.id, function (err, doodles) {
                    return done(err, doodles);
                });
            },
            function _getConfigurations (doodles, done) {

                async.each(doodles, function (doodle, finish) {
                    User.getConfiguration(req.user.id, doodle.id, function (err, result) {

                        if (result) {
                            doodle.notification = result.notification;
                            doodle.notification_by_email = result.notification_by_email;
                        }

                        return finish(err);
                    });
                }, function (err) {
                    return done(err, doodles);
                });
            }
        ], function (err, doodles) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }

            res.render('pages/configuration', {
                user: req.user,
                message: req.flash('message'),
                doodles: doodles
            });
        });
    });

    // AJAX call to update the configuration of the user on the specified doodle
    app.put('/update-user-configuration', isLoggedIn, function (req, res) {

        var value = req.body.configuration.value;
        var doodle_id = req.body.configuration.doodle_id;
        var notification_type = req.body.configuration.notification_type;

        Configuration.update(req.user.id, doodle_id, notification_type, value, function (err, result) {
            if (err) {
                return res.status(500).end(String(err));
            }

            return res.status(200).end();
        });

    });

    app.post('/configuration', isLoggedIn, function (req, res) {

        // We transform the inputs in array, and add default values (false) to all the inputs
        var data_arr = [];
        var i = 0;
        for (var key in req.body) {
            data_arr[i] = { 'doodle_id': key, 'notification': false, 'notification_by_email': false};
            for (var key2 in req.body[key]) {
                data_arr[i][key2] = true;
            }
            i++;
        }

        async.each(data_arr, function _saveConfiguration (data, done) {

            var config = new Configuration(req.user.id, data.doodle_id, data.notification, data.notification_by_email);
            config.save(function (err) {
                return done(err);
            });

        }, function (err) {

            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Configuration saved');
            }

            res.redirect('/home');
        });
    });

    // =====================================
    // NOTIFICATION ========================
    // =====================================
    // AJAX call to define a notification read
    app.put('/notification-read', isLoggedIn, function (req, res) {

        Notification.isRead(req.user.id, req.body.notification_id, function (err, result) {
            if (err) {
                res.status('Error').send(400, err);
            }
            else {
                res.status('Success').send(200);
            }
        });
    });

    // ==========================================================================
    // PRIVATE DOODLE SECTION ===================================================
    // ==========================================================================

    // =====================================
    // NEW PRIVATE DOODLE ==================
    // =====================================
    // Show the doodle form
    app.get('/new-doodle', isLoggedIn, function (req, res) {
        res.render('pages/new-doodle');
    });

    // AJAX call to create a new doodle
    app.post('/new-doodle', isLoggedIn, function (req, res) {

        var user_id = req.user.id;
        var doodle_name = req.body.doodle.doodle_name;
        var doodle_description = req.body.doodle.doodle_description;

        var doodle = new privateDoodle(doodle_name, doodle_description);
        doodle.save(user_id, function (err, result) {
            if (err) {
                return res.status(500).end(err.toString());
            }

            return res.status(200).end();
        });
    });

    // =====================================
    // SHOW DOODLE =========================
    // =====================================
    app.get('/doodle/:id', function (req, res) {

        var doodle_id = req.params.id;

        async.waterfall([
            function _getDoodleInfos (callback) {
                Doodle.getAllInformations(doodle_id, callback);
            },
            function _formatSchedule (doodle, callback) {

                var formated_schedules = {};

                // Check month and year
                for (var key in doodle.schedules) {
                    var schedule = doodle.schedules[key];

                    // Schedules already on this month ?
                    if (!formated_schedules[schedule.begin_date.format('MMM YYYY')]) {
                        formated_schedules[schedule.begin_date.format('MMM YYYY')] = {};
                    }

                    var day = schedule.begin_date.format('ddd D');

                    // Schedules already on this day ?
                    var schedulesAlreadyOnThisDay = false;
                    var _month = formated_schedules[schedule.begin_date.format('MMM YYYY')];

                    for (var _day in _month) {
                        if (_day == day) {
                            schedulesAlreadyOnThisDay = true;
                        }
                    }

                    if(!schedulesAlreadyOnThisDay) {
                        formated_schedules[schedule.begin_date.format('MMM YYYY')][day] = [];
                    }

                    formated_schedules[schedule.begin_date.format('MMM YYYY')][day].push({
                        id : schedule.id,
                        begin_time : schedule.begin_date.format('LT'),
                        end_time: schedule.end_date.format('LT')
                    });
                }

                doodle.schedules = formated_schedules;

                var data = {};
                data.doodle = doodle;
                data.lang = Doodle.lang;
                data.message = req.flash('message');

                // The user is logged in
                if(req.user) {
                    var user_id = req.user.id;
                    Doodle.getUserAccess(doodle_id, user_id, function (err, user_statut) {
                        if (err) {
                            return callback(err);
                        }

                        data.user = {
                            id: user_id,
                            statut: user_statut
                        };

                        return callback(null, data);
                    });
                }
                // The user is not logged in
                else {
                    data.user = {
                        statut: 'unregistred'
                    };

                    return callback(null, data);
                }
            }
        ], function (err, data) {

            if (err) {
                req.flash('message', 'An error occured : ' + err);
                return res.redirect('/pages/home');
            }

            if (!req.user) {
                req.flash('message', 'You are accessing this doodle without being logged in');
            }

            return res.render('pages/doodle', {
                doodle: data.doodle,
                user: data.user,
                lang: data.lang,
                message: data.message
            });
        });
    });

    // =====================================
    // DELETE DOODLE =======================
    // =====================================
    app.get('/doodle/delete/:id', isLoggedIn, function (req, res) {

        async.parallel([
            function _deleteDoodle (done) {
                Doodle.delete(req.params.id, done);
            }
        ], function (err) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Doodle deleted !');
            }

            res.redirect('/home');
        });
    });

    // =====================================
    // ADD PUBLIC USER IN PRIVATE DOODLE ===
    // =====================================

    // AJAX call to add a new public user to the specified doodle
    app.post('/doodle/:id/add-public-user', function (req, res) {

        var doodle_id = req.params.id;
        var first_name = req.body.data.user.first_name;
        var last_name = req.body.data.user.last_name;
        var votes = req.body.data.votes;

        var public_user = new PublicUser(first_name, last_name);
        public_user.save(doodle_id, votes, function (err) {
            if (err) {
                console.log("ERROR : ", err);
                return res.status(500).end(String(err));
            }

            return res.status(200).end();
        });
    });

    // =====================================
    // ADD USER ============================
    // =====================================

    // AJAX call to create a participation request for an user
    app.post('/doodle/:id/create-participation-request', isLoggedIn, function (req, res) {

        var doodle_id = req.params.id;
        var email = req.body.email;

        Doodle.addParticipationRequest(doodle_id, email, function (err) {
            if (err) {
                return res.status(500).json({ error: err });
            }

            return res.status(200).end();
        });
    });

    // Add to the doodle the user invited to participate
    app.get('/doodle/:id/participate', isLoggedIn, function (req, res) {

        var id = req.params.id;
        var user_id = req.user.id;

        Doodle.addUser(id, user_id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'User added ! ');
            }

            res.redirect('/doodle/' + id);
        });
    });

    // Refuse the invitation to participate to a doodle
    app.get('/doodle/:id/decline', isLoggedIn, function (req, res) {

        var id = req.params.id;
        var user_id = req.user.id;

        Doodle.declineParticipationRequest(id, user_id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Request deleted ! ');
            }

            res.redirect('/home');
        });
    });

    // =====================================
    // REMOVE USER =========================
    // =====================================

    // AJAX call to remove the specified user from the doodle
    app.delete('/doodle/:id/remove-user', isLoggedIn, function (req, res) {

        var doodle_id = req.params.id;
        var user_id = req.body.user_id;

        Doodle.removeUserFromDoodle(doodle_id, user_id, function (err) {
            if (err) {
                return res.status(500).json({ error: err });
            }
        });

        return res.status(200).end();
    });

    // =====================================
    // ADD SCHEDULE ========================
    // =====================================

    // AJAX call to add a schedule to a doodle
    app.post('/doodle/:id/add-schedule', isLoggedIn, function (req, res) {

        var doodle_id = req.params.id;
        var begin_date = req.body.schedule.begin_date;
        var end_date = req.body.schedule.end_date;

        Doodle.addSchedule(req.params.id, begin_date, end_date, function (err) {
            if (err) {
                return res.status(500).json({ error: err });
            }

            return res.status(200).end();
        });
    });

    // =====================================
    // DELETE SCHEDULE =====================
    // =====================================

    // AJAX call to delete the specified schedule
    app.delete('/doodle/:id/delete-schedule', isLoggedIn, function (req, res) {

        var doodle_id = req.params.id;
        var schedule_id = req.body.schedule_id;

        Doodle.deleteSchedule(doodle_id, schedule_id, function (err) {
            if (err) {
                return res.status(500).json({ error: err });
            }
        });

        return res.status(200).end();
    });

    // =====================================
    // UPDATE VOTE =========================
    // =====================================

    // AJAX call to update votes
    app.put('/doodle/:id/update-votes', isLoggedIn, function (req, res) {

        var doodle_id = req.params.id;
        var user_id = req.user.id;

        async.parallel([
            function _updateVotes (end) {
                Vote.updateVotes(doodle_id, user_id, req.body.votes, end);
            },
            function _createNotifications (end) {
                var notif = new Notification (user_id, doodle_id);

                async.parallel([
                    function _saveNotif (done) {
                        notif.save(done);
                    },
                    function _saveNotificationForUsers (done) {
                        notif.saveNotificationForUsers(done);
                    },
                    function _saveNotificationsForDoodle (done) {
                        notif.saveNotificationsForDoodle(done);
                    },
                    function _sendEmailNotifications (done) {
                        notif.sendEmailNotifications (done);
                    }
                ], function (err) {
                    return end(err);
                });

            }
        ], function (err) {
            if (err) {
                return res.status(500).json({ error: err });
            }

            return res.status(200).end();
        });
    });

    // ==========================================================================
    // PUBLIC DOODLE SECTION ====================================================
    // ==========================================================================

    // =====================================
    // NEW PUBLIC DOODLE ===================
    // =====================================

    // Process the doodle form
    app.post('/new-public-doodle', function (req, res) {

        var doodle = new publicDoodle (req.body.name, req.body.description);

        async.waterfall([
            function _saveDoodle (done) {
                doodle.save(done);
            },
            function _addSchedules (done) {
                doodle.addSchedules(req.body.schedules, done);
            },
            function _generateLinks (done) {
                doodle.generateLinks(done);
            }
        ], function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
                res.redirect('/');
            }

            res.redirect('/index-public-doodle/' + result.admin_link_id);
        });
    });

    // =====================================
    // SHOW PUBLIC DOODLE ==================
    // =====================================

    // Show generated links for the public doodle
    app.get('/index-public-doodle/:admin_link_id', function (req, res) {

        publicDoodle.getDoodleIdFromAdminLinkId(req.params.admin_link_id, function (err, doodle_id) {

            if (err) {
                req.flash('message', 'An error occured : ' + err);
                res.redirect('/');
            }

            res.render('pages/index-public-doodle', {
                doodle_administration_link : req.headers.host + '/public-doodle/' + req.params.admin_link_id,
                doodle_user_link : req.headers.host + '/public-doodle/' + doodle_id
            });
        });
    });

    // Show the public doodle
    app.get('/public-doodle/:id', function (req, res) {

        async.waterfall([
            function _checkLinkId (done) {
                publicDoodle.checkLinkId(req.params.id, done);
            },
            function _handleResult (statut, done) {

                var doodle_id = null;

                async.series([
                    function _getDoodleId (end) {
                        switch (statut) {
                            case 'administrator':
                                var admin_link_id = req.params.id;
                                publicDoodle.getDoodleIdFromAdminLinkId(admin_link_id, function (err, _doodle_id) {
                                    doodle_id = _doodle_id;
                                    statut = 'admin';
                                    return end();
                                });
                                break;
                            case 'user':
                                doodle_id = req.params.id;
                                return end();
                            default:
                                return end();
                        }
                    },
                    function _getDoodleData (end) {

                        async.waterfall([
                            function _getDoodleInfos (callback) {
                                Doodle.getAllInformations(doodle_id, callback);
                            },
                            function _checkUser (doodle, callback) {

                                var formated_schedules = {};

                                // Check month and year
                                for (var key in doodle.schedules) {
                                    var schedule = doodle.schedules[key];

                                    // Schedules already on this month ?
                                    if (!formated_schedules[schedule.begin_date.format('MMM YYYY')]) {
                                        formated_schedules[schedule.begin_date.format('MMM YYYY')] = {};
                                    }

                                    var day = schedule.begin_date.format('ddd. D');

                                    // Schedules already on this day ?
                                    var schedulesAlreadyOnThisDay = false;
                                    var _month = formated_schedules[schedule.begin_date.format('MMM YYYY')];

                                    for (var _day in _month) {
                                        if (_day == day) {
                                            schedulesAlreadyOnThisDay = true;
                                        }
                                    }

                                    if(!schedulesAlreadyOnThisDay) {
                                        formated_schedules[schedule.begin_date.format('MMM YYYY')][day] = [];
                                    }

                                    formated_schedules[schedule.begin_date.format('MMM YYYY')][day].push({
                                        id : schedule.id,
                                        begin_time : schedule.begin_date.format('LT'),
                                        end_time: schedule.end_date.format('LT')
                                    });
                                }

                                doodle.schedules = formated_schedules;

                                var data = {};
                                data.doodle = doodle;
                                data.lang = Doodle.lang;
                                data.message = req.flash('message');
                                data.user = {
                                    statut: statut
                                };

                                req.session.statut = statut;
                                console.log("REQ SESSION : ", req.session.statut);

                                return callback(null, data);

                            }
                        ], function (err, data) {

                            if (err) {
                                req.flash('message', 'An error occured : ' + err);
                                return res.redirect('/');
                            }

                            if (!req.user) {
                                req.flash('message', 'You are accessing this doodle without being logged in');
                            }

                            return res.render('pages/public-doodle', {
                                doodle: data.doodle,
                                user: data.user,
                                lang: data.lang,
                                message: data.message
                            });
                        });
                    }
                ]);
            }
        ]);
    });

    // =====================================
    // DELETE PUBLIC DOODLE ================
    // =====================================

    // =====================================
    // ADD PUBLIC USER =====================
    // =====================================

    // AJAX call to add a new public user to the specified public doodle
    app.post('/public-doodle/:id/add-public-user', function (req, res) {

        if (req.session.statut == 'admin'){

            var doodle_id = null;
            async.series ([
                function _getDoodleId (end) {
                    publicDoodle.getDoodleIdFromAdminLinkId(req.params.id, function (err, _doodle_id) {
                        doodle_id = _doodle_id;
                        return end();
                    });
                },
                function _process (end) {

                    var first_name = req.body.data.user.first_name;
                    var last_name = req.body.data.user.last_name;
                    var votes = req.body.data.votes;

                    var public_user = new PublicUser(first_name, last_name);
                    public_user.save(doodle_id, votes, function (err) {
                        if (err) {
                            console.log("ERROR : ", err);
                            return res.status(500).end(String(err));
                        }

                        return res.status(200).end();
                    });
                }
            ]);
        }
        else {
            var doodle_id = req.params.id;

            var first_name = req.body.data.user.first_name;
            var last_name = req.body.data.user.last_name;
            var votes = req.body.data.votes;

            var public_user = new PublicUser(first_name, last_name);
            public_user.save(doodle_id, votes, function (err) {
                if (err) {
                    return res.status(500).end(String(err));
                }

                return res.status(200).end();
            });
        }
    });

    // =====================================
    // REMOVE PUBLIC USER ==================
    // =====================================

    // AJAX call to remove a user from a public doodle
    app.delete('/public-doodle/:id/remove-user', function (req, res) {

        var doodle_id = null;
        var user_id = req.body.user_id;

        async.series ([
            function _getDoodleId (end) {
                publicDoodle.getDoodleIdFromAdminLinkId(req.params.id, function (err, _doodle_id) {
                    doodle_id = _doodle_id;
                    return end();
                });
            },
            function _process (end) {

                Doodle.removeUserFromDoodle(doodle_id, user_id, function (err) {
                    if (err) {
                        return res.status(500).json({ error: err });
                    }
                });

                return res.status(200).end();
            }
        ]);
    });

    // =====================================
    // ADD PUBLIC VOTE =====================
    // =====================================

    // AJAX call to add a schedule to a public doodle
    app.post('/public-doodle/:id/add-schedule', function (req, res) {

        var doodle_id = null;

        async.series ([
            function _getDoodleId (end) {
                publicDoodle.getDoodleIdFromAdminLinkId(req.params.id, function (err, _doodle_id) {
                    doodle_id = _doodle_id;
                    return end();
                });
            },
            function _process (end) {

                var begin_date = req.body.schedule.begin_date;
                var end_date = req.body.schedule.end_date;

                Doodle.addSchedule(doodle_id, begin_date, end_date, function (err) {
                    if (err) {
                        return res.status(500).json({ error: err });
                    }

                    return res.status(200).end();
                });
            }
        ]);
    });

    // =====================================
    // REMOVE PUBLIC SCHEDULE ==============
    // =====================================

    // AJAX call to remove a schedule from a public doodle
    app.delete('/public-doodle/:id/delete-schedule', function (req, res) {

        var doodle_id = null;
        var schedule_id = req.body.schedule_id;

        async.series ([
            function _getDoodleId (end) {
                publicDoodle.getDoodleIdFromAdminLinkId(req.params.id, function (err, _doodle_id) {
                    doodle_id = _doodle_id;
                    return end();
                });
            },
            function _process (end) {

                Doodle.deleteSchedule(doodle_id, schedule_id, function (err) {
                    if (err) {
                        return res.status(500).json({ error: err });
                    }
                });

                return res.status(200).end();
            }
        ]);
    });

    // =====================================
    // MIDDLEWARE ==========================
    // =====================================

    // Route middleware to make sur a user is logged in
    function isLoggedIn (req, res, next) {

    	if (req.isAuthenticated()) {
    		return next();
    	}

    	res.redirect('/');
    }
};
