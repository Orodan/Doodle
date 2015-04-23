jQuery(function($) {

	var nbInputs = 1;

	$('#add-schedule').click(function (e) {
		// Stock the redirection
		e.preventDefault();

		// Show inputs date fields
		var inputs = 	'<div class="form-inline"> \
	                        <div class="form-group" style="width: 49%;"> \
	                            <input type="date" name="schedules[' + nbInputs + '][begin_date]" class="form-control"> \
	                        </div> \
	                        <div class="form-group" style="width: 49%;"> \
	                            <input type="text" name="schedules[' + nbInputs + '][begin_hour]" placeholder="HH:mm" class="form-control"> \
	                        </div> \
	                        <div class="form-group" style="width: 49%;"> \
                                <input type="date" name="schedules[' + nbInputs + '][end_date]" class="form-control"> \
                            </div> \
                            <div class="form-group" style="width: 49%;"> \
                                <input type="text" name="schedules[' + nbInputs + '][end_hour]" placeholder="HH:mm" class="form-control"> \
                            </div> \
	                    </div> \
	                    <br/>';

	    nbInputs++;
        $('#public-schedules').append(inputs);
	});

	/**************************\
	****** NOTIFICATIONS *******
	\**************************/

	// Notifications display
	//$('#notifications-button').click(function (e) {
	$(document).on('click', '#notifications-button', function (e) {
		e.preventDefault();
		$('#notifications-content').toggleClass('hidden');
	});

	// Click on a notification
	//$('.notification').click(function (e) {
	$(document).on('click', '.notification', function (e) {
		$.ajax({
			url: '/notification-read',
			type: 'PUT',
			data: { notification_id: $(this).attr('data')},
			dataType: 'text',
			success: function (res, statut) {
				// Reload of notifications
				$('#notifications-box').load('/profile #notifications');
			},
			error: function (res, statut, err) {

				$('#notifications-box').html('An error occured : ' + err);
				console.log("error");
				console.log(res);
				console.log(statut);
				console.log(err);
			},
			complete: function (res, statut) {
			}
		});
	});

});