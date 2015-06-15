// Dependencies ===========================
var Doodle = require('./classes/doodle');
var privateDoodle = require('./classes/privateDoodle');
var publicDoodle = require('./classes/publicDoodle');
var User = require('./classes/user');
var privateUser = require('./classes/privateUser');
var Vote = require('./classes/vote');
var Notification = require('./classes/notification');
var PublicUser = require('./classes/publicUser');
var Schedule = require('./classes/schedule');
var Configuration = require('./classes/configuration');
var ParticipationRequest = require('./classes/participationRequest');
var async = require('async');
var util = require('util');

module.exports = function (app, passport) {

    // Create user
    app.post('/api/user',
        jsonRequest,
        function (req, res) {
            var new_user = new privateUser(req.body.email, req.body.first_name, req.body.last_name, req.body.password);
            new_user.save(function (err) {
                if (err) {
                    return res.json({
                        type: 'error',
                        response: err
                    });
                }

                return res.json({
                    type: 'success',
                    response: new_user
                });
            });
        }
    );

    // =====================================
    // GET =================================
    // =====================================

    // ============================
    // PRIVATE DOODLE =============
    // ============================

    // Get doodle data
    app.get('/api/doodle/:doodle_id', 
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {

            var doodle_id = req.params.doodle_id;

            Doodle.getAllInformations(doodle_id, function (err, _doodle) {
                if (err) {
                    return res.json({
                        type: 'error',
                        response: err
                    });
                }

                if (!_doodle) {
                    return res.json({
                        type: 'error',
                        response: 'No doodle found'
                    });
                }

                res.json({
                    type: 'success',
                    response: _doodle
                });
            });
        }
    );

    // ============================
    // PUBLIC DOODLE ==============
    // ============================

    // Get public doodle data
    app.get('/api/public-doodle/:doodle_id', jsonRequest, function (req, res) {

        var doodle_id = req.params.doodle_id;

        async.series([
            // Check if the doodle id is a public doodle id
            function _checkPublicId (done) {
                Doodle.checkPublicId(doodle_id, function (err, is_public) {
                    // Error
                    if (err) {
                        return res.json({
                            type: 'error',
                            response: err
                        });
                    }

                    // Doodle is not public
                    if (!is_public) {
                        return res.json({
                            type: 'error',
                            response: "You don't have the permission to access this data"
                        }); 
                    }

                    return done();
                });
            },
            function _getDoodleData (done) {
                Doodle.getAllInformations(doodle_id, function (err, _doodle) {
                    // Error
                    if (err) {
                        return res.json({
                            type: 'error',
                            response: err
                        });
                    }

                    // No doodle found
                    if (!_doodle) {
                        return res.json({
                            type: 'error',
                            response: 'No doodle found'
                        });
                    }

                    return res.json({
                        type: 'success',
                        response: _doodle
                    });
                });
            }
        ]);        
    });

    // =====================================
    // POST ================================
    // =====================================

    // ============================
    // PRIVATE DOODLE =============
    // ============================

    // Create private doodle
    app.post('/api/doodle',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {

            var new_doodle = new privateDoodle(req.body.name, req.body.description);
            new_doodle.save(req.user.id, function (err) {
                // Error
                if (err) {
                    return res.json({
                        type: 'error',
                        response: err
                    });
                }

                return res.json({
                    type: 'success',
                    response: new_doodle
                });
            });
        }
    );

    // Create participation request
    app.post('/api/doodle/:doodle_id/participation-request',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {

            async.series([

                // Check if the user has the permission to create a participation request for this doodle
                function _verifyAdminId (done) {
                    Doodle.verifyAdminId(req.params.doodle_id, req.user.id, function (err, is_admin) {
                        if (err) {
                            return res.json({
                                type: 'error',
                                response: err
                            });
                        }

                        if (!is_admin) {
                            return res.json({
                                type: 'error',
                                response: "You don't have the permission to create a participation request for this doodle"
                            });
                        }

                        return done();
                    });
                },

                // Create the participation request
                function _createParticipationRequest (done) {
                    var new_participation_request = new ParticipationRequest(req.params.doodle_id, req.body.user_id);
                    new_participation_request.save(function (err) {
                        // Error
                        if (err) {
                            return res.json({
                                type: 'error',
                                response: err
                            });
                        }

                        return res.json({
                            type: 'success',
                            response: 'Participation request send'
                        });
                    });
                }
            ]);
        }
    );

    // ============================
    // PUBLIC DOODLE ==============
    // ============================

    // Create public doodle
    app.post('/api/public-doodle', jsonRequest, function (req, res) {
        res.end();
    });

    // =====================================
    // PUT =================================
    // =====================================

    // ============================
    // PRIVATE DOODLE =============
    // ============================

    // Update configuration of the user
    app.put('/api/user/:user_id',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // Update notification ( set it has been read by the user )
    app.put('/api/notification/:notification_id',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // Add a schedule to the doodle
    app.put('/api/doodle/:doodle_id/add-schedule',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // Remove a schedule from the doodle
    app.put('/api/doodle/:doodle_id/delete-schedule/:schedule_id',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // Update vote of the user on the doodle
    app.put('/api/doodle/:doodle_id/vote',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // Add an user to the doodle
    app.put('/api/doodle/:doodle_id/add-user/:user_id',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // Remove an user from the doodle
    app.put('/api/doodle/:doodle_id/remove-user/:user_id',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // ============================
    // PUBLIC DOODLE ==============
    // ============================

    // Add a schedule to the public doodle
    app.put('/api/public_doodle/:admin_id/add-schedule', jsonRequest, function (req, res) {
        res.end();
    });

    // Add an user to the public doodle
    app.put('/api/public-doodle/:doodle_id/add-user', jsonRequest, function (req, res) {
        res.end();
    });

    // Remove a schedule from the public doodle
    app.put('/api/public-doodle/:admin_id/delete-schedule/:schedule_id', jsonRequest, function (req, res) {
        res.end();
    });

    // Remove an user from the public doodle
    app.put('/api/public-doodle/:admin_id/remove-user/:user_id', jsonRequest, function (req, res) {
        res.end();
    });

    // =====================================
    // DELETE ==============================
    // =====================================

    // ============================
    // PRIVATE DOODLE =============
    // ============================

    // Delete the doodle
    app.delete('/api/doodle/:doodle_id',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // Delete the participation request
    app.delete('/api/doodle/:doodle_id/participation-request',
        passport.authenticate('basic', { session: false }),
        jsonRequest,
        function (req, res) {
            res.end();
        }
    );

    // ============================
    // PUBLIC DOODLE ==============
    // ============================

    // Delete the public doodle
    app.delete('/api/public-doodle/:admin_id', jsonRequest, function (req, res) {
        res.end();
    });

    // ====================================
    // MIDDLEWARE =========================
    // ====================================

    // Verify that the data from the client are json
    function jsonRequest (req, res, next) {
        if (req.is() == 'application/json') {
            next();
        }
        else {
            res.json({
                'type' : 'error',
                'response' : 'invalid data type'
            });
        }
    }
};






