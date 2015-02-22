jQuery(function($) {

	var nbInputs = 1;

	$('#add-schedule').click(function(e) {
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


	})
});