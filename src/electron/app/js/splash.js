/*

Filename: splash.js
Description: Handle the splash dialog on startup

*/

$(function() {
    const u1=window.location.href.split('?')[1]
    $('h6').html('v' + u1.split('=')[1])

})
