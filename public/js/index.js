jQuery(function($) {

    /**************************\
     ******* INDEX PAGE *******
    \**************************/

    /** Hover on input **/
    $(document).on('focus', '.field-input', function () {
        $(this).parent().addClass('is-hovered has-label');
    })

    $(document).on('blur', '.field-input', function () {
        $parent = $(this).parent();

        $parent.removeClass('is-hovered');
        if ($(this).val() == '') {
            $parent.removeClass('has-label');
        }
    })

    /** Hover on link **/
    $(document).on('mouseover', 'section a', function () {
        $(this).find(">:first-child").addClass('is-hovered');
    });

    $(document).on('mouseleave', 'section a', function () {
        $(this).find(">:first-child").removeClass('is-hovered');
    });


    /** Focused **/
    $(document).on('focus', '.col-3 a', function () {
        $('.col-3 a').find(">:first-child").removeClass('is-focused');

        $(this).find(">:first-child").addClass('is-focused');

        var id =  $(this).attr('data');
        switch (id) {
            case 'main-signup':
                hideMainForms();
                $('#main-signup').removeClass('hidden');
                break;
            case 'main-login':
                hideMainForms();
                $('#main-login').removeClass('hidden');
                break;
            case 'main-public-doodle':
                hideMainForms();
                $('#main-public-doodle').removeClass('hidden');
                break;

            default: break;
        }
    });


    /** Public doodle **/

    $(document).on('click', '#btn-doodle-name-description', function (e) {
        e.preventDefault();
        $('#doodle-name-description').toggleClass('hidden');
        $('#doodle-schedules').toggleClass('hidden');
    });

    $(document).on('click', '#btn-previous', function (e) {
        e.preventDefault();
        $('#doodle-name-description').toggleClass('hidden');
        $('#doodle-schedules').toggleClass('hidden');
    });

    function hideMainForms () {
        $('#main-login').addClass('hidden').fadeIn('slow');
        $('#main-signup').addClass('hidden').fadeIn('slow');
        $('#main-public-doodle').addClass('hidden').fadeIn('slow');
    }

    /** Choose language **/

    $(document).on('click', '#display-language', function (e) {
        e.preventDefault();

        if( $('#languages').hasClass('hidden')) {
            $('.language').css('bottom', '60px');
        }
        else {
            $('.language').css('bottom', '0');
        }
        $('#languages').toggleClass('hidden');

        if ($('#chevron').hasClass('fa-chevron-right')){
            $('#chevron').removeClass().addClass('fa fa-chevron-down');
        }
        else {
            $('#chevron').removeClass().addClass('fa fa-chevron-right');
        }
    });

    $(document).on('click', '.lang', function (e) {
        e.preventDefault();

        var lang = $(this).attr('data');

        $.ajax({
            url: '/choose-language',
            type: 'PUT',
            data: { language: lang},
            dataType: 'text',
            success: function (res, statut) {
                // Reload of notifications
                $('.container').load('/ .starter-template');
            },
            error: function (res, statut, err) {

                console.log("error setting the language");
                console.log(res);
                console.log(statut);
                console.log(err);
            },
            complete: function (res, statut) {
            }
        });
    })
})