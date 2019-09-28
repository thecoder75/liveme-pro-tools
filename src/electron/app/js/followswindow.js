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

    $('#bookmark-list').append(`
        <tr id="entry-${list[index].uid}">
            <td width="64">
                <img src="${list[index].face}" style="height: 64px; width: 64px;" class="avatar" onError="$(this).attr('src', 'images/nouser.png')" align="bottom">
            </td>
            <td width="90%" class="main">
                <div class="bookmarkicon" onClick="removeFollow('${list[index].uid}')">
                    <svg class="bright yellow" viewBox="0 0 20 20">
						<path d="M15.396,2.292H4.604c-0.212,0-0.385,0.174-0.385,0.386v14.646c0,0.212,0.173,0.385,0.385,0.385h10.792c0.211,0,0.385-0.173,0.385-0.385V2.677C15.781,2.465,15.607,2.292,15.396,2.292 M15.01,16.938H4.99v-2.698h1.609c0.156,0.449,0.586,0.771,1.089,0.771c0.638,0,1.156-0.519,1.156-1.156s-0.519-1.156-1.156-1.156c-0.503,0-0.933,0.321-1.089,0.771H4.99v-3.083h1.609c0.156,0.449,0.586,0.771,1.089,0.771c0.638,0,1.156-0.518,1.156-1.156c0-0.638-0.519-1.156-1.156-1.156c-0.503,0-0.933,0.322-1.089,0.771H4.99V6.531h1.609C6.755,6.98,7.185,7.302,7.688,7.302c0.638,0,1.156-0.519,1.156-1.156c0-0.638-0.519-1.156-1.156-1.156c-0.503,0-0.933,0.322-1.089,0.771H4.99V3.062h10.02V16.938z M7.302,13.854c0-0.212,0.173-0.386,0.385-0.386s0.385,0.174,0.385,0.386s-0.173,0.385-0.385,0.385S7.302,14.066,7.302,13.854 M7.302,10c0-0.212,0.173-0.385,0.385-0.385S8.073,9.788,8.073,10s-0.173,0.385-0.385,0.385S7.302,10.212,7.302,10 M7.302,6.146c0-0.212,0.173-0.386,0.385-0.386s0.385,0.174,0.385,0.386S7.899,6.531,7.688,6.531S7.302,6.358,7.302,6.146"></path>
                    </svg>
                </div>
                <h1>${list[index].nickname}</h1>
                <h2>${list[index].signature}</h2>
                <div id="user-${list[index].uid}-buttons" class="buttons">
                    <a class="button mini view" onClick="showUser('${list[index].uid}')">${list[index].counts.replays} replays</a>
                    <a class="button mini fans" onClick="showFollowers('${list[index].uid}')">${list[index].counts.followers} Fans</a>
                    <a class="button mini following" onClick="showFollowing('${list[index].uid}')">Following ${list[index].counts.followings}</a>
                </div>
            </td>

        </tr>
    `)

    index++

    setImmediate(() => {
        drawEntry()
    })
}

function removeFollow(uid) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].uid === uid) {
            deleted[uid] = list[i]
        }
    }
    $('#entry-' + uid + ' .bookmarkicon').remove()
    $('#entry-' + uid + ' td.main').append(`
                    <div class="bookmarkicon" onClick="addFollow('${uid}')"><svg class="dim" viewBox="0 0 20 20"><path d="M15.396,2.292H4.604c-0.212,0-0.385,0.174-0.385,0.386v14.646c0,0.212,0.173,0.385,0.385,0.385h10.792c0.211,0,0.385-0.173,0.385-0.385V2.677C15.781,2.465,15.607,2.292,15.396,2.292 M15.01,16.938H4.99v-2.698h1.609c0.156,0.449,0.586,0.771,1.089,0.771c0.638,0,1.156-0.519,1.156-1.156s-0.519-1.156-1.156-1.156c-0.503,0-0.933,0.321-1.089,0.771H4.99v-3.083h1.609c0.156,0.449,0.586,0.771,1.089,0.771c0.638,0,1.156-0.518,1.156-1.156c0-0.638-0.519-1.156-1.156-1.156c-0.503,0-0.933,0.322-1.089,0.771H4.99V6.531h1.609C6.755,6.98,7.185,7.302,7.688,7.302c0.638,0,1.156-0.519,1.156-1.156c0-0.638-0.519-1.156-1.156-1.156c-0.503,0-0.933,0.322-1.089,0.771H4.99V3.062h10.02V16.938z M7.302,13.854c0-0.212,0.173-0.386,0.385-0.386s0.385,0.174,0.385,0.386s-0.173,0.385-0.385,0.385S7.302,14.066,7.302,13.854 M7.302,10c0-0.212,0.173-0.385,0.385-0.385S8.073,9.788,8.073,10s-0.173,0.385-0.385,0.385S7.302,10.212,7.302,10 M7.302,6.146c0-0.212,0.173-0.386,0.385-0.386s0.385,0.174,0.385,0.386S7.899,6.531,7.688,6.531S7.302,6.358,7.302,6.146"></path></svg></div>
    `)
    DataManager.removeFromFollowList(deleted[uid])
}

function addFollow(uid) {

    DataManager.addToFollowList(deleted[uid])
    $('#entry-' + uid + ' .bookmarkicon').remove()
    $('#entry-' + uid + ' td.main').append(`
                    <div class="bookmarkicon" onClick="removeBookmark('${uid}')"><svg class="bright yellow" viewBox="0 0 20 20"><path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path></svg></div>
    `)
    deleted[uid] = null
}
