/*

Filename: options.js
Description: Handle the interface to setting and changing application settings

*/

const { ipcRenderer, shell, clipboard } = require('electron')
let appSettings = null;

function saveSettings() {

    appSettings = {
        startup: {
            checkForUpdates: $('#check-for-updates').prop('checked'),
            checkForNews: $('#check-for-news').prop('checked')
        },
        history: {
            profileviewed: $('#history-accounts').prop('checked'),
            replayviewed: $('#history-replays').prop('checked')
        },
        auth: {
            username: $('#auth-username').val(),
            password: $('#auth-password').val()
        },
        downloads: {
            pattern: $('#download-pattern').val(),
            concurrent: $('#download-concurrent').val()
        },
        apiTweaks: {
            speed: $('#fast-api').prop('checked') ? 'fast' : 'slow',
            searchlimit: $('#search-limit').val(),
            replaylimit: $('#replay-limit').val(),
            listlimit: $('#list-limit').val()
        }
    }

    ipcRenderer.send('update-settings', appSettings)

}





$(function() {

    ipcRenderer.send('fetch-settings')


    ipcRenderer.on('settings-form-refresh', (event, arg) => {

        appSettings = arg

        console.log(appSettings)

        $('#auth-username').val(appSettings.auth.username)
        $('#auth-password').val(appSettings.auth.password)

        $('#check-for-updates').prop('checked', appSettings.startup.checkForUpdates)
        $('#check-for-news').attr('checked', appSettings.startup.checkForNews)

        $('#history-accounts').attr('checked', appSettings.history.profileviewed)
        $('#history-replays').attr('checked', appSettings.history.replayviewed)

        $('#download-concurrent').val(appSettings.downloads.concurrent)
        $('#download-pattern').val(appSettings.downloads.pattern)

        $('#fast-api').attr('checked', appSettings.apiTweaks.speed !== 'slow')

        $('#search-limit').val(appSettings.apiTweaks.searchlimit)
        $('#replay-limit').val(appSettings.apiTweaks.replaylimit)
        $('#list-limit').val(appSettings.apiTweaks.listlimit)

        console.log(appSettings)

    })

})
