const { ipcRenderer, remote, clipboard } = require('electron')
const LiveMe = remote.getGlobal('LiveMe')
const appSettings = require('electron-settings')
const prettydate = require('pretty-date')
const DataManager = remote.getGlobal('DataManager')

let list = []
let index
let max
let deleted = []

$(function() {
    $('main').show()

    list = DataManager.getAllBookmarks()
    index = 0
    max = list.length

    $('#bookmark-list').html('')

    $('#bookmark-search').bind('paste cut keydown', function() {
        setTimeout(() => {
            const value = $(this).val().toLowerCase()
            if (value.trim().length === 0) {
                $('#bookmark-list tr').show()
                return
            }
            $('#bookmark-list tr').each(function() {
                const name = $(this).find('h1').first().text().toLowerCase()
                if (name.toLowerCase().indexOf(value) !== -1) {
                    $(this).show()
                } else {
                    $(this).hide()
                }
            })
        }, 500)
    })

    setImmediate(() => {
        drawEntry()
    })
})

function minimizeWindow() { remote.BrowserWindow.getFocusedWindow().minimize() }

function closeWindow() { window.close() }

function copyToClipboard(i) { clipboard.writeText(i) }

function showFollowing(u) { ipcRenderer.send('open-followings-window', { userid: u }) }

function showFollowers(u) { ipcRenderer.send('open-followers-window', { userid: u }) }

function showUser(u) { ipcRenderer.send('show-user', { userid: u }) }

function redrawList() {
    index = 0
    $('#bookmark-list').html('')
    drawEntry()
}

function drawEntry() {
    $('footer h1').html(index + ' of ' + max + ' bookmarks rendered.')
    if (index === max) return

    let d1 = prettydate.format(new Date(parseInt(list[index].newest_replay) * 1000))
    let d2 = d1
    if (parseInt(list[index].last_viewed) > 1514764800) d2 = prettydate.format(new Date(parseInt(list[index].last_viewed) * 1000))

    let sex = parseInt(list[index].sex) < 0 ? '' : (parseInt(list[index].sex) == 0 ? 'female' : 'male')
    let isNew = (list[index].newest_replay > list[index].last_viewed) || list[index].counts.changed ? 'new' : ''
    let monitored = list[index].lamd == undefined ? 'dim' : list[index].lamd.monitor ? 'bright yellow' : 'dim'

    $('#bookmark-list').append(`
        <tr id="entry-${list[index].uid}" data-viewed="${list[index].last_viewed}" class="${sex} ${isNew}">
            <td width="64">
                <img src="${list[index].face}" style="height: 64px; width: 64px;" class="avatar" onError="$(this).attr('src', 'images/nouser.png')" align="bottom">
            </td>
            <td width="90%" class="main">
                <div class="bookmarkicon" onClick="removeBookmark('${list[index].uid}')">
                    <svg class="bright yellow" viewBox="0 0 20 20">
                        <path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path>
                    </svg>
                </div>
                <div class="monitoricon" onClick="toggleMonitoringFlag('${list[index].uid}')" title="Toggle LAMD monitoring of this account.">
                    <svg class="${monitored}" viewBox="0 0 20 20">
                        <path d="M10,6.978c-1.666,0-3.022,1.356-3.022,3.022S8.334,13.022,10,13.022s3.022-1.356,3.022-3.022S11.666,6.978,10,6.978M10,12.267c-1.25,0-2.267-1.017-2.267-2.267c0-1.25,1.016-2.267,2.267-2.267c1.251,0,2.267,1.016,2.267,2.267C12.267,11.25,11.251,12.267,10,12.267 M18.391,9.733l-1.624-1.639C14.966,6.279,12.563,5.278,10,5.278S5.034,6.279,3.234,8.094L1.609,9.733c-0.146,0.147-0.146,0.386,0,0.533l1.625,1.639c1.8,1.815,4.203,2.816,6.766,2.816s4.966-1.001,6.767-2.816l1.624-1.639C18.536,10.119,18.536,9.881,18.391,9.733 M16.229,11.373c-1.656,1.672-3.868,2.594-6.229,2.594s-4.573-0.922-6.23-2.594L2.41,10l1.36-1.374C5.427,6.955,7.639,6.033,10,6.033s4.573,0.922,6.229,2.593L17.59,10L16.229,11.373z"></path>
                    </svg>            
                </div>
                <h1>${list[index].nickname}</h1>
                <h2>${list[index].signature}</h2>
                <h3><span>Latest Replay:</span> ${d1}</h3>
                <h4><span>Last Viewed:</span> ${d2}</h4>
                <div id="user-${list[index].uid}-buttons" class="buttons">
                    <a class="button mini view" onClick="showUser('${list[index].uid}')">${list[index].counts.replays} replays</a>
                    <a class="button mini fans" onClick="showFollowers('${list[index].uid}')">${list[index].counts.followers} Fans</a>
                    <a class="button mini following" onClick="showFollowing('${list[index].uid}')">Following ${list[index].counts.followings}</a>
                </div>
            </td>

        </tr>
    `)
    index++

    setTimeout(() => { drawEntry() }, 10)
}

function removeBookmark(uid) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].uid === uid) {
            deleted[uid] = list[i]
        }
    }
    $('#entry-' + uid + ' .bookmarkicon').remove()
    $('#entry-' + uid + ' td.main').append(`
                    <div class="bookmarkicon" onClick="addBookmark('${uid}')"><svg class="dim" viewBox="0 0 20 20"><path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path></svg></div>
    `)
    DataManager.removeBookmark(deleted[uid])
}

function addBookmark(uid) {

    DataManager.addBookmark(deleted[uid])
    $('#entry-' + uid + ' .bookmarkicon').remove()
    $('#entry-' + uid + ' td.main').append(`
                    <div class="bookmarkicon" onClick="removeBookmark('${uid}')"><svg class="bright yellow" viewBox="0 0 20 20"><path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path></svg></div>
    `)
    deleted[uid] = null
}

function hideNonRecent() {
    $('#bookmark-list tr:not(.isnew)').toggle()
}

function toggleMonitoringFlag(uid) {

    let bookmark = DataManager.getSingleBookmark(uid)
    bookmark.lamd.monitor = !bookmark.lamd.monitor;
    DataManager.updateBookmark(bookmark)
    DataManager.saveToDisk()
    
    if (bookmark.lamd.monitor)
        $('#entry-'+uid+' .monitoricon i').addClass('bright').addClass('yellow').removeClass('dim')
    else
        $('#entry-'+uid+' .monitoricon i').removeClass('bright').removeClass('yellow').addClass('dim')

}
