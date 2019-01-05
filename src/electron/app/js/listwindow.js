/* global $ */

const { ipcRenderer, remote, clipboard } = require('electron')
const LiveMe = remote.getGlobal('LiveMe')
const appSettings = require('electron-settings')
const DataManager = remote.getGlobal('DataManager')


let winType = 0
let userid = ''
let userinfo
let maxCount = 0
let totalCount = 0
let currentPage = 1
let threads = 0
let scrollBusy = false
let filters = { countryCode: '', seen: true, active: false }
let MAX_PAGE_SIZE = 50
let loadAllResults = appSettings.get('general.loadAllResults') || false
let blockedCountries = appSettings.get('general.blockedCountries') || []
const countryCodes  = require("./js/countryCodes.js")
const cclist = countryCodes.cclist

$(function () {
    let u = window.location.href
    let q = u.split('?')[1].split('&')

    userid = q[1]
    winType = parseInt(q[0])

    LiveMe.getUserInfo(userid).then(user => {
        maxCount = winType > 0 ? user.count_info.following_count : user.count_info.follower_count

        document.title = user.user_info.uname + (winType === 0 ? ' Fans' : ' Followings')
        $('header h1').html(document.title)
    })

    setTimeout(() => { startLoad() }, 200)

    setImmediate(() => { $('main').show() })

    filters.countryCode = ''
    filters.seen = true

    setImmediate(() => {
        $('#countryCode').empty()
        for (let i = 0; i < cclist.length; i++) {
            $('#countryCode').append(`<option value="${cclist[i][1]}">${cclist[i][0]}</option>`)
        }
    })

    $('main').scroll(function () {
        if (($(this).scrollTop() + $(this).height()) > ($('table').height() - 240)) {
            if (hasMore === false) return
            if (scrollBusy === true) return

            scrollBusy = true
            currentPage++

            if (winType === 1) {
                doFollowings()
            } else {
                doFans()
            }
        }
    })

    $('#list-search').bind('paste cut keydown', function () {
        setTimeout(() => {
            const value = $(this).val().toLowerCase()
            if (value.trim().length === 0) {
                $('table tr').show()
                return
            }
            $('table tr').each(function () {
                const name = $(this).find('h1').first().text().toLowerCase()
                const uids = $(this).find('.cell a[onclick]').text().toLowerCase()
                if (name.indexOf(value) !== -1 || uids.indexOf(value) !== -1) {
                    $(this).show()
                } else {
                    $(this).hide()
                }
            })
        }, 500)
    })
})

function startLoad () {
    $('table.fflist tbody').html('')

    scrollBusy = true
    currentPage = 1
    totalCount = 0

    switch (winType) {
    case 1: // Followers/Fans
        doFollowings()
        break
    case 0: // Followings
        doFans()
        break
    }
}

function loadMore () {
    scrollBusy = true
    threads = 0
    currentPage++

    switch (winType) {
    case 1: // Followers/Fans
        doFollowings()
        break
    case 0: // Followings
        doFans()
        break
    }
}

function filterCountry () {
    filters.active = $('#countryCode').val()
    filters.countryCode = $('#countryCode').val()
    startLoad()
}
function toggleSeen () {
    if (filters.seen === true) {
        filters.seen = false
        $('i.icon-eye').addClass('icon-eye-blocked').removeClass('icon-eye')
    } else {
        filters.seen = true
        $('i.icon-eye-blocked').addClass('icon-eye').removeClass('icon-eye-blocked')
    }
    filters.active = !filters.seen
    startLoad()
}

function copyToClipboard (i) { clipboard.writeText(i) }
function closeWindow () { window.close() }
function minimizeWindow () { remote.BrowserWindow.getFocusedWindow().minimize() }

function AddToBookmarks (userid) {

    LiveMe.getUserInfo(userid).then(user => {

        currentUser = {
            uid: user.user_info.uid,
            shortid: user.user_info.short_id,
            signature: user.user_info.usign,
            sex: user.sex,
            face: user.user_info.face,
            nickname: user.user_info.uname,
            counts: {
                changed: false,
                replays: user.count_info.video_count,
                friends: user.count_info.friends_count,
                followers: user.count_info.follower_count,
                followings: user.count_info.following_count
            },
            last_viewed: Math.floor((new Date()).getTime() / 1000),
            newest_replay: 0
        }

        if (DataManager.isBookmarked(currentUser) === true) {
            DataManager.removeBookmark(currentUser)
            $('a.bookmark-' + userid).attr('title', 'Add to Bookmarks').html('<i class="icon icon-star-empty"></i>')
        } else {
            DataManager.addBookmark(currentUser)
            $('a.bookmark-' + userid).attr('title', 'Remove from Bookmarks').html('<i class="icon icon-star-full bright yellow"></i>')
        }
    })
}


function populateList(results) {
        $('footer h2').html('<i class="icon icon-arrow-down dim"></i>')

        totalCount += results.length

        for (let i = 0; i < results.length; i++) {

            let isBlocked = false
            for (let j = 0; j < blockedCountries.length; j++) {
                if (results[i].countryCode == blockedCountries[j]) {
                    isBlocked = true
                    break
                }
            }

            if (isBlocked) continue

            if(DataManager.isIgnored(results[i].uid)) continue

            if ((filters.seen === true) && (filters.countryCode.length < 2)) {
                addEntry(results[i])
            } if ((filters.countryCode.length > 1) && (results[i].countryCode === filters.countryCode)) {
                if (filters.seen === true) {
                    addEntry(results[i])
                } else if ((filters.seen === false) && (DataManager.wasProfileViewed(results[i].uid) !== false)) {
                    addEntry(results[i])
                }
            } else if (filters.countryCode.length < 2) {
                if ((filters.seen === false) && (DataManager.wasProfileViewed(results[i].uid) === false)) {
                    addEntry(results[i])
                }
            }
        }

        setTimeout(() => {
            scrollBusy = false
            $('#list-search').trigger('keydown')
        }, 200)

        hasMore = results.length >= MAX_PAGE_SIZE

        let c = $('table.fflist tbody tr').length
        if (filters.seen === false || filters.countryCode.length > 1) {
            $('footer h1').html(`Showing ${c} filtered from ${totalCount} of ${maxCount} accounts.`)
        } else {
            $('footer h1').html(`Showing ${totalCount} of ${maxCount} accounts.`)
        }

        loadTimeout = 200
        if (loadAllResults) {
            loadTimeout = 1000
        }

        if (hasMore && (loadAllResults || ($('table.fflist tbody tr').length < (MAX_PAGE_SIZE * 2)))) {
            setTimeout(() => {
                loadMore()
            }, loadTimeout)
        }
}

function doFollowings () {
    $('footer h2').html('<i class="icon icon-arrow-down bright green"></i>')

    let blockedCountries = appSettings.get('blockedCountries')

    LiveMe.getFollowing(userid, currentPage, MAX_PAGE_SIZE).then(results => {
        populateList(results)
    })
}

function doFans () {
    $('footer h2').html('<i class="icon icon-arrow-down bright green"></i>')

    LiveMe.getFans(userid, currentPage, MAX_PAGE_SIZE).then(results => {
        populateList(results)
    })
}

function addEntry (entry) {

    let prettydate = require('pretty-date')
    let sex = entry.sex < 0 ? '' : (entry.sex == 0 ? 'is-female' : 'is-male')
    let seenRaw = DataManager.wasProfileViewed(entry.uid)
    let seenDate = seenRaw !== false ? prettydate.format(seenRaw) : ''
    let seen = seenRaw !== false ? 'bright blue' : 'dim'
    let bookmarked = DataManager.isBookmarked(entry) ? 'star-full bright yellow' : 'star-empty'

    $('table.fflist tbody').append(`
        <tr id="entry-${entry.uid}" class="entry-${entry.uid} ${sex}">
            <td width="64">
                <img src="${entry.face}" style="height: 64px; width: 64px;" onError="$(this).hide()" align="bottom" class="avatar">
            </td>
            <td width="90%">
                <div class="seen" title="Last seen ${seenDate}"><i class="icon icon-eye ${seen}"></i></div>
                <div class="bookmarked"><a style="cursor:pointer" onClick="AddToBookmarks('${entry.uid}')" class="bookmark-${entry.uid}"><i class="icon icon-${bookmarked}"></i></a></div>
                <h1>${entry.nickname}</h1>
                <div id="user-${entry.uid}" class="countrylevel" data-seen="Last seen ${seenDate}">
                    <div style="display: block; height:1px; white-space:nowrap;">
                        ${entry.countryCode} &nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;
                        <b>Level:</b> ${entry.level} &nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;
                        ${countryCodes.getFullName(entry.countryCode) }
                    </div>
                    <div class="cell" style="float:right" text-align: right;">
                        ${seenDate}
                    </div>
                    <br>
                    <div class="cell" style="width: 125px;">
                        Short ID: <a onClick="copyToClipboard('${entry.short_id}')" title="Click to copy to clipboard.">${entry.short_id}</a>
                    </div>
                    <div class="cell" style="width: 160px; text-align: right;">
                        ID: <a onClick="copyToClipboard('${entry.uid}')" title="Click to copy to clipboard.">${entry.uid}</a>
                    </div>
                </div>
                <div id="user-${entry.uid}-buttons" class="buttons">
                    <a class="button mini view" onClick="showUser('${entry.uid}')">View Account</a>
                    <a class="button mini fans" onClick="showFollowers('${entry.uid}')"></a>
                    <a class="button mini following" onClick="showFollowing('${entry.uid}')">0</a>
                </div>
            </td>
        </tr>
    `)

    LiveMe.getUserInfo(entry.uid).then(user => {
        if ((user.count_info.replay_count < 1) && (appSettings.get('general.hide_zeroreplay_followings') === true) && (winType === 1)) {
            $('#entry-' + user.user_info.uid).remove()
        } else if ((user.count_info.replay_count < 1) && (appSettings.get('general.hide_zeroreplay_fans') === true) && (winType === 0)) {
            $('#entry-' + user.user_info.uid).remove()
        } else {
            $('#entry-' + user.user_info.uid).addClass('entry-' + user.user_info.short_id)
            $('#user-' + user.user_info.uid + '-buttons a.view').html(user.count_info.replay_count + ' Replays')
            $('#user-' + user.user_info.uid + '-buttons a.fans').html(user.count_info.follower_count + ' Fans')
            $('#user-' + user.user_info.uid + '-buttons a.following').html('Following ' + user.count_info.following_count)
        }

        if (appSettings.get('general.hide_high_fan_count') == false) return;
        if ((user.count_info.follower_count > parseInt(appSettings.get('general.hide_high_fan_count_value'))) && (winType == 1))
            $('#entry-' + user.user_info.uid).remove()        
    })
}

function showFollowing (u) { ipcRenderer.send('open-followings-window', { userid: u }) }
function showFollowers (u) { ipcRenderer.send('open-followers-window', { userid: u }) }
function showUser (u) {
    $('#entry-' + u).animate({ opacity: 0.3 }, 200); ipcRenderer.send('show-user', { userid: u })
}
