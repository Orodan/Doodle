// Dependencies -----------------------------------------------
var privateUser = require('../classes/privateUser');

var model = module.exports;

/**
*	Get the client access token
*
*	@param {string}		[bearerToken]	The bearer token
*	@param {function} 	[callback]		The callback function
*
**/
model.getAccessToken = function (bearerToken, callback) {

	var query = 'SELECT access_token, client_id, expires, user_id FROM oauth_access_tokens WHERE access_token = ?';
	model.db.execute(query, [ bearerToken ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		if (result.rows.length === 0) {
			return callback('No data found');
		}

		var token = result.rows[0];

		return callback(null, {
			accessToken: token.access_token,
			clientId: token.client_id,
			expires: token.expires,
			userId: token.user_id
		});
	});
};

/**
*	Get the client refresh token
*
*	@param {string}		[bearerToken]	The bearer token
*	@param {function} 	[callback]		The callback function
*
**/
model.getRefreshToken = function (bearerToken, callback) {

	var query = 'SELECT refresh_token, client_id, expires, user_id FROM oauth_refresh_tokens WHERE refresh_token = ?';
	model.db.execute(query, [ bearerToken ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		if (result.rows.length === 0) {
			return callback('No data found');
		}

		var token = result.rows[0];

		return callback(null, {
			refreshToken: token.refresh_token,
			clientId: token.client_id,
			expires: token.expires,
			userId: token.user_id
		});
	});
};

/**
*	Get the client with the specified id
*
*	@param {uuid}		[clientId]		The id of the client
*	@param {uuid}		[clientSecret]	The secret of the client
*	@param {function} 	[callback]		The callback function
*
**/
model.getClient = function (clientId, clientSecret, callback) {

	var query = 'SELECT client_id, client_secret, redirect_uri FROM oauth_clients WHERE client_id = ?';
	model.db.execute(query, [ clientId ], { prepare : true }, function (err, result) {
		if (err) {
			return callback(err);
		}

		if (result.rows.length === 0) {
			return callback('No client found.');
		}

		return callback(null, {
			clientId: result.rows[0].client_id,
			clientSecret: result.rows[0].client_secret
		});
	});
};

/**
*	Verify the grant type specified is allowed for the the client with the specified client id
*
*	@param {uuid} 		[clientId]		The id of the client
*	@param {string}		[grantType]		The type of the grant
*	@param {function} 	[callback]		The callback function
*
**/
model.grantTypeAllowed = function (clientId, grantType, callback) {
	if (grantType === 'password' || grantType === 'refresh_token') {
		var query = 'SELECT * FROM oauth_clients WHERE client_id = ?';
		model.db.execute(query, [ clientId ], { prepare: true }, function (err, result) {
			if (err) {
				return callback(err);
			}

			if (result.rows.length === 0) {
				return callback(false, 'You are not authorized.');
			}

			return callback(false, true);
		});
	}
	else {
		return callback(false, false);	
	}
};

/**
*	Save the access token of the client in db
*
*	@param {uuid}		[accessToken]	The access token of the client
*	@param {uuid}		[clientId]		The id of the client
*	@param {timestamp}	[expires]		The expiration date of the token
*	@param {uuid}		[userId]		The id of the user
*	@param {function} 	[callback]		The callback function
*
**/
model.saveAccessToken = function (accessToken, clientId, expires, userId, callback) {

	// In case the call is to refresh the access token
	if (typeof userId.id !== 'undefined') {
		userId = userId.id;
	}

	var query = 'INSERT INTO oauth_access_tokens (access_token, client_id, user_id, expires) values (?, ?, ?, ?)';
	model.db.execute(query, [ accessToken, clientId, userId, expires ], { prepare : true }, function (err) {
		return callback(err);
	});
};

/**
*	Save the refresh token of the client in db
*
*	@param {uuid}		[accessToken]	The access token of the client
*	@param {uuid}		[clientId]		The id of the client
*	@param {timestamp}	[expires]		The expiration date of the token
*	@param {uuid}		[userId]		The id of the user
*	@param {function} 	[callback]		The callback function
*
**/
model.saveRefreshToken = function (refreshToken, clientId, expires, userId, callback) {

	// In case the call is to refresh the access token
	if (typeof userId.id !== 'undefined') {
		userId = userId.id;
	}

	var query = 'INSERT INTO oauth_refresh_tokens (refresh_token, client_id, user_id, expires) values (?, ?, ?, ?)';
	model.db.execute(query, [ refreshToken, clientId, userId, expires ], { prepare : true }, function (err) {
		return callback(err);
	});
};

/**
*	Get the user
*
*	@param {string} 	[email] 		The email of the user
*	@param {string} 	[password]		The password of the user
*	@param {function} 	[callback]		The callback function
*
**/
model.getUser = function (email, password, callback) {

	privateUser.findByEmail(email, function (err, user) {

        // If an error happened, stop everything and send it back
        if (err) {
            return callback(err);
        }

        // If the user is found but the password is wrong
        if (!privateUser.validPassword(password, user.password)) {
            return callback('Wrong password.');
        }

        // All is well, return successfull user
        return callback(null, user.id);
    });

};
