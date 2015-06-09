jQuery(function($) {

    /** UPDATE VOTES **/
	$(document).on('click', '#btn-update-vote', function(e) {
		e.preventDefault();	// Stop the call

		var input_votes = [];	// Array to stock the data
		var inputs = $('.input_vote');

		// Populate our array with the value of the inputs
		$.each(inputs, function (key, _vote) {
			input_votes.push({
				schedule_id: _vote.name,
				vote : (_vote.checked) ? 1 : -1
			});
		});

		$.ajax({
            url: window.location.pathname + '/update-votes',
            type: 'PUT',
            data: { votes : input_votes },
            dataType: 'text',
            success: function (res, statut) {
            	console.log("votes updated");
            	// Reload the table
                // $('#table').load(window.location.pathname + ' table');
            },
            error: function (res, statut, err) {
                console.log(res);
                console.log(statut);
                console.log(err);
            },
            complete: function (res, statut) {
                window.location.reload();
            }
        });	
	});

    /** DELETE  **/
    $(document).on('click', '.close-icon', function (e) {
        e.preventDefault(); 

        var data = $(this).attr('data');

        switch (data) {
            /** DELETE  SCHEDULE **/
            case 'schedule': 
                var schedule_id = $(this).attr('id');

                $.ajax({
                    url: window.location.pathname + '/delete-schedule',
                    type: 'DELETE',
                    data: { schedule_id : schedule_id },
                    dataType: 'text',
                    success: function (res, statut) {
                        console.log("schedule deleted");
                        // Reload the table
                        // $('.starter-template').load(window.location.pathname + ' .col-md-12');
                    },
                    error: function (res, statut, err) {
                        console.log(res);
                        console.log(statut);
                        console.log(err);
                    },
                    complete: function (res, statut) {
                        window.location.reload();
                    }
                });
                break;

            /** DELETE  USER **/
            case 'user':
                var user_id = $(this).attr('id');
                var current_user_id = $('#current_user_id').attr('value');

                $.ajax({
                    url: window.location.pathname + '/remove-user',
                    type: 'DELETE',
                    data: { user_id : user_id },
                    dataType: 'text',
                    success: function (res, statut) {
                        console.log("user removed");

                        // The user deleted himself from the doodle
                        if (user_id == current_user_id) {
                            // Redirection on the home page
                            window.location.replace('/home');
                        }
                        // The admin simply deleted an user
                        else {
                            // Reload the table
                            // $('.starter-template').load(window.location.pathname + ' .col-md-12');
                        }
                    },
                    error: function (res, statut, err) {
                        console.log(res);
                        console.log(statut);
                        console.log(err);
                    },
                    complete: function (res, statut) {
                        window.location.reload();
                    }
                });
                break;

            default: break;
        }
    }); 

    /** ADD USER **/
    $(document).on('click', '#new_user', function (e) {
        e.preventDefault();

        var new_user_email = $('#new_user_email').val();

        $.ajax({
            url: window.location.pathname + '/create-participation-request',
            type: 'POST',
            data: { email : new_user_email },
            dataType: 'text',
            success: function (res, statut) {
                console.log("participation request send");

                // Reload the table
                // $('.starter-template').load(window.location.pathname + ' .col-md-12');
            },
            error: function (res, statut, err) {
                console.log(res);
                console.log(statut);
                console.log(err);
            },
            complete: function (res, statut) {
                window.location.reload();
            }
        });
    });

    /** ADD PUBLIC USER **/
    $(document).on('click', '#new-public-user', function (e) {
        e.preventDefault();

        var nameArray = $('#public-user-name').val().split(' ');
        if (nameArray.length > 0) {

            var data = {};

            data.user = {
                first_name: nameArray[0],
                last_name: nameArray[1]
            };
            data.votes = [];

            var inputs = $('.input_vote_public_user');

            $.each(inputs, function (key, _vote) {
                data.votes.push({
                    schedule_id: _vote.name,
                    vote : (_vote.checked) ? 1 : -1
                });
            });

            $.ajax({
                url: window.location.pathname + '/add-public-user',
                type: 'POST',
                data: { data : data },
                dataType: 'text',
                success: function (res, statut) {
                    console.log("new public user added");

                    // Reload the table
                    // $('.starter-template').load(window.location.pathname + ' .col-md-12');
                },
                error: function (res, statut, err) {
                    console.log(res);
                    console.log(statut);
                    console.log(err);
                },
                complete: function (res, statut) {
                    window.location.reload();
                }
            });
        }
        else {
            console.log("Invalid name, you must give correct first name and last name");
        }
        
    });

    /** ADD SCHEDULE **/
    $(document).on('click', '#btn-add-schedule', function (e) {
        e.preventDefault();

        $('#myModal').modal('hide');
        
        var begin_date = $('#begin_date').val();
        var end_date = $('#end_date').val();

        var schedule = {
            begin_date: begin_date,
            end_date: end_date
        };

        $.ajax({
            url: window.location.pathname + '/add-schedule',
            type: 'POST',
            data: { schedule : schedule },
            dataType: 'text',
            success: function (res, statut) {
                console.log("schedule added");

                // Reload the table
                // $('.starter-template').load(window.location.pathname + ' .col-md-12');
            },
            error: function (res, statut, err) {
                console.log(res);
                console.log(statut);
                console.log(err);
            },
            complete: function (res, statut) {
                window.location.reload();
            }
        });
        
    });
});

