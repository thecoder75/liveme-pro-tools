$(function() {
    const u1=window.location.href.split('?')[1]
    $('h5').html('v' + u1.split('=')[1])

})
