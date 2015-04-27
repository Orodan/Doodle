// Dependencies ===========================
var Doodle = require('./classes/doodle');
var privateDoodle = require('./classes/privateDoodle');
var publicDoodle = require('./classes/publicDoodle');
var User = require('./classes/user');
var Vote = require('./classes/vote');
var Notification = require('./classes/notification');
var PublicUser = require('./classes/publicUser');
var Configuration = require('./classes/configuration');
var async = require('async');

module.exports = function (app, passport) {

    app.get('/choose-language', function (req, res) {
        res.cookie('mylanguage', req.query.language, { maxAge: 900000, httpOnly: true });
        res.redirect('/');
    });

	// =====================================
    // HOME PAGE ===========================
    // =====================================
    app.get('/', function (req, res) {

    	res.render('index', {
            message : req.flash('message'),
            language : req.cookies.mylanguage
        });
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // Show login form
    app.get('/login', function (req, res) {
    	res.render('login', { message : req.flash('loginMessage')});
    });

    // Process the login form
    app.post('/login', passport.authenticate('local-login', {
    	successRedirect : '/profile',	// redirect to the secure profile section
    	failureRedirect : '/login',		// redirect back to the login page if there is an error
    	failureFlash : true,			// allow flash messages on fail
        successFlash : true             // allow flash messages on success
    }));



    // =====================================
    // SIGNUP ==============================
    // =====================================
    // Show the signup form
    app.get('/signup', function (req, res) {
    	res.render('signup', { message : req.flash('signupMessage')});
    });

    // Process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
    	successRedirect : '/profile',	// redirect to the secure profile section
    	failureRedirect : '/signup',	// redirect back to the signup page if there is an error
    	failureFlash : true				// allow flash messages
    }));



    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // You have to be logged in to visit
    // We use route middleware to verify the user
    app.get('/profile', isLoggedIn, function (req, res) {

        async.parallel ({
            doodles: function _getDoodlesFromUser (done) {
                Doodle.getDoodlesFromUser(req.user.id, function (err, doodles) {
                    if (err) {
                        return done(err);
                    }

                    return done(null, doodles);
                });
            }, 
            participation_requests: function _getParticipationRequests (done) {
                User.getParticipationRequests(req.user.id, function (err, result) {
                    if (err) {
                        return done(err);
                    }

                    return done(null, result);
                });
            },
            notifications : function _getNotifications (done) {
                User.getNotifications(req.user.id, function (err, result) {
                    if (err) {
                        return done(err);
                    }

                    return done(null, result);
                });
            }
        }, function (err, results) {

            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }

            res.render('profile', {
                user : req.user,
                message : req.flash('message'),
                doodles : results.doodles,
                participation_requests: results.participation_requests,
                notifications: results.notifications
            });            
        });
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

            res.render('configuration', {
                user: req.user,
                message: req.flash('message'),
                doodles: doodles
            });
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

            res.redirect('/profile');
        });
    });

    // =====================================
    // NOTIFICATION ========================
    // =====================================
    // AJAX call to define a notification read
    app.put('/notification-read', isLoggedIn, function (req, res) {

        Notification.isRead(req.user.id, req.body.notification_id, function (err, result) {
            if (err) {
                res.send('Error', 400, err);
            }
            else {
                res.send('Success', 200);
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
        res.render('new-doodle');
    });

    // Process the doodle form
    app.post('/new-doodle', isLoggedIn, function (req, res) {

        var doodle = new privateDoodle(req.body.name, req.body.description);
        doodle.save(req.user.id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Doodle created !');
            }

            res.redirect('/profile');
        });
    });



    // =====================================
    // SHOW DOODLE =========================
    // =====================================
    app.get('/doodle/:id', function (req, res) {

        Doodle.getAllInformations(req.params.id, function (err, doodle) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }

            // 2 ways :
            // First : the user is not logged in
            if ( !req.user ) {

                req.flash('message', 'You are accessing this doodle without being logged in');

                return res.render('doodle', {
                    doodle : doodle,
                    user_statut : 'unregistred',
                    message : req.flash('message')
                });

            }

            // Second : the user is logged in
            var user_id = req.user.id; 

            // We check the persmision of the user ( admin or just user ), if he does not
            // have access to it, an error appear
            Doodle.getUserAccess(req.params.id, user_id, function (err, user_statut) {
                if (err) {
                    req.flash('message', 'An error occured : ' + err);
                    return res.redirect('/profile');
                }

                res.render('doodle', {
                    doodle : doodle,
                    user_statut : user_statut,
                    message : req.flash('message')
                });
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
            },
            function _deleteNotifications (done) {
                ;
                async.waterfall([
                    // Get notification ids and user ids of the doodle
                    function _getNotifIdsAndUserIds (finish) {
                        async.parallel({
                            notification_ids: function (end) {
                                Doodle.getNotifIds(req.params.id, end)
                            },
                            user_ids: function (end) {
                                Doodle.getUsersIds(req.params.id, end)
                            }
                        }, function (err, results) {
                            return finish(err, results);
                        });
                    },
                    // Detele the notifications and their associations
                    function _deleteNotifications (data, finish) {

                        async.parallel([
                            function (end) {
                                Notification.deleteAssociationsWithUser (data, end);
                            },
                            function (end) {
                                Notification.deleteAssociationsWithDoodle (req.params.id, end);
                            },
                            function (end) {
                                Notification.deleteAll (data.notification_ids, end);
                            }
                        ], function (err) {
                            return finish(err);
                        });
                    }
                ], function (err) {
                    return done(err);
                });
            }
        ], function (err) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Doodle deleted !');
            }

            res.redirect('/profile');
        });
    });

    // =====================================
    // ADD PUBLIC USER IN PRIVATE DOODLE ===
    // =====================================
    app.get('/doodle/:id/add-public-user', function (req, res) {
        res.render('add-public-user');
    });

    app.post('/doodle/:id/add-public-user', function (req, res) {

        var doodle_id = req.params.id;
        var user = new PublicUser(req.body.first_name, req.body.last_name);

        user.save(doodle_id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
                return res.redirect('/doodle/' + req.params.id);
            }
            else {
                req.session.user_id = user.id;
                return  res.redirect('/doodle/' + req.params.id + '/add-public-vote');
            }
        });
    });

    // =====================================
    // ADD PUBLIC VOTE IN PRIVATE DOODLE ===
    // =====================================
    app.get('/doodle/:id/add-public-vote', function (req, res) {
        
        Doodle.getSchedules(req.params.id, function (err, schedules) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
                res.redirect('/doodle/' + req.params.id);
            }
            else {
                res.render('add-public-vote', {
                    schedules : schedules
                });
            }
        });
    });

    // Process add public vote form
    app.post('/doodle/:id/add-public-vote', function (req, res) {

        var id = req.params.id;
        var user_id = req.session.user_id;

        Doodle.saveVotes(id, user_id, req.body.schedules, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'User added !');
            }

            req.session.user_id = null;
            res.redirect('/doodle/' + id);
        });
    });

    // =====================================
    // ADD USER ============================
    // =====================================
    app.get('/doodle/:id/add-user', isLoggedIn, function (req, res) {
        res.render('add-user');
    });

    // Create a new participation request
    app.post('/doodle/:id/add-participation-request', isLoggedIn, function (req, res) {

        var id = req.params.id;
        var email = req.body.email;

        Doodle.addParticipationRequest(id, email, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Participation request send ! ');
            }

            res.redirect('/doodle/' + id);
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

            res.redirect('/profile');
        });
    });

    // =====================================
    // REMOVE USER =========================
    // =====================================
    // Show doodle remove-user form
    app.get('/doodle/:id/remove-user', isLoggedIn, function (req, res) {

        var id = req.params.id;

        Doodle.getUsers(id, function (err, users) {
            if (err) {
                req.flash('message', 'An error occured ' + err);
                res.redirect('/doodle' + id);
            }
            else {

                res.render('remove-user', {
                    users : users
                });
            }
        });
    });

    // Process doodle remove-user form
    app.post('/doodle/:id/remove-user', isLoggedIn, function (req, res) {

        var id = req.params.id;
        var user_id = req.body.user;

        Doodle.removeUserFromDoodle(id, user_id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'User removed !');

                // Check if the doodle has still at least one user left
                if (result) {

                    var current_user_id = req.user.id;
                    // Check if the current user has still access to the doodle
                    Doodle.checkUserAccess(id, current_user_id, function (err, result) {
                        if (err) {
                            req.flash('message', 'An error occured : ' + err);
                        }
                        else {
                            // User has still access
                            if (result) {
                                res.redirect('/doodle/' + id);
                            }
                            else {
                                res.redirect('/profile');
                            }
                        }
                    });
                }
                // The doodle has no user left, it was deleted
                else {
                    req.flash('message', 'Doodle deleted !');
                    res.redirect('/profile');
                }
            }
        });
    });



    // =====================================
    // ADD SCHEDULE ========================
    // =====================================
    // Show doodle add-schedule form
    app.get('/doodle/:id/add-schedule', isLoggedIn, function (req, res) {
        res.render('add-schedule');
    });

    // Process doodle add-schedule form
    app.post('/doodle/:id/add-schedule', isLoggedIn, function (req, res) {

        var id = req.params.id;

        Doodle.addSchedule(req.params.id, req.body, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Schedule added !');
            }
            
            res.redirect('/doodle/' +id);
        });

    });



    // =====================================
    // DELETE SCHEDULE =====================
    // =====================================
    // Show doodle delete-schedule form
    app.get('/doodle/:id/delete-schedule', isLoggedIn, function (req, res) {

            var id = req.params.id;

            Doodle.getSchedules(id, function (err, schedules) {
                if (err) {
                    req.flash('message', 'An error occured : ' + err);
                    res.redirect('/doodle/' + id);
                }
                else {
                    res.render('delete-schedule', {
                        schedules : schedules
                    });
                }
            });
    });

    // Process doodle delete-schedule form
    app.post('/doodle/:id/delete-schedule', isLoggedIn, function (req, res) {

        var id = req.params.id;
        var schedule_id = req.body.schedule;

        Doodle.deleteSchedule(id, schedule_id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Schedule removed !');
            }

            res.redirect('/doodle/' + id);
        });
    });



    // =====================================
    // ADD VOTE ============================
    // =====================================
    // Show doodle add-vote form
    app.get('/doodle/:id/add-vote', isLoggedIn, function (req, res) {

        var id = req.params.id;

        Doodle.getSchedules(req.params.id, function (err, schedules) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);

                res.redirect('/doodle/' + id);
            }
            else {
                res.render('add-vote', {
                    schedules : schedules
                });
            }
        });
    });

    // Process doodle add-vote form
    app.post('/doodle/:id/add-vote', isLoggedIn, function (req, res) {

        var doodle_id = req.params.id;
        var user_id = req.user.id;
        var schedule_id = req.body.schedule;
        var vote_value = req.body.vote;

        var vote = new Vote(doodle_id, user_id, schedule_id, vote_value);
        var notification = new Notification(user_id, doodle_id, schedule_id);

        async.parallel([
            // Save the vote in db
            function _saveVote(done) {
                vote.save(function (err) {
                    return done(err);
                });        
            },
            // Save the notification about this vote
            function _saveNotification (done) {
                notification.save(function (err) {
                    return done(err);
                });
            }
        ], function (err) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Vote taken !');
            }
            res.redirect('/doodle/' + doodle_id);
        });
    });



    // ==========================================================================
    // PUBLIC DOODLE SECTION ===================================================
    // ==========================================================================


    // =====================================
    // NEW PUBLIC DOODLE ===================
    // =====================================
    // Show the doodle form
    app.get('/new-public-doodle', function (req, res) {
        res.render('new-public-doodle', {
            message : req.flash.message
        });
    });

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
    // DELETE PUBLIC DOODLE ================
    // =====================================
    // Delete a public doodle
    app.get('/public-doodle/:id/remove-public-doodle', function (req, res) {

        var admin_link_id = req.session.admin_link_id;
        req.session.administration_link_id = null;

        Doodle.deletePublicDoodle(req.params.id, admin_link_id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Doodle deleted !');
            }

            res.redirect('/');
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

            res.render('index-public-doodle', {
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

                switch (statut) {
                    case 'administrator':
                        // We get the informations about the doodle from the administration_link_id
                        publicDoodle.getAllInformationsFromAdminLinkId(req.params.id, function (err, doodle) {
                            if (err) {
                                req.flash('message', 'An error occured : ' + err);
                            }

                            req.session.admin_link_id = req.params.id;

                            res.render('public-doodle', {
                                doodle : doodle,
                                statut : statut,
                                message : req.flash('message')
                            });
                        });

                        break;
                    case 'user':
                        // We get informations about the doodle from its id
                        publicDoodle.getAllInformations(req.params.id, function (err, doodle) {
                            if (err) {
                                req.flash('message', 'An error occured : ' + err);
                            }

                            res.render('public-doodle', {
                                doodle : doodle,
                                statut : statut,
                                message : req.flash('message')
                            });
                        });

                        break;
                    default:
                        req.flash('message', 'The page you tried to access does not exists');
                        res.redirect('/');

                        break;
                }
            }
        ]);
    });



    // =====================================
    // ADD PUBLIC USER =====================
    // =====================================
    // Show add public user form
    app.get('/public-doodle/:id/add-public-user', function (req, res) {
        res.render('add-public-user');
    });

    // Process add public user form
    app.post('/public-doodle/:id/add-public-user', function (req, res) {

        var doodle_id = req.params.id;

        var user = new PublicUser(req.body.first_name, req.body.last_name);

        user.save(doodle_id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
                return res.redirect('/public-doodle/' + req.params.id);
            }
            else {
                req.session.user_id = user.id;
                return  res.redirect('/public-doodle/' + req.params.id + '/add-public-vote');
            }
        });
    });



    // =====================================
    // REMOVE PUBLIC USER ==================
    // =====================================
    // Show remove public user form
    app.get('/public-doodle/:doodle_id/remove-public-user', function (req, res) {

        Doodle.getUsers(req.params.doodle_id, function (err, users) {
            if (err) {
                req.flash('An error occured : ' + err);
                res.redirect('/public-doodle/' + req.params.admin_link_id);
            }
            else {

                res.render('remove-public-user', {
                    users : users
                });                
            }
        });
    });

    // Process remove public user form
    app.post('/public-doodle/:doodle_id/remove-public-user', function (req, res) {

        var id = req.params.doodle_id;
        var user_id = req.body.user;
        var admin_link_id = req.session.admin_link_id;

        req.session.admin_link_id = null;

        Doodle.removeUserFromPublicDoodle(id, user_id, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'User deleted !');
            }

            res.redirect('/public-doodle/' + admin_link_id );
        });

    });


    // =====================================
    // ADD PUBLIC VOTE =====================
    // =====================================
    // Show add public vote form
    app.get('/public-doodle/:id/add-public-vote', function (req, res) {

        Doodle.getSchedules(req.params.id, function (err, schedules) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
                res.redirect('/public-doodle/' + req.params.id);
            }
            else {
                res.render('add-public-vote', {
                    schedules : schedules
                });
            }
        });
    });

    // Process add public vote form
    app.post('/public-doodle/:id/add-public-vote', function (req, res) {

        var id = req.params.id;
        var user_id = req.session.user_id;

        Doodle.saveVotes(id, user_id, req.body.schedules, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'User created !');
            }

            req.session.user_id = null;
            res.redirect('/public-doodle/' + id);
        });
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






