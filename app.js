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

var basicAuth = require('basic-auth-connect');

// configuration ===============================================================

// Database
var client = new cassandra.Client({contactPoints: ['127.0.0.1']});
client.connect( function(err) {
	(err) ? console.log("An error happened : " + err) : console.log("Connected to Cassandra");
});

// Models
var user = require('./app/classes/user');
var doodle = require('./app/classes/doodle');

// Association model - database
user.db = client;
doodle.db = client;

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

// basic authentication configuration
var auth = basicAuth(function (email, password, callback) {
	var result = ( email === 'test@gmail.com' && password === 'test');
	return callback(null, result);
});

// routes ======================================================================
require('./app/routes.js')(app, passport);	

// API =========================================================================
require('./app/api.js')(app, auth);

// launch ======================================================================
app.listen(3000);
console.log("The magic happens on port 3000 !");




