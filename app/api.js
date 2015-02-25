

module.exports = function (app, auth) {

	app.get('/api', auth, function (req, res) {
		res.send("Hello world !");
	});
}