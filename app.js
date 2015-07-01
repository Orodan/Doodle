// dependencies ===============================================================
var express = require('express');
var app = express();

var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require('path');
var cassandra = require('cassandra-driver');
var passport = require('passport');
var flash = require('connect-flash');
var i18n = require('i18n');

var oauthserver = require('oauth2-server');

// configuration ===============================================================

// Database
var client = new cassandra.Client({keyspace: 'doodle', contactPoints: ['127.0.0.1']});
client.connect( function(err) {
	(err) ? console.log("An error happened : " + err) : console.log("Connected to Cassandra");
});

// Models
var user = require('./app/classes/user');
var doodle = require('./app/classes/doodle');
var schedule = require('./app/classes/schedule');
var vote = require('./app/classes/vote');
var notification = require('./app/classes/notification');
var configuration = require('./app/classes/configuration');
var participationRequest = require('./app/classes/participationRequest');
var validator = require('./app/classes/validator');
var model = require('./app/config/model');

// Association model - database
user.db = client;
user.uuid = cassandra.types.uuid;

doodle.db = client;
doodle.uuid = cassandra.types.uuid;

schedule.db = client;
schedule.uuid = cassandra.types.uuid;

vote.db = client;

notification.db = client;
notification.timeuuid = cassandra.types.timeuuid;

configuration.db = client;

participationRequest.db = client;
participationRequest.uuid = cassandra.types.uuid;

validator.db = client;
model.db = client;

model.uuid = cassandra.types.Uuid;

require('./app/config/passport')(passport);

// Views
app.set('views', path.join(__dirname, 'app/views'));
app.set('view engine', 'ejs');

// set up express
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// required for passport
app.use(session({
					secret : 'masupersessionsecrete',
					saveUninitialized : true,
					resave : true
				}));
app.use(passport.initialize());
app.use(passport.session());	// persistent login sessions
app.use(flash());				// flash messages stored in session

// Internationalization
i18n.configure({
	locales: ['en', 'fr'],
	directory: __dirname + '/app/locales',
	cookie: 'mylanguage'
});

app.use(i18n.init);
app.use(function (req, res, next) {
	if (!req.cookies.mylanguage) {
		res.cookie('mylanguage', 'en', { maxAge: 900000, httpOnly: true });
	}
	next();
});

// Oauth
app.oauth = oauthserver({
	model: require ('./app/config/model.js'),
	grants: ['password', 'refresh_token'],
	passthroughErrors: true
});

// app.use(app.oauth.errorHandler());

// routes ======================================================================
require('./app/routes.js')(app, passport);

// API =========================================================================
require('./app/api.js')(app, passport);

// launch ======================================================================
app.listen(3000);
console.log("The magic happens on port 3000 !");
