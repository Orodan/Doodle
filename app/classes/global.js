// Dependencies
var bcrypt = require('bcrypt-nodejs');

// Class with golbal utilities functions
var global = {};

/**
*	Clear the passed object of its functions,
*	just let the data
*/
global.clearObject = function (data, callback) {
	var result = {};
	var i = 0;

	for(key in data) {
		if (typeof data[key] != 'function') {
			result[key] = data[key];
			i++;
		}
	};

	while(i < data.length) {
		callback(null, result);
	}

};

/**
*	Generating a hash
*/
global.generateHash = function (password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

module.exports = global;