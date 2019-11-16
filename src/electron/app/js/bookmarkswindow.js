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
