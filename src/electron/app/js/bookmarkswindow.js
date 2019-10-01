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

    ipcRenderer.on('add-entry', (event, arg) => {
        addSingleEntry(arg, true)
    })

    ipcRenderer.on('remove-entry', (event, arg) => {
        $('#entry-'+arg.uid).remove()
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
    list = DataManager.getAllBookmarks()
    index = 0
    max = list.length
    shown = 0
    timeSpan = $('#bookmark-timespan').val() * 86400
    if (timeSpan < 86400) timeSpan = (365 * 86400) * 50    // Show active in the last 50 years (ALL OF THEM!)

    $('#bookmark-list').html('')
    drawEntry()
}

function drawEntry() {
    $('footer h1').html(index + ' of ' + max + ' bookmarks scanned, ' + shown + ' shown.')
    if (index === max) return

    let d_now = new Date()
    let d_past = new Date(d_now.getTime() - (timeSpan * 1000))

    if ((list[index].newest_replay * 1000) > d_past.getTime()) {
        addSingleEntry(list[index], true)
        shown++;
    }
    index++

    setImmediate(() => {
        drawEntry()
    })
}

function addSingleEntry(e,m) {
    let d1 = prettydate.format(new Date(parseInt(e.newest_replay) * 1000))
    let d2 = d1
    if (parseInt(e.last_viewed) > 1514764800) d2 = prettydate.format(new Date(parseInt(e.last_viewed) * 1000))

    let sex = parseInt(e.sex) < 0 ? '' : (parseInt(e.sex) == 0 ? 'female' : 'male')
    let isNew = (e.newest_replay > e.last_viewed) || e.counts.changed ? 'new' : ''
    let monitored = e.lamd == undefined ? 'dim' : e.lamd.monitor ? 'bright yellow' : 'dim'

    if (m === true) {
        $('#bookmark-list').append(`
            <tr id="entry-${e.uid}" data-viewed="${e.last_viewed}" class="${sex} ${isNew}">
                <td width="64">
                    <img src="${e.face}" style="height: 64px; width: 64px;" class="avatar" onError="$(this).attr('src', 'images/nouser.png')" align="bottom">
                </td>
                <td width="90%" class="main">
                    <div class="bookmarkicon" onClick="removeBookmark('${e.uid}')">
                        <svg class="bright yellow" viewBox="0 0 20 20">
                            <path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path>
                        </svg>
                    </div>
                    <div class="monitoricon" onClick="toggleMonitoringFlag('${e.uid}')" title="Toggle LAMD monitoring of this account.">
                        <svg class="${monitored}" viewBox="0 0 20 20">
                            <path d="M10,6.978c-1.666,0-3.022,1.356-3.022,3.022S8.334,13.022,10,13.022s3.022-1.356,3.022-3.022S11.666,6.978,10,6.978M10,12.267c-1.25,0-2.267-1.017-2.267-2.267c0-1.25,1.016-2.267,2.267-2.267c1.251,0,2.267,1.016,2.267,2.267C12.267,11.25,11.251,12.267,10,12.267 M18.391,9.733l-1.624-1.639C14.966,6.279,12.563,5.278,10,5.278S5.034,6.279,3.234,8.094L1.609,9.733c-0.146,0.147-0.146,0.386,0,0.533l1.625,1.639c1.8,1.815,4.203,2.816,6.766,2.816s4.966-1.001,6.767-2.816l1.624-1.639C18.536,10.119,18.536,9.881,18.391,9.733 M16.229,11.373c-1.656,1.672-3.868,2.594-6.229,2.594s-4.573-0.922-6.23-2.594L2.41,10l1.36-1.374C5.427,6.955,7.639,6.033,10,6.033s4.573,0.922,6.229,2.593L17.59,10L16.229,11.373z"></path>
                        </svg>
                    </div>
                    <h1>${e.nickname}</h1>
                    <h2>${e.signature}</h2>
                    <h3><span>Latest Replay:</span> ${d1}</h3>
                    <h4><span>Last Viewed:</span> ${d2}</h4>
                    <div id="user-${e.uid}-buttons" class="buttons">
                        <a class="button mini view" onClick="showUser('${e.uid}')">${e.counts.replays} replays</a>
                        <a class="button mini fans" onClick="showFollowers('${e.uid}')">${e.counts.followers} Fans</a>
                        <a class="button mini following" onClick="showFollowing('${e.uid}')">Following ${e.counts.followings}</a>
                    </div>
                </td>

            </tr>
        `)
    } else {
        $('#entry-'+e.uid).html(`
                <td width="64">
                    <img src="${e.face}" style="height: 64px; width: 64px;" class="avatar" onError="$(this).attr('src', 'images/nouser.png')" align="bottom">
                </td>
                <td width="90%" class="main">
                    <div class="bookmarkicon" onClick="removeBookmark('${e.uid}')">
                        <svg class="bright yellow" viewBox="0 0 20 20">
                            <path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path>
                        </svg>
                    </div>
                    <div class="monitoricon" onClick="toggleMonitoringFlag('${e.uid}')" title="Toggle LAMD monitoring of this account.">
                        <svg class="${monitored}" viewBox="0 0 20 20">
                            <path d="M10,6.978c-1.666,0-3.022,1.356-3.022,3.022S8.334,13.022,10,13.022s3.022-1.356,3.022-3.022S11.666,6.978,10,6.978M10,12.267c-1.25,0-2.267-1.017-2.267-2.267c0-1.25,1.016-2.267,2.267-2.267c1.251,0,2.267,1.016,2.267,2.267C12.267,11.25,11.251,12.267,10,12.267 M18.391,9.733l-1.624-1.639C14.966,6.279,12.563,5.278,10,5.278S5.034,6.279,3.234,8.094L1.609,9.733c-0.146,0.147-0.146,0.386,0,0.533l1.625,1.639c1.8,1.815,4.203,2.816,6.766,2.816s4.966-1.001,6.767-2.816l1.624-1.639C18.536,10.119,18.536,9.881,18.391,9.733 M16.229,11.373c-1.656,1.672-3.868,2.594-6.229,2.594s-4.573-0.922-6.23-2.594L2.41,10l1.36-1.374C5.427,6.955,7.639,6.033,10,6.033s4.573,0.922,6.229,2.593L17.59,10L16.229,11.373z"></path>
                        </svg>
                    </div>
                    <h1>${e.nickname}</h1>
                    <h2>${e.signature}</h2>
                    <h3><span>Latest Replay:</span> ${d1}</h3>
                    <h4><span>Last Viewed:</span> ${d2}</h4>
                    <div id="user-${e.uid}-buttons" class="buttons">
                        <a class="button mini view" onClick="showUser('${e.uid}')">${e.counts.replays} replays</a>
                        <a class="button mini fans" onClick="showFollowers('${e.uid}')">${e.counts.followers} Fans</a>
                        <a class="button mini following" onClick="showFollowing('${e.uid}')">Following ${e.counts.followings}</a>
                    </div>
                </td>
        `)
    }
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
    if (typeof bookmark == 'undefined') return

    bookmark.lamd.monitor = !bookmark.lamd.monitor
    DataManager.updateBookmark(bookmark)
    DataManager.saveToDisk()

    if (bookmark.lamd.monitor)
        $('#entry-'+uid+' .monitoricon svg').addClass('bright').addClass('yellow').removeClass('dim')
    else
        $('#entry-'+uid+' .monitoricon svg').removeClass('bright').removeClass('yellow').addClass('dim')

}

function toggleMaleProfiles() {
    if ($('#filter-male').hasClass('active') === true) {
        $('.male').hide()
        $('#filter-male').removeClass('active')
    } else {
        $('.male').show()
        $('#filter-male').addClass('active')
    }
}

function toggleFemaleProfiles() {
    if ($('#filter-female').hasClass('active') === true) {
        $('.female').hide()
        $('#filter-female').removeClass('active')
    } else {
        $('.female').show()
        $('#filter-female').addClass('active')
    }
}
