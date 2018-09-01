/* global $ */

const MAX_PER_PAGE = 5

const { electron, BrowserWindow, remote, ipcRenderer, shell, dialog, clipboard } = require('electron')
const fs = require('fs')
const path = require('path')
const appSettings = remote.require('electron-settings')
const isDev = remote.getGlobal('isDev')
const LiveMe = remote.getGlobal('LiveMe')
const DataManager = remote.getGlobal('DataManager')
const formatDuration = require('format-duration')
const prettydate = require('pretty-date')
const request = require('request')

let currentUser = {}
let currentPage = 1
let currentIndex = 0
let tempvar = null
let hasMore = false
let currentSearch = ''
let scrollBusy = false
let currentView = 'home'

$(function () {
    document.title = 'LiveMe Pro Tools v' + remote.app.getVersion() // Set Title of Window

    setupContextMenu() // Set up the Context Menu for Cut/Copy/Paste on text fields
    onTypeChange() // Init Search Field
    setupIPCListeners() // Set up our IPC listeners
    setupLoadOnScroll() // Setup loading more on scroll only when searching for usernames

    initSettingsPanel()

    // Authenticate if credentials saved
    if (appSettings.get('auth.email') && appSettings.get('auth.password')) {
        LiveMe.setAuthDetails(appSettings.get('auth.email').trim(), appSettings.get('auth.password').trim())
    }

    initHome()
})

function setupContextMenu () {
    const InputMenu = remote.Menu.buildFromTemplate([{
        label: 'Undo',
        role: 'undo'
    }, {
        label: 'Redo',
        role: 'redo'
    }, {
        type: 'separator'
    }, {
        label: 'Cut',
        role: 'cut'
    }, {
        label: 'Copy',
        role: 'copy'
    }, {
        label: 'Paste',
        role: 'paste'
    }, {
        type: 'separator'
    }, {
        label: 'Select all',
        role: 'selectall'
    }
    ])

    document.body.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()

        let node = e.target

        while (node) {
            if (node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable) {
                InputMenu.popup(remote.getCurrentWindow())
                break
            }
            node = node.parentNode
        }
    })
}

function setupLoadOnScroll () {
    $('main').scroll(function () {
        if (($(this).scrollTop() + $(this).height()) > ($('table').height() - 80)) {
            if (hasMore === false) return
            if (scrollBusy === true) return
            scrollBusy = true

            currentPage++
            if (currentSearch === 'performUsernameSearch') {
                performUsernameSearch()
            } else if (currentSearch === 'performHashtagSearch') {
                performHashtagSearch()
            } else {
                scrollBusy = false
            }
        }
    })
}

function setupIPCListeners () {
    ipcRenderer.on('show-user', (event, arg) => {
        $('#search-query').val(arg.userid)
        $('#search-type').val('user-id')
        doSearch()
    })

    ipcRenderer.on('popup-message', (event, arg) => {
        let p = $('#popup-message')
        p.html(arg.text).animate({ top: 40 }, 400).delay(3000).animate({ top: 0 - p.height() }, 400)
    })

    ipcRenderer.on('go-home', (event, arg) => {
        goHome()
    })

    ipcRenderer.on('shutdown', (event, arg) => {
        $('overlay').show()
        $('#status').html('Storing data and shutting down...')
    })

    ipcRenderer.on('download-start', (event, arg) => {
        if ($('#download-' + arg.videoid).length < 1) return

        $('#download-' + arg.videoid).addClass('active')
        $('#download-' + arg.videoid + ' .status').html('Starting download..')
        $('#download-' + arg.videoid + ' .filename').html(arg.filename)
        $('#download-' + arg.videoid + ' .cancel').remove()
    })

    ipcRenderer.on('download-progress', (event, arg) => {
        if ($('#download-' + arg.videoid).length < 1) return

        $('#download-' + arg.videoid + ' .status').html(arg.state)
        $('#download-' + arg.videoid + ' .progress-bar .bar').css('width', arg.percent + '%')
    })

    ipcRenderer.on('download-complete', (event, arg) => {
        if ($('#download-' + arg.videoid).length < 1) return
        $('#download-' + arg.videoid).remove()
    })

    ipcRenderer.on('download-error', (event, arg) => {
        if ($('#download-' + arg.videoid).length < 1) return
        $('#download-' + arg.videoid + ' .status').html('Download Error<span></span>')
        $('#download-' + arg.videoid).append(`<div onClick="cancelDownload('${arg.videoid}')" class="cancel">&#x2715;</div>`)
    })
}

function showMainMenu () {
    const MainAppMenu = remote.Menu.buildFromTemplate(
        [
            /*
            {
                label: 'Import',
                submenu: [
                    {
                        label: 'ReplayID List to Download',
                        click: () => importReplayIDList()
                    },
                    {
                        label: 'UserID List to Favorites',
                        click: () => importUserIDList()
                    }
                ]
            },
            {
                label: 'Export',
                submenu: [
                    {
                        label: 'Favorites List',
                        click: () => ExportFavorites()
                    }
                ]
            }, */
            {
                label: 'Backup/Restore',
                submenu: [
                    {
                        label: 'Backup Data',
                        click: () => backupData()
                    },
                    {
                        label: 'Restore Data',
                        click: () => restoreData()
                    }
                ]
            },
            {
                type: 'separator'
            },
            {
                label: 'Open Bookmarks',
                click: () => openBookmarks()
            },
            {
                type: 'separator'
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'Github Home',
                        click: () => shell.openExternal('https://github.com/lewdninja/liveme-pro-tools/')
                    },
                    {
                        label: 'Report an Issue',
                        click: () => shell.openExternal('https://github.com/lewdninja/liveme-pro-tools/issues')
                    }
                ]
            },
            {
                type: 'separator'
            },
            {
                label: 'Settings',
                click: () => showSettings()
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit',
                click: () => remote.app.quit()
            }
        ]
    )

    MainAppMenu.popup(
        remote.getCurrentWindow(),
        {
            x: 0,
            y: 40
        }
    )
}

function onTypeChange () {
    let t = $('#search-type').val()
    switch (t) {
    case 'user-id':
        $('#search-query').attr('placeholder', 'User ID')
        break
    case 'short-id':
        $('#search-query').attr('placeholder', 'Short ID')
        break
    case 'video-id':
        $('#search-query').attr('placeholder', 'Video ID')
        break
    case 'video-url':
        $('#search-query').attr('placeholder', 'Video URL')
        break
    case 'username-like':
        $('#search-query').attr('placeholder', 'Partial or Full Username')
        break
    }
}

function closeOverlay () {
    if ($('#queue-list').is(':visible')) {
        $('#queue-list').hide()
        $('overlay').hide()
    }
}
function enterOnSearch (e) { if (e.keyCode === 13) preSearch() }
function copyToClipboard (i) { clipboard.writeText(i) }
function showSettings () { $('#settings').show() }
function hideSettings () { $('#settings').hide() }
function closeWindow () { window.close() }
function minimizeWindow () { remote.BrowserWindow.getFocusedWindow().minimize() }
function showProgressBar () { $('#footer-progressbar').show() }
function hideProgressBar () { $('#footer-progressbar').hide() }
function setProgressBarValue (v) { $('#footer-progressbar div').css({ width: v + '%' }) }

function showUser (u) {
    $('#search-type').val('user-id')
    $('#search-query').val(u)
    $('overlay').show()

    setTimeout(function () { preSearch() }, 500)
}

function openBookmarks () { ipcRenderer.send('open-bookmarks') }
function showFollowing (u) { ipcRenderer.send('open-followings-window', { userid: currentUser.uid !== undefined ? currentUser.uid : u }) }
function showFollowers (u) { ipcRenderer.send('open-followers-window', { userid: currentUser.uid !== undefined ? currentUser.uid : u }) }
function playVideo (vid) { ipcRenderer.send('watch-replay', { videoid: vid }) }
function sortReplays (name) {
    $('table#list tbody tr').sort(function (a, b) {
        var aValue = $(a).find('td[data-name="' + name + '"]').text()
        var bValue = $(b).find('td[data-name="' + name + '"]').text()
        if (name === 'date') {
            aValue = new Date(aValue).getTime()
            bValue = new Date(bValue).getTime()
        }
        return ((+aValue < +bValue) ? 1 : ((+aValue > +bValue) ? -1 : 0))
    }).appendTo('table#list tbody')
    if (hasMore) {
        setTimeout(() => sortReplays(name), 500)
    }
}
function downloadVideo (vid) {
    $('#download-replay-' + vid).html('<i class="icon icon-download dim"></i>')
    $('#download-replay-' + vid).unbind()

    if (appSettings.get('lamd.handle_downloads') === true) {
        AddReplayToLAMD(vid)
    } else {
        ipcRenderer.send('download-replay', { videoid: vid })

        if ($('#download-' + vid).length > 0) return
        $('#queue-list').append(`
            <div class="download" id="download-${vid}">
                <div class="filename">${vid}</div>
                <div class="status">Queued</div>
                <div class="progress-bar">
                    <div class="bar" style="width: 0%"></div>
                </div>
                <div onClick="cancelDownload('${vid}')" class="cancel">&#x2715;</div>
            </div>
        `)
    }
}
function cancelDownload (i) {
    ipcRenderer.send('download-cancel', { videoid: i })
    $('#download-' + i).remove()
}
function showDownloads () {
    if ($('#queue-list').is(':visible')) {
        $('overlay').hide()
        $('#queue-list').hide()
    } else {
        $('overlay').show()
        $('#queue-list').show()
    }
}
function openPatreon () {
    shell.openExternal('https://patreon.com/lewdninja')
}
function importReplayIDList () { ipcRenderer.send('import-queue') }
function importUserIDList () { ipcRenderer.send('import-users') }
function ExportFavorites () { ipcRenderer.send('export-users') }

function openURL (u) { shell.openExternal(u) }
function readComments (u) { ipcRenderer.send('read-comments', { userid: u }) }

function goHome () {
    $('footer').hide()
    $('main').hide()
    $('#home').show()

    $('overlay').hide()
    $('#queue-list').hide()

    currentView = 'home'
    initHome()
}

function preSearch (q) {
    let u = $('#search-query').val()
    let isnum = /^\d+$/.test(u)

    $('overlay').hide()
    $('#queue-list').hide()

    currentView = 'search'

    if ((u.length === 20) && (isnum)) {
        if ($('#search-type').val() !== 'video-id') {
            $('#search-type').val('video-id')
            onTypeChange()
        }
    } else if ((u.length === 18) && (isnum)) {
        if ($('#search-type').val() !== 'user-id') {
            $('#search-type').val('user-id')
            onTypeChange()
        }
    } else if (((u.length === 8) || (u.length === 9)) && (isnum)) {
        if ($('#search-type').val() !== 'short-id') {
            $('#search-type').val('short-id')
            onTypeChange()
        }
    } else if (u.indexOf('http') > -1) {
        if ($('#search-type').val() !== 'video-url') {
            $('#search-type').val('video-url')
            onTypeChange()
        }
    } else if (!isnum) {
        if ($('#search-type').val() !== 'username-like') {
            $('#search-type').val('username-like')
            onTypeChange()
        }
    }
    doSearch()
}

function AddToBookmarks () {
    if (DataManager.isBookmarked(currentUser) === true) {
        DataManager.removeBookmark(currentUser)
        $('a.bookmark').attr('title', 'Add to Bookmarks').html('<i class="icon icon-star-empty"></i>')
    } else {
        DataManager.addBookmark(currentUser)
        $('a.bookmark').attr('title', 'Remove from Bookmarks').html('<i class="icon icon-star-full bright yellow"></i>')
    }
}

function backupData () {
    ipcRenderer.send('create-backup')

    let p = $('#popup-message')
    let m = 'Backup file stored in your downloads.'
    p.html(m).animate({ top: 40 }, 400).delay(3000).animate({ top: 0 - p.height() - 20 }, 400)
}

function restoreData () {
    ipcRenderer.send('restore-backup')
}

function initHome () {
    $('#home div.panel').html('<div class="loading">Loading feed...</div>')

    // Check for updates
    request({
        url: 'https://raw.githubusercontent.com/lewdninja/liveme-pro-tools/master/package.json',
        method: 'get'
    }, (err, httpResponse, body) => {
        if (!err) {
            let ghversion = JSON.parse(body).version
            let lversion = remote.app.getVersion()
            let g = ghversion.split('.')
            let ghv = g[0] + '' + g[1]
            let l = lversion.split('.')
            let lv = l[0] + '' + l[1]
            let upgrade = (g[0] - l[0]) + (g[1] - l[1])

            if (upgrade > 0) {
                if ($('#home div.panel .section').length < 1) {
                    $('#home div.panel').empty()
                }

                $('#home div.panel').append(`
                    <div class="section">
                        <h3><i class="icon icon-github"></i> Update Available</h3>
                        <p>
                            An updated release of LiveMe Pro Tools is available.
                        </p>
                        <button onClick="openURL('https://github.com/lewdninja/liveme-pro-tools/releases/')">Download</button>
                    </div>
                `)
            }
        }
    })

    setTimeout(() => {
        request({
            url: 'https://raw.githubusercontent.com/lewdninja/liveme-pro-tools/master/feed.json',
            method: 'get'
        }, function (err, httpResponse, body) {
            if (!err) {
                let feed = JSON.parse(body)

                if ($('#home div.panel .section').length < 1) {
                    $('#home div.panel').empty()
                }

                for (let i = 0; i < feed.length; i++) {
                    $('#home div.panel').append(`
                        <div class="section">
                            <h4 class="titleColor">${feed[i].title}</h4>
                            ${feed[i].body}
                        </div>
                    `)
                }
            }
        })
    }, 500)

    $('footer h1').html('Bookmarks are now being scanned for new replays...')
    $('#home').show()

    var bookmarks = DataManager.getAllBookmarks()
    tempvar = {
        index: 0,
        max: bookmarks.length,
        list: bookmarks
    }

    $('#home #bookmarklist').empty()

    setTimeout(() => {
        _homethread()
    }, 50)
}

function _homethread () {
    setImmediate(() => {
        if (tempvar.index < tempvar.max) {
            setTimeout(() => _homethread(), 50)
        }

        if (tempvar.index < tempvar.max - 1) { tempvar.index++; _checkBookmark(tempvar.list[tempvar.index].uid) }
        if (tempvar.index < tempvar.max - 1) { tempvar.index++; _checkBookmark(tempvar.list[tempvar.index].uid) }
    })
}

function _checkBookmark (uid) {
    if (uid === undefined) return
    if (!LiveMe.user) {
        return setTimeout(() => _checkBookmark(), 5000)
    }

    LiveMe.getUserInfo(uid).then(user => {
        if (user === undefined) return

        let b = DataManager.getSingleBookmark(user.user_info.uid)
        let dt = new Date()
        b.counts.replays = user.count_info.video_count
        b.counts.friends = user.count_info.friends_count
        b.counts.followers = user.count_info.follower_count
        b.counts.followings = user.count_info.following_count
        b.signature = user.user_info.usign
        b.sex = user.user_info.sex
        b.face = user.user_info.face
        b.nickname = user.user_info.uname
        b.shortid = user.user_info.short_id

        DataManager.updateBookmark(b)

        if (b.counts.replays > 0) {
            LiveMe.getUserReplays(uid, 1, 2)
                .then(replays => {
                    if (replays === undefined) return
                    if (replays.length < 1) return

                    let count = 0
                    let userid = replays[0].userid
                    let bookmark = DataManager.getSingleBookmark(userid)

                    for (let i = 0; i < replays.length; i++) {
                        if (replays[i].vtime - bookmark.newest_replay > 0) {
                            let latest = prettydate.format(new Date(replays[0].vtime * 1000))
                            let last = prettydate.format(new Date(bookmark.last_viewed * 1000))

                            bookmark.newest_replay = Math.floor(replays[0].vtime)
                            DataManager.updateBookmark(bookmark)

                            if (currentView === 'home') {
                                $('#home #bookmarklist').append(`
                                    <div class="bookmark" id="bookmark-${bookmark.uid}" onClick="showUser('${bookmark.uid}')">
                                        <img src="${bookmark.face}" class="avatar" onError="$(this).hide()">
                                        <h1>${bookmark.nickname}</h1>
                                        <h3>Newest replay posted ${latest}</h3>
                                        <h2>NEW</h2>
                                    </div>
                                `)
                            }
                            break
                        }
                    }
                })
                .catch(error => {
                    console.log(error)
                })
        }
    })
}

function saveAccountFace () {
    let u = appSettings.get('downloads.path')

    request.get(currentUser.face)
        .on('error', () => { })
        .pipe(fs.createWriteStream(`${u}/${currentUser.uid}.jpg`))

    $('#popup-message').html('Image saved to downloads.').animate({ top: 40 }, 400).delay(2000).animate({ top: 0 - $('#popup-message').height() }, 400)
}

function doSearch () {
    let query = ''
    let userid = ''
    let q = $('#search-query').val()

    if (q.length < 1) return

    $('#user-details').hide()
    $('main').hide().removeClass('has-panel')
    $('#status').show().html('Performing LiveMe Search...')

    $('#home').hide()

    currentPage = 1
    $('#list tbody').html('')

    switch ($('#search-type').val()) {
    case 'video-url':
        let t = q.split('/')
        if (q.indexOf('/live/') > -1) {
            query = q[3]
            performVideoLookup(query)
        } else if (q[q.length - 1].indexof('yolo') > -1) {
            let a = q[q.length - 1].split('-')
            $('#search-query').val(a[1])
            $('#search-type').val('video-id')
            query = a[1]
            performVideoLookup(query)
        } else if (q.indexOf('videoid') > -1) {
            let a = t[t.length - 1].split('?')
            let b = a[1].split('&')
            for (let i = 0; i < b.length; i++) {
                if (b[i].indexOf('videoid') > -1) {
                    let c = b[i].split('=')
                    query = c[1]
                    $('#search-query').val(c[1])
                    $('#search-type').val('video-id')
                }
            }
            performVideoLookup(query)
        } else if (q.indexOf('userid') > -1) {
            let a = t[t.length - 1].split('?')
            let b = a[1].split('&')
            for (let i = 0; i < b.length; i++) {
                if (b[i].indexOf('userid') > -1) {
                    let c = b[i].split('=')
                    query = c[1]
                    $('#search-query').val(c[1])
                    $('#search-type').val('user-id')
                }
            }
            performUserLookup(query)
        }
        break

    case 'video-id':
        performVideoLookup($('#search-query').val())
        break

    case 'user-id':
        performUserLookup($('#search-query').val())
        break

    case 'short-id':
        performShortIDSearch()
        break

    case 'username-like':
        $('main').show().removeClass('has-details')
        $('.details').hide()
        $('#list thead').html('')
        performUsernameSearch()
        break
    }
}

function performShortIDSearch () {
    LiveMe.performSearch($('#search-query').val(), 1, 1, 1).then(results => {
        if (results.length > 0) {
            performUserLookup(results[0].user_id)
        }
    })
}

function performVideoLookup (q) {
    LiveMe.getVideoInfo(q)
        .then(video => {
            if (video.videosource.length < 1) {
                $('#status').html('Video not found or was deleted from the servers.')
                $('overlay').hide()
                $('main').hide()
            } else {
                _addReplayEntry(video, true)
                performUserLookup(video.userid)
            }
        }).catch(() => {
            $('#status').html('Video not found or was deleted from the servers.')
            $('overlay').hide()
            $('main').hide()
        })
}

function performUserLookup (uid) {
    LiveMe.getUserInfo(uid)
        .then(user => {
            let bookmark = DataManager.getSingleBookmark(user.user_info.uid)

            if (bookmark !== false) {
                bookmark.last_viewed = Math.floor(new Date().getTime() / 1000)
                DataManager.updateBookmark(bookmark)
            }
            DataManager.addViewed(user.user_info.uid)

            $('#list thead').html(`
                <tr>
                    <th width="410">Title</th>
                    <th width="120">
                        <a href="#" class="link text-center" onClick="sortReplays('date')" title="Sort by Date (desc)">Date</a>
                    </th>
                    <th width="50" align="right">Length</th>
                    <th width="70" align="right">
                        <a href="#" class="link text-right" onClick="sortReplays('views')" title="Sort by Views (desc)">Views</a>
                    </th>
                    <th width="70" align="right">
                        <a href="#" class="link text-right" onClick="sortReplays('likes')" title="Sort by Likes (desc)">Likes</a>
                    </th>
                    <th width="70" align="right">
                        <a href="#" class="link text-right" onClick="sortReplays('shares')" title="Sort by Shares (desc)">Shares</a>
                    </th>
                    <th width="210">Actions</th>
                </tr>
            `)

            setTimeout(() => CheckForLAMD(), 50)

            let sex = user.user_info.sex < 0 ? '' : (user.user_info.sex === 0 ? 'female' : 'male')
            $('#user-details').show()

            $('img.avatar').attr('src', user.user_info.face)
            $('#user-details div.info h1 span').html(user.user_info.uname)
            $('#user-details div.info h2.id').html('<span>ID:</span> ' + user.user_info.uid + ' <a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard(\'' + user.user_info.uid + '\')"><i class="icon icon-copy"></i></a>')
            $('#user-details div.info h2.shortid').html('<span>Short ID:</span> ' + user.user_info.short_id + ' <a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard(\'' + user.user_info.uid + '\')"><i class="icon icon-copy"></i></a>')
            $('#user-details div.info h2.level').html('<span>Level:</span><b>' + user.user_info.level + '</b>')
            $('#user-details div.info h4').html(user.user_info.countryCode)

            if (DataManager.isBookmarked(user.user_info) === true) {
                $('#user-details a.bookmark').attr('title', 'Remove from Bookmarks').html('<i class="icon icon-star-full bright yellow"></i>')
            } else {
                $('#user-details a.bookmark').attr('title', 'Add to Bookmarks').html('<i class="icon icon-star-empty"></i>')
            }

            $('#user-details div.info a.following').html('Following ' + user.count_info.following_count)
            $('#user-details div.info a.followers').html(user.count_info.follower_count + ' Followers')

            setTimeout(() => {
                $('#status').hide()
                $('overlay').hide()
                $('main').show()
            }, 250)
            currentPage = 1

            currentUser = {
                uid: user.user_info.uid,
                shortid: user.user_info.short_id,
                signature: user.user_info.usign,
                sex: sex,
                face: user.user_info.face,
                nickname: user.user_info.uname,
                counts: {
                    replays: user.count_info.video_count,
                    friends: user.count_info.friends_count,
                    followers: user.count_info.follower_count,
                    followings: user.count_info.following_count
                },
                last_viewed: Math.floor((new Date()).getTime() / 1000),
                newest_replay: 0
            }

            getUsersReplays()
            showProgressBar()
        })
        .catch(() => {
            $('#status').html('Account no longer available.')
        })
}

function getUsersReplays () {
    if (!LiveMe.user) {
        $('#replay-result-alert').html('<span>Error!</span> You are not authenticated, please enter your login details under Settings.').fadeIn(200)
        return setTimeout(() => getUsersReplays(), 5000)
    } else {
        $('#replay-result-alert').hide()
    }
    LiveMe.getUserReplays(currentUser.uid, currentPage, MAX_PER_PAGE)
        .then(replays => {
            console.log(JSON.stringify(replays, null, 2))

            if ((typeof replays === 'undefined') || (replays == null)) {
                if (currentPage === 1) {
                    $('#replay-result-alert').html('<span>No replays!</span> There is no publicly listed replays available.').fadeIn(200)
                    $('footer h1').html('No publicly listed replays available.')
                    hideProgressBar()
                }
                return
            }
            if (replays.length > 0) {
                if (replays[0].uid === currentUser.userid) {
                    for (let i = 0; i < replays.length; i++) {
                        _addReplayEntry(replays[i], false)
                    }
                }
            }

            $('#list tbody tr').not('.user-' + currentUser.uid).remove()

            $('footer h1').html($('#list tbody tr').length + ' visible of ' + currentUser.counts.replays + ' total replays loaded.')
            setProgressBarValue(($('#list tbody tr').length / currentUser.counts.replays) * 100)
            hasMore = replays.length === MAX_PER_PAGE

            currentSearch = 'getUsersReplays'

            if (hasMore === true) {
                setTimeout(() => {
                    currentPage++
                    getUsersReplays()
                }, 500)
            } else {
                let c = $('#list tbody tr td.highlight').length
                let d = $('#list tbody tr').length
                if (c.length === 0) {
                    $('#list table tbody tr.unlisted').removeClass('unlisted')
                } else {
                    $('#list table tbody tr.unlisted').remove()
                    $('footer h1').html($('#list tbody tr').length + ' visible of ' + currentUser.counts.replays + ' total replays loaded.')
                }
                if (d === 0) $('footer h1').html('No publicly listed replays available.')

                hideProgressBar()
            }
        })
        .catch(error => {
            console.log(error)
        })
}

function _addReplayEntry (replay, wasSearched) {
    if (replay.userid !== currentUser.uid) return

    if (replay.vtime > currentUser.newest_replay) currentUser.newest_replay = replay.vtime

    let dt = new Date(replay.vtime * 1000)
    let ds = (dt.getMonth() + 1) + '-' + dt.getDate() + '-' + dt.getFullYear() + ' ' + (dt.getHours() < 10 ? '0' : '') + dt.getHours() + ':' + (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes()
    let highlight = $('#search-type').val() === 'video-id' ? ($('#search-query').val() === replay.vid ? 'highlight' : '') : ''

    let length = formatDuration(parseInt(replay.videolength) * 1000)
    let searched = wasSearched ? 'unlisted' : ''
    let unlisted = searched ? '[UNLISTED]' : ''

    let downloadDate = DataManager.wasDownloaded(replay.vid)
    let watchDate = DataManager.wasWatched(replay.vid)
    let downloaded = downloadDate === false ? '<i class="icon icon-floppy-disk dim"></i>' : '<i class="icon icon-floppy-disk bright blue" title="Downloaded ' + prettydate.format(downloadDate) + '"></i>'
    let watched = watchDate === false ? '<i class="icon icon-eye dim"></i>' : '<i class="icon icon-eye bright green" title="Last watched ' + prettydate.format(watchDate) + '"></i>'
    let seen = watchDate === false ? '' : 'watched'

    let isLive = replay.hlsvideosource.endsWith('flv') || replay.hlsvideosource.indexOf('liveplay') > 0 ? '<b style="color:limegreen;">[LIVE]</b>' : ''
    let inQueue = $('#download-' + replay.vid).length > 0 ? '<a id="download-replay-' + replay.vid + '" class="button icon-only" title="Download Replay"><i class="icon icon-download dim"></i></a>' : '<a id="download-replay-' + replay.vid + '" class="button icon-only" onClick="downloadVideo(\'' + replay.vid + '\')" title="Download Replay"><i class="icon icon-download"></i></a>'

    const template = Handlebars.compile($('#replays-list-row').html())
    const html = template(
        Object.assign(replay, {
            searched,
            seen,
            highlight,
            watched,
            downloaded,
            unlisted,
            isLive,
            length,
            ds,
            inQueue,
            source: replay.videosource || replay.hlsvideosource
        })
    )
    /*
    let h = `
        <tr data-id="${replay.vid}" class="${searched} ${seen} user-${replay.userid}">
            <td width="410" class="${highlight}">${watched}&nbsp;&nbsp;${downloaded}&nbsp;&nbsp;&nbsp;${unlisted}${isLive}${replay.title}</td>
            <td width="120" class="${highlight}" align="center">${ds}</td>
            <td width="50" class="${highlight}" align="right">${length}</td>
            <td width="70" class="${highlight}" align="right">${replay.playnumber}</td>
            <td width="70" class="${highlight}" align="right">${replay.likenum}</td>
            <td width="70" class="${highlight}" align="right">${replay.sharenum}</td>
            <td width="300" class="${highlight}" style="padding: 0 16px; text-align: right;">
                <a class="button mini icon-small" onClick="copyToClipboard('${replay.vid}')" style="font-size: 10pt;" title="Copy ID to Clipboard">ID</a>
                &nbsp;
                <a class="button mini icon-small" onClick="copyToClipboard('https://www.liveme.com/live.html?videoid=${replay.vid}')" href="#" style="font-size: 10pt;" title="Copy URL to Clipboard">URL</a>
                &nbsp;
                <a class="button mini icon-small" onClick="copyToClipboard('${replay.videosource || replay.hlsvideosource}')" style="font-size: 10pt;" title="Copy Source to Clipboard (m3u8 or flv)">Source</a>
                &nbsp;&nbsp;&nbsp;
                <a class="button icon-only" onClick="playVideo('${replay.vid}')" title="Watch Replay"><i class="icon icon-play"></i></a>&nbsp;&nbsp;
                <a class="button icon-only" onClick="readComments('${replay.vid}')" title="Read Comments"><i class="icon icon-bubbles3"></i></a>&nbsp;&nbsp;
                ${inQueue}
            </td>
        </tr>
    `
    */
    const item = $(html).hide().fadeIn(200)
    $('#list tbody').append(item)
}

function performUsernameSearch () {
    LiveMe.performSearch($('#search-query').val(), currentPage, MAX_PER_PAGE, 1)
        .then(results => {
            currentSearch = 'performUsernameSearch'
            hasMore = results.length >= MAX_PER_PAGE
            setTimeout(function () { scrollBusy = false }, 250)

            for (var i = 0; i < results.length; i++) {
                let bookmarked = DataManager.isBookmarked(results[i].user_id) ? '<i class="icon icon-star-full bright yellow"></i>' : '<i class="icon icon-star-full dim"></i>'
                let viewed = DataManager.wasProfileViewed(results[i].user_id)
                    ? '<i class="icon icon-eye bright blue" title="Last viewed ' + prettydate.format(DataManager.wasProfileViewed(results[i].user_id)) + '"></i>'
                    : '<i class="icon icon-eye dim"></i>'
                let sex = results[i].sex < 0 ? '' : (results[i].sex === 0 ? 'female' : 'male')

                $('#list tbody').append(`
                    <tr id="user-${results[i].user_id}" class="user-search ${sex}">
                        <td width="128" style="text-align: center;">
                            <img src="${results[i].face}" style="height: 128px; width: 128px;" onError="$(this).hide()">
                        </td>
                        <td width="896" class="details">
                            <h4>${results[i].nickname}</h4>

                            <h5 class="userid"></h5>
                            <h5 class="shortid"></h5>

                            <h5 class="level"></h5>
                            <h5 class="country"></h5>

                            <div class="bookmarked">${bookmarked}</div>
                            <div class="viewed">${viewed}</div>

                            <a class="button replays" onClick="showUser('${results[i].user_id}')">0 Replays</a>
                            <a class="button followings" onClick="showFollowing('${results[i].user_id}')">Following 0</a>
                            <a class="button followers" onClick="showFollowers('${results[i].user_id}')">0 Fans</a>

                        </td>
                    </tr>
                `)

                LiveMe.getUserInfo(results[i].user_id)
                    .then(user => {
                        if (user === undefined) return
                        if (user === null) return

                        $('#user-' + user.user_info.uid + ' td.details a.replays').html(`${user.count_info.video_count} Replays`)
                        $('#user-' + user.user_info.uid + ' td.details a.followings').html(`Following ${user.count_info.following_count}`)
                        $('#user-' + user.user_info.uid + ' td.details a.followers').html(`${user.count_info.follower_count} Fans`)

                        $('#user-' + user.user_info.uid + ' td.details h5.userid').html(`ID: <span>${user.user_info.uid}<a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard('${user.user_info.uid}')"><i class="icon icon-copy"></i></a></span>`)
                        $('#user-' + user.user_info.uid + ' td.details h5.shortid').html(`Short ID: <span>${user.user_info.short_id}<a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard('${user.user_info.short_id}')"><i class="icon icon-copy"></i></a></span>`)

                        $('#user-' + user.user_info.uid + ' td.details h5.level').html(`Level: <span>${user.user_info.level}</span>`)
                        $('#user-' + user.user_info.uid + ' td.details h5.country').html(`${user.user_info.countryCode}`)
                    })

                $('footer h1').html($('#list tbody tr').length + ' accounts found so far, scroll down to load more.')
            }

            if (results.length === 0 && currentPage === 1) {
                $('#status').html('No users were found searching for ' + $('#search-query').val()).show()
            } else {
                $('#status').hide()
            }
        })
}

function initSettingsPanel () {
    $('#authEmail').val(appSettings.get('auth.email'))
    $('#authPassword').val(appSettings.get('auth.password'))

    $('#viewmode-followers').prop('checked', appSettings.get('general.hide_zeroreplay_fans'))
    $('#viewmode-followings').prop('checked', appSettings.get('general.hide_zeroreplay_followings'))

    $('#playerpath').val(appSettings.get('general.playerpath'))

    $('#cleanup-duration').val(appSettings.get('history.viewed_maxage'))

    $('#downloads-path').val(appSettings.get('downloads.path'))
    $('#downloads-template').val(appSettings.get('downloads.template'))
    // DL Method val
    const dlMethod = appSettings.get('downloads.method') || 'ffmpeg'
    $(`input[name="downloadMethod"][value="${dlMethod}"]`).prop('checked', true)
    // DL delete tmp val
    if (appSettings.get('downloads.deltmp') === undefined) {
        appSettings.set('downloads.deltmp', true)
    }
    $('#chunk-method-tmp').prop('checked', appSettings.get('downloads.deltmp'))
    // Parallel downloads
    $('#downloads-parallel').val(appSettings.get('downloads.parallel') || 3)
    // FFMPEG path val
    const ffmpegPath = appSettings.get('downloads.ffmpeg') || false
    if (ffmpegPath) {
        $('#ffmpegPath').val(ffmpegPath)
    }

    $('#lamd-enabled').prop('checked', appSettings.get('lamd.enabled'))
    $('#lamd-downloads').prop('checked', appSettings.get('lamd.handle_downloads'))
    $('#lamd-url').val(appSettings.get('lamd.url'))

    let v = remote.app.getVersion().split('.')[2]
    let stats = DataManager.getStats()
    $('#settings h6#version').html('Version ' + v)

    $('#counts-bookmarks').html(stats.bookmarks)
    $('#counts-profiles').html(stats.profiles)
    $('#counts-downloaded').html(stats.downloaded)
    $('#counts-watched').html(stats.watched)
}

function saveSettings () {
    const authEmail = $('#authEmail').val().trim()
    const authPass = $('#authPassword').val().trim()
    const savedEmail = appSettings.get('auth.email')
    const savedPass = appSettings.get('auth.password')
    // Check if inputs contain value and that the values are changed (avoid unecessary auths)
    if (authEmail && authPass && (authEmail !== savedEmail && authPass !== savedPass)) {
        appSettings.set('auth.email', authEmail)
        appSettings.set('auth.password', authPass)
        LiveMe.setAuthDetails(authEmail, authPass)
            .then(() => {
                $('#authStatus').show().find('h5').css('color', 'limegreen').html('Authentication OK!')
            })
            .catch(() => {
                $('#authStatus').show().find('h5').css('color', 'red').html('Failed to authenticate with Live.me servers. (Invalid credentials?)')
            })
    }

    appSettings.set('general.hide_zeroreplay_fans', (!!$('#viewmode-followers').is(':checked')))
    appSettings.set('general.hide_zeroreplay_followings', (!!$('#viewmode-followings').is(':checked')))
    appSettings.set('general.playerpath', $('#playerpath').val())

    appSettings.set('history.viewed_maxage', $('#cleanup-duration').val())

    appSettings.set('downloads.path', $('#downloads-path').val())
    appSettings.set('downloads.template', $('#downloads-template').val())
    appSettings.set('downloads.method', $('input[name="downloadMethod"]:checked').val() || 'ffmpeg')
    appSettings.set('downloads.deltmp', (!!$('#chunk-method-tmp').is(':checked')))
    appSettings.set('downloads.ffmepg', $('#ffmpegPath').val().trim() || false)
    appSettings.set('downloads.parallel', $('#downloads-parallel').val() || 3)

    ipcRenderer.send('downloads-parallel', appSettings.get('downloads.parallel'))

    appSettings.set('lamd.enabled', (!!$('#lamd-enabled').is(':checked')))
    appSettings.set('lamd.handle_downloads', (!!$('#lamd-downloads').is(':checked')))

    if ($('#lamd-url').val().length < 21) $('#lamd-url').val('http://localhost:8280')
    appSettings.set('lamd.url', $('#lamd-url').val())
}

function resetSettings () {
    appSettings.set('general', {
        fresh_install: true,
        playerpath: '',
        hide_zeroreplay_fans: false,
        hide_zeroreplay_followings: true
    })
    appSettings.set('downloads', {
        path: path.join(app.getPath('home'), 'Downloads'),
        template: '%%replayid%%'
    })
    appSettings.set('history', {
        viewed_maxage: 1
    })
    appSettings.set('position', {
        mainWindow: [-1, -1],
        playerWindow: [-1, -1],
        bookmarksWindow: [-1, -1]
    })
    appSettings.set('size', {
        mainWindow: [1024, 600],
        playerWindow: [370, 680],
        bookmarksWindow: [400, 720]
    })
    appSettings.set('lamd', {
        enabled: false,
        url: 'http://localhost:8280',
        handle_downloads: false
    })

    DataManager.wipeAllData()
    remote.app.relaunch()
}

function CheckForLAMD () {
    let lamdConfig = appSettings.get('lamd')

    if (lamdConfig.enabled === false) {
        $('.lamd-button').hide()
        return
    }
    $('.lamd-button').html('<i class="icon icon-hour-glass"></i>')

    request({
        url: lamdConfig.url + '/ping',
        method: 'get'
    }, function (err, httpResponse, body) {
        if (err) return

        setTimeout(() => {
            request({
                url: lamdConfig.url + '/check-account/' + currentUser.uid,
                method: 'get',
                timeout: 2000

            }, (err, resp, body) => {
                if (err) {
                    $('.lamd-button').hide()
                    return
                }
                if (JSON.parse(body).message === 'Account is in the list.') {
                    $('.lamd-button').html('<i class="icon icon-user-minus"></i> LAMD').attr('mode', 'remove').show()
                } else {
                    $('.lamd-button').html('<i class="icon icon-user-plus"></i> LAMD').attr('mode', 'add').show()
                }
            })
        }, 100)
    })
}

function AddToLAMD (u) {
    let lamdConfig = appSettings.get('lamd')
    let v = $('.lamd-button').attr('mode')

    if (lamdConfig.enabled === false) return // If we are not allowed to use it, then don't continue on inside this script.

    request({
        url: lamdConfig.url + (v === 'add' ? '/add-account/' : '/remove-account/') + currentUser.uid,
        method: 'get',
        timeout: 2000
    }, function (err, httpResponse, body) {
        if (err) return

        var r = JSON.parse(body)
        if (r.message === 'Account removed.') {
            $('.lamd-button').html('<i class="icon icon-user-plus"></i> LAMD').attr('mode', 'add').show()
            $('#popup-message').html('Account removed from LAMD').animate({ top: 40 }, 400).delay(3000).animate({ top: 0 - $('#popup-message').height() }, 400)
        } else {
            $('.lamd-button').html('<i class="icon icon-user-minus"></i> LAMD').attr('mode', 'remove').show()
            $('#popup-message').html('Account added to LAMD').animate({ top: 40 }, 400).delay(3000).animate({ top: 0 - $('#popup-message').height() }, 400)
        }
    })
}

function AddReplayToLAMD (r) {
    let lamdConfig = appSettings.get('lamd')
    let v = $('.lamd-button').attr('mode')

    if (lamdConfig.enabled === false) return // If we are not allowed to use it, then don't continue on inside this script.

    request({
        url: lamdConfig.url + '/add-download/' + r,
        method: 'get',
        timeout: 2000
    }, function (err, httpResponse, body) {
        if (err) return

        $('#popup-message').html('Download added to LAMD').animate({ top: 40 }, 400).delay(3000).animate({ top: 0 - $('#popup-message').height() }, 400)
    })
}
