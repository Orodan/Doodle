var LocalStrategy = require('passport-local').Strategy;
var User = require('../classes/user');
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
		User.findById(id, function (err, user) {
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

    	// First we check if the user trying to sign up already exists
    	User.getUserByEmail(email, function (err, user) {
    		if (err) {
    			return done(err);
    		}

    		// If the user already exists 
    		if (user) {
    			return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
    		}
    		else {

    			var newUser = {
                    "id" : Uuid.v4(),
    				"email" : email,
    				"password" : Global.generateHash(password),
                    "first_name" : req.body.first_name,
                    "last_name" : req.body.last_name
    			};

    			User.create(newUser, 'registred', function (err) {

                    if (err) {
                        return done(err);
                    }

                    return done(null, newUser);
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
        User.findByEmail(email, function (err, user) {

            // If an error happened, stop everything and send it back
            if (err) {
                return done(err);
            }

            // If no user is found, return the message
            if (!user) {
                return done(null, false, req.flash('loginMessage', 'No user found.'));
            }

            // If the user is found but the password is wrong
            if (!User.validPassword(password, user.password)) {
                return done(null, false, req.flash('loginMessage', 'Oops ! Wrong password.'));
            }

            // All is well, return successfull user
            return done(null, user, req.flash('message', 'Welcome !'));
        });
    }
    ));
};






