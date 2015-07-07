// Dependencies 
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
	BasicStrategy = require('passport-http').BasicStrategy;

var oauth2orize = require('oauth2orize'),
	passport = require('passport'),
	login = require('connect-ensure-login'),
	db = require('../db');

var privateUser = require('../classes/privateUser');

// Passport strategies setup
// Client strategy
passport.use(new ClientPasswordStrategy(
    function(clientId, clientSecret, done) {

        db.clients.findById(clientId, function(err, client) {
            if (err) { return done(err); }
            if (!client) { return done(null, false); }
            if (client.client_secret != clientSecret) { return done(null, false); }
            return done(null, client);
        });
    }
));

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
server.serializeClient(function (client, done) {
	return done(null, client.client_id);
});

server.deserializeClient(function (id, done) {
	db.clients.findById(id, function (err, client) {
		return done(err, client);
	});
});

// Register supported grant types

// Grant authorization codes.
server.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares, callback) {
	var code = uid(16);

	db.authorizationCodes.save(code, client.client_id, redirectURI, user.id, function (err) {
		if (err) { return callback(err); }

		return callback(null, code);
	});
}));

// Exchange authorization codes for access tokens.
server.exchange(oauth2orize.exchange.code(function (client, code, redirectURI, callback) {

	db.authorizationCodes.find(code, function (err, authCode) {

		if (err) { return callback(err); }
		if (authCode === undefined) { return callback(null, false); }
		// Id are uuid object, can't compare them with only '==='
		if (!client.client_id.equals(authCode.client_id)) { return callback(null, false); }
		if (redirectURI !== authCode.redirectURI) { return callback(null, false); }

		// Delete the authorization code and generate access token 
		db.authorizationCodes.delete(code, function (err) {
			if (err) { return callback(err); }
			var token = uid(256);
			db.accessTokens.save(token, authCode.user_id, authCode.client_id, function (err) {
				if (err) { return callback(err); }
				return callback(null, token);
			});
		});
	});
}));

// user authorization endpoint
exports.authorization = [
	passport.authenticate('basic', { session: false}),
	server.authorization(function (clientId, redirectUri, callback) {
		db.clients.findById(clientId, function (err, client) {
			if (err) { return callback(err); }
			// Add redirectUri checking here when everything will be working fine
			return callback(null, client, redirectUri);
		});
	}),
	// Skip the user allow process
	function (req, res, next) {
  		req.body = {};
  		req.body.transaction_id = req.oauth2.transactionID;
  		next();
  	},
  	server.decision()
	/** function (req, res) {
		return res.render('pages/dialog', {
			transactionID: req.oauth2.transactionID,
			user: req.user,
			client: req.oauth2.client
		});
	} **/
];

// user decision endpoint
/**
*	For the integration in OAE, we don't want the user to always have to confirm the access
*   to interact with the app, so we skip the decision endpoint of the user to automaticaly allow
*	access of the user data for OAE.
**/
/**
exports.decision = [
  login.ensureLoggedIn(),
  server.decision()
];
**/

// token endpoint
exports.token = [
	passport.authenticate('oauth2-client-password', { session: false }),
	server.token(),
	server.errorHandler()
];

/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */
var uid = function (len) {
  var buf = [],
   	chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
   	charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

/**
 * Return a random int, used by `uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Middleware to make sur a user is logged in
function isLoggedIn (req, res, next) {

	if (req.isAuthenticated()) {
		return next();
	}

	return res.status(403).json({
		'type': 'error',
		'response': 'You are not logged in.'
	});
}