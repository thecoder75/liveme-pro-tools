/*

Filename: start.js
Description: Handle startup of the app and the first window code to allow selection of desired action(s)

*/




function showDownloads() { ipcRenderer.send('show-download-window') }
function showOptions() { ipcRenderer.send('show-options-window') }

function setupIPCListeners() {
    ipcRenderer.on('show-user', (event, arg) => {
    })
    ipcRenderer.on('show-user', (event, arg) => {
    })

}

function executeSearch() {
    $('#stype').attr('disabled','disabled');
    $('#sdata').attr('disabled','disabled');
    $('#search-query').val(arg.userid)
    $('#search-type').val('user-id')




}

function renderResults() {



}


$(function() {
    setupIPCListeners();
    $('#overlay').hide();
})
