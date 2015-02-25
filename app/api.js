// Dependencies
var auth = require('basic-auth');
var User = require('./classes/user');
var Doodle = require('./classes/doodle');

module.exports = function (app) {

	app.get('/api', basicAuth, function (req, res) {
		res.send("Hello world !");
	});


	// =====================================
    // DOODLE PRIVÉ ========================
    // =====================================

    app.post('/api/doodle', basicAuth, function (req, res) {

    	Doodle.new(req.body, req.headers.id, function (err, doodle) {

 			var response = {};

    		if (err) {
    			response.type = 'error';
    			response.message = 'An error occured : ' + err;
    		}
    		else {
    			response.type = 'success';
    			response.message = 'Doodle created';
    		}

    		response.doodle = doodle;
    		return res.send(response);
    	});
    });


	// =====================================
    // MIDDLEWARE ==========================
    // =====================================

	function basicAuth (req, res, next) {

		var credentials = auth(req);

		if (!credentials) {
			return res.send('An error occured : no credentials found in request headers for basic authentication');
		}

		User.basicAuthentication(credentials.name, credentials.pass, function (err, user) {
			if (err) {
				return res.send('An error occured : ' + err);
			}

			req.headers.id = user.id;
			next();
		});
	}
}
