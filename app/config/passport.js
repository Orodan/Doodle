var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var privateUser = require('../classes/privateUser');
var Global = require('../classes/global');
var async = require('async');
var crypto = require('crypto');

var db = require('../db');

module.exports = function (passport) {

	passport.crypto_algorithm = 'aes-256-ctr';
	passport.crypto_password = null;

	// =========================================================================
    // passport session setup ==================================================
    // =========================================================================

	// required for persistent login sessions
	// passport needs ability to serialize and unserialize users out of session

	passport.serializeUser(function (user, done) {
		return done(null, user.id);
	});

	passport.deserializeUser(function (id, done) {
		privateUser.findById(id, function (err, user) {
			return done(err, user);
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

    // =========================================================================
    // BASIC STRATEGY ==========================================================
    // =========================================================================
    passport.use(new BasicStrategy(
        function (email, password, done) {

			// email = decrypt(email);
			// password = decrypt(password);

            // Find the user id thanks to his/her email
            db.users.findByEmail(email, function (err, user) {
                if (err) { return done(err); }
                if (!user) { console.log("Invalid email"); console.log("Done : ", done); return done(null, false, { message: "Invalid email" }); }

                // Find the user data thanks to his/her id
                db.users.find(user.user_id, function (err, user_data) {
                    if (err) { return done(err); }
                    if (!user_data) { return done(null, false, { type: 'error', response: 'Invalid user id.' }); }

                    // Verify password
                    if (!privateUser.validPassword(password, user_data.password)) {
                        return done(null, false, { type: 'error', response: 'Invalid password.' });
                    }

                    return done(null, user_data);
                });
            });

            /**
            privateUser.findByEmail(email, function (err, user) {
                // Error
                if (err) {
                    return done({
                        'type': 'error',
                        'response': err
                    });
                }

                // Wrong password
                if (!privateUser.validPassword(password, user.password)) {
                    return done(null, false);
                }

                return done(null, user);
            });
            **/
        }
    ));

    /**
     * BearerStrategy
     *
     * This strategy is used to authenticate users based on an access token (aka a
     * bearer token).  The user must have previously authorized a client
     * application, which is issued an access token to make requests on behalf of
     * the authorizing user.
     */
     passport.use(new BearerStrategy(
        function(accessToken, done) {
            db.accessTokens.find(accessToken, function(err, token) {
                if (err) { return done(err); }
                if (!token) { return done(null, false, { message: 'Invalid token' }); }

                // Verify here the access token has not expired
                var tokenExpires = new Date(token.expires);
                var now = new Date();

                // Token expired
                if (tokenExpires < now) {
                    return done(null, false, { message : 'Token expired' });
                }

                db.users.find(token.user_id, function(err, user) {
                    if (err) { return done(err); }
                    if (!user) { return done(null, false, { message: 'Invalid user' }); }

                    var info = { scope: '*' };
                    return done(null, user, info);
                });
            });
        }
    ));


	function encrypt(text){
		var cipher = crypto.createCipher(passport.crypto_algorithm, passport.crypto_password);
		var crypted = cipher.update(text,'utf8','hex');
		crypted += cipher.final('hex');
		return crypted;
	}

	function decrypt(text, tenant){
		var decipher = crypto.createDecipher(passport.crypto_algorithm, passport.crypto_password);
		var dec = decipher.update(text,'hex','utf8');
		dec += decipher.final('utf8');
		return dec;
	}
};
