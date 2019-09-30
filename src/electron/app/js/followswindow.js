const { ipcRenderer, remote, clipboard } = require('electron')
const LiveMe = remote.getGlobal('LiveMe')
const appSettings = require('electron-settings')
const prettydate = require('pretty-date')
const DataManager = remote.getGlobal('DataManager')

let list = []
let index
let max
let deleted = []

let timeSpan = 0
let shown = 0

$(function() {
    $('main').show()

    $('#bookmark-list').html('')

    ipcRenderer.on('refresh-list', (event, arg) => {
        $('#bookmark-list').html('')
        redrawList()
    })

    ipcRenderer.on('refresh-entry', (event, arg) => {
        addSingleEntry(arg, false)
    })

    ipcRenderer.on('add-entry', (event, arg) => {
        console.log('Add:' + JSON.stringify(arg, null, 2))
        addSingleEntry(arg, true)
        DataManager.addToFollows(arg)
    })

    ipcRenderer.on('remove-entry', (event, arg) => {
        console.log('Remove:' + JSON.stringify(arg, null, 2))
        $('#entry-'+arg.uid).remove()
        DataManager.removeFromFollowList(arg)
    })



    setImmediate(() => {
        redrawList()
    })
})

function minimizeWindow() { remote.BrowserWindow.getFocusedWindow().minimize() }

function closeWindow() { window.close() }

function copyToClipboard(i) { clipboard.writeText(i) }

function showFollowing(u) { ipcRenderer.send('open-followings-window', { userid: u }) }

function showFollowers(u) { ipcRenderer.send('open-followers-window', { userid: u }) }

function showUser(u) { ipcRenderer.send('show-user', { userid: u }) }

function redrawList() {
    list = DataManager.getAllFollows()
    index = 0
    max = list.length
    shown = 0
    timeSpan = $('#bookmark-timespan').val() * 86400
    if (timeSpan < 86400) timeSpan = (365 * 86400) * 50    // Show active in the last 50 years (ALL OF THEM!)

    $('#bookmark-list').html('')
    if (list.length > 0)
        drawEntry()
}

function drawEntry() {
    $('footer h1').html(index + ' follows.')
    if (index === max) return

    addSingleEntry(list[index], true)
    index++

    setImmediate(() => {
        drawEntry()
    })
}

function addSingleEntry(e, m) {
    if (m === true) {
        $('#bookmark-list').append(`
            <tr id="entry-${e.uid}">
                <td width="64">
                    <img src="${e.face}" style="height: 64px; width: 64px;" class="avatar" onError="$(this).attr('src', 'images/nouser.png')" align="bottom">
                </td>
                <td width="90%" class="main">
                    <h1>${e.nickname}</h1>
                    <h2>${e.signature}</h2>
                    <div id="user-${e.uid}-buttons" class="buttons">
                        <a class="button mini view" onClick="showUser('${e.uid}')">${e.counts.replays} replays</a>
                        <a class="button mini fans" onClick="showFollowers('${e.uid}')">${e.counts.followers} Fans</a>
                        <a class="button mini following" onClick="showFollowing('${e.uid}')">Following ${e.counts.followings}</a>
                    </div>
                </td>
            </tr>
        `)
    } else
        $('tr #entry-'+e.uid).html(`
                <td width="64">
                    <img src="${e.face}" style="height: 64px; width: 64px;" class="avatar" onError="$(this).attr('src', 'images/nouser.png')" align="bottom">
                </td>
                <td width="90%" class="main">
                    <h1>${e.nickname}</h1>
                    <h2>${e.signature}</h2>
                    <div id="user-${e.uid}-buttons" class="buttons">
                        <a class="button mini view" onClick="showUser('${e.uid}')">${e.counts.replays} replays</a>
                        <a class="button mini fans" onClick="showFollowers('${e.uid}')">${e.counts.followers} Fans</a>
                        <a class="button mini following" onClick="showFollowing('${e.uid}')">Following ${e.counts.followings}</a>
                    </div>
                </td>
        `)
}
