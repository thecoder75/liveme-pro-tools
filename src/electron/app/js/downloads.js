/*

Filename: options.js
Description: Handle the interface to setting and changing application settings

*/

const { ipcRenderer, shell, clipboard } = require('electron')

function cancelDownload(vid) {
    ipcRenderer.send('download-cancel', { video_id: vid })
}


$(function() {

    ipcRenderer.on('download-add', (event, arg) => {

    })

    ipcRenderer.on('download-update', (event, arg) => {

    })

    ipcRenderer.on('download-remove', (event, arg) => {

    })



})
