// Dependencies ===========================
var Doodle = require('./classes/doodle');
var User = require('./classes/user');

var uuid = require('node-uuid');

module.exports = function (app, passport) {

	// =====================================
    // HOME PAGE ===========================
    // =====================================
    app.get('/', function (req, res) {
    	res.render('index', {
            message : req.flash('message')
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

        Doodle.getDoodleFromUser(req.user.id, function (err, doodles) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }

            res.render('profile', {
                user : req.user,
                message : req.flash('message'),
                doodles : doodles
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
        Doodle.new(req.body, req.user.id, function (err, doodle) {

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
    app.get('/doodle/:id', isLoggedIn, function (req, res) {

        Doodle.getAllInformations(req.params.id, function (err, doodle) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }

            var user_id = req.user.id; 

            // We check the persmision of the user ( admin or just user )
            Doodle.getUserAccess(req.params.id, user_id, function (err, result) {

                if (err) {
                    req.flash('message', 'An error occured : ' + err);
                }

                var user_statut;
                // User admin
                if (result) {
                    user_statut = 'admin';
                }
                else {
                    user_statut = 'user';
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
       
        Doodle.delete(req.params.id, function (err, done) {
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
    // ADD USER ============================
    // =====================================
    app.get('/doodle/:id/add-user', isLoggedIn, function (req, res) {
        res.render('add-user');
    });

    // Process the doodle add-user form
    app.post('/doodle/:id/add-user', isLoggedIn, function (req, res) {

        var id = req.params.id;

        Doodle.addUser(req.params.id, req.body, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'User added ! ');
            }

            res.redirect('/doodle/' + id);
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
                // The doodle has no user left, it has been deleted
                else {
                    req.flash('message', 'DELETEoodle deleted !');
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
        })
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

                res.redirect('/doodle/' + id)
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

        var id = req.params.id;

        Doodle.saveVote(req.params.id, req.user.id, req.body, function (err, result) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }
            else {
                req.flash('message', 'Vote taken !');
            }

            res.redirect('/doodle/'+id);
        });
    });


    // ==========================================================================
    // PUBLIC DOODLE SECTION ===================================================
    // ==========================================================================

    // =====================================
    // NEW PUBLIC USER =====================
    // =====================================

    // !!!!!! DESACTIVATED 
    // Show the user form
    app.get('/new-public-user', function (req, res) {
        res.render('new-public-user');
    });

    // !!!!!! DESACTIVATED 
    // Process the user form
    app.post('/new-public-user', function (req, res) {

        req.session.user = {};

        req.session.user.first_name = req.body.first_name;
        req.session.user.last_name = req.body.last_name;

        res.redirect('/new-public-doodle');
    });

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

        req.session.doodle = {};

        req.session.doodle.name = req.body.name;
        req.session.doodle.description = req.body.description;

        res.redirect('/new-public-schedules');
    });

    // =====================================
    // NEW PUBLIC SCHEDULES ================
    // =====================================
    // Show the schedules form
    app.get('/new-public-schedules', function (req, res) {
        res.render('new-public-schedules');
    });

    // Process the schedules form
    app.post('/new-public-schedules', function (req, res) {

        // We create the doodle 
        Doodle.newPublic(req.session.doodle, function (err, doodle) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
                res.redirect('index');
            }
            else {

                // We create the schedules of the doodle
                Doodle.addSchedules(doodle.id, req.body.schedules, function (err, result) {
                    if (err) {
                        req.flash('message', 'An error occured : ' + err);
                        res.redirect('index');
                    }
                    else {

                        var doodle_admin_id = uuid.v4(); 
                        var admin_link = req.headers.host + '/admin-public-doodle/' + doodle_admin_id;
                        var user_link = req.headers.host + '/public-doodle/' + doodle.id;

                        // We generate and associate a administration link to the doodle
                        Doodle.addDoodleAdminLink(doodle.id, admin_link, function (err, result) {
                            if (err) {
                                req.flash('message', 'An error occured : ' + err);
                                res.redirect('/');
                            }
                            else {
                                req.session.doodle_administration_link = admin_link;
                                req.session.doodle_user_link = user_link;

                                res.redirect('/index-public-doodle');
                            }
                        });
                    }
                });
            }
        })
    });

    // =====================================
    // SHOW PUBLIC DOODLE ==================
    // =====================================
    // Show generated links for the public doodle
    app.get('/index-public-doodle', function (req, res) {

        var admin_link = req.session.doodle_administration_link;
        var user_link = req.session.doodle_user_link;

        req.session.user = null;
        req.session.doodle = null;
        req.session.doodle_administration_id = null;
        req.session.doodle_user_id = null;

        res.render('index-public-doodle', {
            doodle_administration_link : admin_link,
            doodle_user_link : user_link
        });
    });

    // Show the public doodle for user
    app.get('/public-doodle/:id', function (req, res) {

        Doodle.getAllInformations(req.params.id, function (err, doodle) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
            }

            res.render('public-doodle', {
                doodle : doodle,
                message : req.flash('message')
            });
        });
    });

    // Show the public doodle for admin
    app.get('/admin-public-doodle', function (req, res) {
        // To Do
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

        // We create the new temporary user
        User.newPublicUser(req.body, function (err, user_id) {
            if (err) {
                req.flash('message', 'An error occured : ' + err);
                res.redirect('/public-doodle/' + req.params.id);
            }
            else {

                // We associate the new user with the doodle
                Doodle.addPublicUser(req.params.id, user_id, function (err, result) {
                    if (err) {
                        req.flash('message', 'An error occured : ' + err);
                        res.redirect('/public-doodle/' + req.params.id);
                    }
                    else {
                        req.session.user_id = user_id;
                        res.redirect('/public-doodle/' + req.params.id + '/add-public-vote');
                    }
                });
            }
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
                req.flash('message', 'An error occured : ' +err);
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
}






