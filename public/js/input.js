jQuery (function($) {
    $('.field-input').on('focus', function () {
        $(this).parent().addClass('is-focused has-label');
    })

    $('.field-input').on('blur', function () {
        $parent = $(this).parent();

        $parent.removeClass('is-focused');
        if ($(this).val() == '') {
            $parent.removeClass('has-label');
        }
    })
})