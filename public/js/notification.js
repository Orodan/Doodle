jQuery(function($) {
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