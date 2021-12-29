/*

Filename: options.js
Description: Handle the interface to setting and changing application settings

*/

const { ipcRenderer, shell, clipboard } = require('electron')
let appSettings = null;

function saveSettings() {
    ipcRenderer.send('update-settings', appSettings)
}





$(function() {

    ipcRenderer.on('settings-form-refresh', (event, arg) => {


    })

})
