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
    if (index === max) return

    $('footer h1').html(index + ' bookmarks rendered.')

    let d1 = prettydate.format(new Date(parseInt(list[index].newest_replay) * 1000))
    let d2 = d1
    if (parseInt(list[index].last_viewed) > 1514764800) d2 = prettydate.format(new Date(parseInt(list[index].last_viewed) * 1000))

    let nClass = parseInt(list[index].newest_replay) > parseInt(list[index].last_viewed) ? 'new_replays' : ''
    let fClass = list[index].counts.changed ? 'new_followings' : ''
    let sex = parseInt(list[index].sex) < 0 ? '' : (parseInt(list[index].sex) == 0 ? 'female' : 'male')
    let isNew = nClass.length || fClass.length ? 'isnew' : ''

    $('#bookmark-list').append(`
        <tr id="entry-${list[index].uid}" data-viewed="${list[index].last_viewed}" class="${sex} ${isNew} ${nClass} ${fClass}">
            <td width="64">
                <img src="${list[index].face}" style="height: 64px; width: 64px;" class="avatar" onError="$(this).attr('src', 'images/nouser.png')" align="bottom">
            </td>
            <td width="90%" class="main">
                <div class="bookmarkicon" onClick="removeBookmark('${list[index].uid}')"><i class="icon icon-star-full bright yellow"></i></div>
                <h1>${list[index].nickname}</h1>
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

    setImmediate(() => { drawEntry() })
}

function removeBookmark(uid) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].uid === uid) {
            deleted[uid] = list[i]
        }
    }
    $('#entry-' + uid + ' .bookmarkicon').remove()
    $('#entry-' + uid + ' td.main').append(`
                    <div class="bookmarkicon" onClick="addBookmark('${uid}')"><i class="icon icon-star-empty bright grey"></i></div>
    `)
    DataManager.removeBookmark(deleted[uid])
}

function addBookmark(uid) {

    DataManager.addBookmark(deleted[uid])
    $('#entry-' + uid + ' .bookmarkicon').remove()
    $('#entry-' + uid + ' td.main').append(`
                    <div class="bookmarkicon" onClick="removeBookmark('${uid}')"><i class="icon icon-star-full bright yellow"></i></div>
    `)
    deleted[uid] = null
}

function hideNonRecent() {
    $('#bookmark-list tr:not(.isnew)').toggle()
}

function toggleMonitoringFlag(uid) {
    let bookmark = DataManager.getSingleBookmark(uid)
    bookmark.monitored = !bookmark.monitored || false;
    DataManager.updateBookmark(bookmark)

    if (bookmark.monitored)
        $('#entry-'+uid).addClass('monitored')
    else
        $('#entry-'+uid).removeClass('monitored')

}
