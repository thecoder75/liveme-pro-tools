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
            $('a.bookmark-' + userid).attr('title', 'Add to Bookmarks').html('<svg class="dim" viewBox="0 0 20 20"><path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path></svg>')
        } else {
            DataManager.addBookmark(currentUser)
            $('a.bookmark-' + userid).attr('title', 'Remove from Bookmarks').html('<svg class="bright yellow" viewBox="0 0 20 20"><path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path></svg>')
        }
    })
}


function populateList(results) {
        $('footer h2').html('<svg class="dim" viewBox="0 0 20 20"><path d="M15.684,16.959L10.879,8.52c0.886-0.343,1.517-1.193,1.517-2.186c0-1.296-1.076-2.323-2.396-2.323S7.604,5.037,7.604,6.333c0,0.993,0.63,1.843,1.517,2.186l-4.818,8.439c-0.189,0.311,0.038,0.708,0.412,0.708h10.558C15.645,17.667,15.871,17.27,15.684,16.959 M8.562,6.333c0-0.778,0.645-1.382,1.438-1.382s1.438,0.604,1.438,1.382c0,0.779-0.645,1.412-1.438,1.412S8.562,7.113,8.562,6.333 M5.55,16.726L10,8.91l4.435,7.815H5.55z M15.285,9.62c1.26-2.046,1.26-4.525,0-6.572c-0.138-0.223-0.064-0.512,0.162-0.646c0.227-0.134,0.521-0.063,0.658,0.16c1.443,2.346,1.443,5.2,0,7.546c-0.236,0.382-0.641,0.17-0.658,0.159C15.221,10.131,15.147,9.842,15.285,9.62 M13.395,8.008c0.475-1.063,0.475-2.286,0-3.349c-0.106-0.238,0.004-0.515,0.246-0.62c0.242-0.104,0.525,0.004,0.632,0.242c0.583,1.305,0.583,2.801,0,4.106c-0.214,0.479-0.747,0.192-0.632,0.242C13.398,8.523,13.288,8.247,13.395,8.008 M3.895,10.107c-1.444-2.346-1.444-5.2,0-7.546c0.137-0.223,0.431-0.294,0.658-0.16c0.226,0.135,0.299,0.424,0.162,0.646c-1.26,2.047-1.26,4.525,0,6.572c0.137,0.223,0.064,0.512-0.162,0.646C4.535,10.277,4.131,10.489,3.895,10.107 M5.728,8.387c-0.583-1.305-0.583-2.801,0-4.106c0.106-0.238,0.39-0.346,0.631-0.242c0.242,0.105,0.353,0.382,0.247,0.62c-0.475,1.063-0.475,2.286,0,3.349c0.106,0.238-0.004,0.515-0.247,0.62c-0.062,0.027-0.128,0.04-0.192,0.04C5.982,8.668,5.807,8.563,5.728,8.387"></path></svg>')

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

        loadTimeout = 100
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
    $('footer h2').html('<svg class="bright green" viewBox="0 0 20 20"><path d="M15.684,16.959L10.879,8.52c0.886-0.343,1.517-1.193,1.517-2.186c0-1.296-1.076-2.323-2.396-2.323S7.604,5.037,7.604,6.333c0,0.993,0.63,1.843,1.517,2.186l-4.818,8.439c-0.189,0.311,0.038,0.708,0.412,0.708h10.558C15.645,17.667,15.871,17.27,15.684,16.959 M8.562,6.333c0-0.778,0.645-1.382,1.438-1.382s1.438,0.604,1.438,1.382c0,0.779-0.645,1.412-1.438,1.412S8.562,7.113,8.562,6.333 M5.55,16.726L10,8.91l4.435,7.815H5.55z M15.285,9.62c1.26-2.046,1.26-4.525,0-6.572c-0.138-0.223-0.064-0.512,0.162-0.646c0.227-0.134,0.521-0.063,0.658,0.16c1.443,2.346,1.443,5.2,0,7.546c-0.236,0.382-0.641,0.17-0.658,0.159C15.221,10.131,15.147,9.842,15.285,9.62 M13.395,8.008c0.475-1.063,0.475-2.286,0-3.349c-0.106-0.238,0.004-0.515,0.246-0.62c0.242-0.104,0.525,0.004,0.632,0.242c0.583,1.305,0.583,2.801,0,4.106c-0.214,0.479-0.747,0.192-0.632,0.242C13.398,8.523,13.288,8.247,13.395,8.008 M3.895,10.107c-1.444-2.346-1.444-5.2,0-7.546c0.137-0.223,0.431-0.294,0.658-0.16c0.226,0.135,0.299,0.424,0.162,0.646c-1.26,2.047-1.26,4.525,0,6.572c0.137,0.223,0.064,0.512-0.162,0.646C4.535,10.277,4.131,10.489,3.895,10.107 M5.728,8.387c-0.583-1.305-0.583-2.801,0-4.106c0.106-0.238,0.39-0.346,0.631-0.242c0.242,0.105,0.353,0.382,0.247,0.62c-0.475,1.063-0.475,2.286,0,3.349c0.106,0.238-0.004,0.515-0.247,0.62c-0.062,0.027-0.128,0.04-0.192,0.04C5.982,8.668,5.807,8.563,5.728,8.387"></path></svg>')

    let blockedCountries = appSettings.get('blockedCountries')

    LiveMe.getFollowing(userid, currentPage, MAX_PAGE_SIZE).then(results => {
        populateList(results)
    })
}

function doFans () {
    $('footer h2').html('<svg class="bright green" viewBox="0 0 20 20"><path d="M15.684,16.959L10.879,8.52c0.886-0.343,1.517-1.193,1.517-2.186c0-1.296-1.076-2.323-2.396-2.323S7.604,5.037,7.604,6.333c0,0.993,0.63,1.843,1.517,2.186l-4.818,8.439c-0.189,0.311,0.038,0.708,0.412,0.708h10.558C15.645,17.667,15.871,17.27,15.684,16.959 M8.562,6.333c0-0.778,0.645-1.382,1.438-1.382s1.438,0.604,1.438,1.382c0,0.779-0.645,1.412-1.438,1.412S8.562,7.113,8.562,6.333 M5.55,16.726L10,8.91l4.435,7.815H5.55z M15.285,9.62c1.26-2.046,1.26-4.525,0-6.572c-0.138-0.223-0.064-0.512,0.162-0.646c0.227-0.134,0.521-0.063,0.658,0.16c1.443,2.346,1.443,5.2,0,7.546c-0.236,0.382-0.641,0.17-0.658,0.159C15.221,10.131,15.147,9.842,15.285,9.62 M13.395,8.008c0.475-1.063,0.475-2.286,0-3.349c-0.106-0.238,0.004-0.515,0.246-0.62c0.242-0.104,0.525,0.004,0.632,0.242c0.583,1.305,0.583,2.801,0,4.106c-0.214,0.479-0.747,0.192-0.632,0.242C13.398,8.523,13.288,8.247,13.395,8.008 M3.895,10.107c-1.444-2.346-1.444-5.2,0-7.546c0.137-0.223,0.431-0.294,0.658-0.16c0.226,0.135,0.299,0.424,0.162,0.646c-1.26,2.047-1.26,4.525,0,6.572c0.137,0.223,0.064,0.512-0.162,0.646C4.535,10.277,4.131,10.489,3.895,10.107 M5.728,8.387c-0.583-1.305-0.583-2.801,0-4.106c0.106-0.238,0.39-0.346,0.631-0.242c0.242,0.105,0.353,0.382,0.247,0.62c-0.475,1.063-0.475,2.286,0,3.349c0.106,0.238-0.004,0.515-0.247,0.62c-0.062,0.027-0.128,0.04-0.192,0.04C5.982,8.668,5.807,8.563,5.728,8.387"></path></svg>')

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
                <div class="seen" title="Last seen ${seenDate}">
                    <svg class="${seen}" viewBox="0 0 20 20">
                        <path d="M10,6.978c-1.666,0-3.022,1.356-3.022,3.022S8.334,13.022,10,13.022s3.022-1.356,3.022-3.022S11.666,6.978,10,6.978M10,12.267c-1.25,0-2.267-1.017-2.267-2.267c0-1.25,1.016-2.267,2.267-2.267c1.251,0,2.267,1.016,2.267,2.267C12.267,11.25,11.251,12.267,10,12.267 M18.391,9.733l-1.624-1.639C14.966,6.279,12.563,5.278,10,5.278S5.034,6.279,3.234,8.094L1.609,9.733c-0.146,0.147-0.146,0.386,0,0.533l1.625,1.639c1.8,1.815,4.203,2.816,6.766,2.816s4.966-1.001,6.767-2.816l1.624-1.639C18.536,10.119,18.536,9.881,18.391,9.733 M16.229,11.373c-1.656,1.672-3.868,2.594-6.229,2.594s-4.573-0.922-6.23-2.594L2.41,10l1.36-1.374C5.427,6.955,7.639,6.033,10,6.033s4.573,0.922,6.229,2.593L17.59,10L16.229,11.373z"></path>
                    </svg>                
                </div>
                <div class="bookmarked">
                    <a style="cursor:pointer" onClick="AddToBookmarks('${entry.uid}')" class="bookmark-${entry.uid}">
                        <svg class="${bookmarked}" viewBox="0 0 20 20">
                            <path d="M17.684,7.925l-5.131-0.67L10.329,2.57c-0.131-0.275-0.527-0.275-0.658,0L7.447,7.255l-5.131,0.67C2.014,7.964,1.892,8.333,2.113,8.54l3.76,3.568L4.924,17.21c-0.056,0.297,0.261,0.525,0.533,0.379L10,15.109l4.543,2.479c0.273,0.153,0.587-0.089,0.533-0.379l-0.949-5.103l3.76-3.568C18.108,8.333,17.986,7.964,17.684,7.925 M13.481,11.723c-0.089,0.083-0.129,0.205-0.105,0.324l0.848,4.547l-4.047-2.208c-0.055-0.03-0.116-0.045-0.176-0.045s-0.122,0.015-0.176,0.045l-4.047,2.208l0.847-4.547c0.023-0.119-0.016-0.241-0.105-0.324L3.162,8.54L7.74,7.941c0.124-0.016,0.229-0.093,0.282-0.203L10,3.568l1.978,4.17c0.053,0.11,0.158,0.187,0.282,0.203l4.578,0.598L13.481,11.723z"></path>
                        </svg>
                    </a>
                </div>
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

    if ($('#filter-female').hasClass('active') === true) {
        $('.is-female').hide()
    }
    
    if ($('#filter-male').hasClass('active') === true) {
        $('.is-male').hide()
    }

    
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
            
        if ($('#filter-female').hasClass('active') === true) {
            $('.is-female').hide()
        }
        
        if ($('#filter-male').hasClass('active') === true) {
            $('.is-male').hide()
        }
        
        if (appSettings.get('general.hide_high_fan_count') == false) return;
        if ((user.count_info.follower_count > parseInt(appSettings.get('general.hide_high_fan_count_value'))) && (winType == 1)) $('#entry-' + user.user_info.uid).remove()      
                    
    })
}

function showFollowing (u) { ipcRenderer.send('open-followings-window', { userid: u }) }
function showFollowers (u) { ipcRenderer.send('open-followers-window', { userid: u }) }
function showUser (u) {
    $('#entry-' + u).animate({ opacity: 0.3 }, 200); ipcRenderer.send('show-user', { userid: u })
}

function toggleMaleProfiles() {
    if ($('#filter-male').hasClass('active') === true) {
        $('.is-male').hide()
        $('#filter-male').removeClass('active')
    } else {
        $('.is-male').show()
        $('#filter-male').addClass('active')
    }
}

function toggleFemaleProfiles() {
    if ($('#filter-female').hasClass('active') === true) {
        $('.is-female').hide()
        $('#filter-female').removeClass('active')
    } else {
        $('.is-female').show()
        $('#filter-female').addClass('active')
    }
}
