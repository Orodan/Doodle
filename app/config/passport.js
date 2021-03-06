var LocalStrategy = require('passport-local').Strategy;
var privateUser = require('../classes/privateUser');
var Global = require('../classes/global');
var Uuid = require('node-uuid');

module.exports = function (passport) {

	// =========================================================================
    // passport session setup ==================================================
    // =========================================================================

	// required for persistent login sessions
	// passport needs ability to serialize and unserialize users out of session

	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function (id, done) {
		privateUser.findById(id, function (err, user) {
			done(err, user);
		});
	});

	// =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================

    passport.use('local-signup', new LocalStrategy({
    	// By default the local strategy uses username and password, we override
    	// it with email
    	usernameField: 'email',
    	passwordField: 'password',
    	passReqToCallback: true
    },
    function (req, email, password, done) {

    	// Check if the user trying to sign up already exists
        privateUser.check(email, function (err, find) {

            // The user already exists, stop
            if (find) {
                return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
            }
            else {
                
                var user = new privateUser(email, req.body.first_name, req.body.last_name, password);
                user.save(function (err) {
                    if (err) {
                        return done(err);
                    }

                    return done(null, user);
                });
                
            }
        });
    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true    // allow us to pass back the entire request to the callback
    },
    function (req, email, password, done) {
        privateUser.findByEmail(email, function (err, user) {

            // If an error happened, stop everything and send it back
            if (err) {
                return done(null, false, req.flash('loginMessage', err));
            }

            // If the user is found but the password is wrong
            if (!privateUser.validPassword(password, user.password)) {
                return done(null, false, req.flash('loginMessage', 'Oops ! Wrong password.'));
            }

            // All is well, return successfull user
            return done(null, user, req.flash('message', 'Welcome !'));
        });
    }
    ));
};






