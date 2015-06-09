$(document).on('mouseover', '.article-title a', function () {
    $(this).find(">:first-child").addClass('is-hovered');
});

$(document).on('mouseleave', '.article-title a', function () {
    $(this).find(">:first-child").removeClass('is-hovered');
});