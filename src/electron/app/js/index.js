/* global $ */
const MAX_PER_PAGE = 20

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
const countryCodes = require("./js/countryCodes.js")
const cclist = countryCodes.cclist

let currentUser = {}
let currentPage = 1
let hasMore = false
let currentSearch = ''
let scrollBusy = false
let currentView = 'home'
let bookmarksFromJson = undefined
let cachedBookmarkFeeds = undefined

const NEW_FANS = "New Fans"
const NEW_FOLLOWINGS = "New Following"
const NEW_REPLAYS = "New Replay"

$(function() {
    document.title = 'LiveMe Pro Tools v' + remote.app.getVersion() // Set Title of Window

    setupContextMenu() // Set up the Context Menu for some UI elements
    onTypeChange() // Init Search Field
    setupIPCListeners() // Set up our IPC listeners
    setupLoadOnScroll() // Setup loading more on scroll only when searching for usernames

    initSettingsPanel()

    // Authenticate if credentials saved
    if (appSettings.get('auth.email') && appSettings.get('auth.password')) {
        LiveMe.setAuthDetails(appSettings.get('auth.email').trim(), appSettings.get('auth.password').trim())
    }

    $('footer h1').html('').show()
    $('#bookmarklist').hide()
    setTimeout(() => {
        if (appSettings.get('general.enableHomeScan') == true) {
            $('footer h1').html('Loading Home').show()
            initHome()
        }
    }, 2500)

    // Store Bookmarks, History and more every 5 minutes (300,000ms) in case of a crash or something
    setInterval(() => {
        DataManager.saveToDisk()
    }, 300000)
})

async function loginManually() {
    try {
        if (appSettings.get('auth.email') && appSettings.get('auth.password')) {
            await LiveMe.setAuthDetails(
                appSettings.get('auth.email').trim(),
                appSettings.get('auth.password').trim())
            alert("success")
        }
    } catch (error) {
        alert(error)
    }

}

function variance(arr) {
    var len = arr.length;
    var sum = 0;

    for (var i = 0; i < arr.length; i++) {
        sum = sum + parseFloat(arr[i]);
    }
    var v = 0;
    if (len > 1) {
        var mean = sum / len;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == "") {} else {
                v = v + (arr[i] - mean) * (arr[i] - mean);
            }
        }
        return v / len;
    } else {
        return 0;
    }
}

function setupContextMenu() {
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
    }])

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

    const CopyableContextMenu = remote.Menu.buildFromTemplate([{
        label: 'Copy',
        role: 'copy'
    }, {
        label: 'Select all',
        role: 'selectall'
    }])

    document.getElementById("username").addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        CopyableContextMenu.popup(remote.getCurrentWindow())
    })

    const UserContextMenu = remote.Menu.buildFromTemplate([{
        label: 'Ignore user (Forever)',
        click: () => currentUser !== undefined ? DataManager.addIgnoredForever(currentUser.uid) : _
    }, {
        label: 'Ignore user (current Session)',
        click: () => currentUser !== undefined ? DataManager.addIgnoredSession(currentUser.uid) : _
    }])

    document.getElementById("userHamburgerMenu").addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        UserContextMenu.popup(remote.getCurrentWindow())
    })
}

function setupLoadOnScroll() {
    $('main').scroll(function() {
        if (($(this).scrollTop() + $(this).height()) > ($('table').height() - 80)) {
            if (hasMore === false) return
            if (scrollBusy === true) return
            scrollBusy = true

            currentPage++
            if (currentSearch === 'performUsernameSearch') {
                performUsernameSearch()
            } else if (currentSearch === 'performHashtagSearch') {
                _performHashtagSearch()
            } else {
                scrollBusy = false
            }
        }
    })
}

function setupIPCListeners() {
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

function showMainMenu() {
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
                submenu: [{
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
                submenu: [{
                        label: 'GitHub Home',
                        click: () => shell.openExternal('https://github.com/thecoder75/liveme-pro-tools/')
                    },
                    {
                        label: 'Discord Chat Rooms for Support',
                        click: () => shell.openExternal('https://discord.gg/vKwR3WB')
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
        remote.getCurrentWindow(), {
            x: 0,
            y: 30
        }
    )
}

function onTypeChange() {
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
        case 'hashtag':
            $('#search-query').attr('placeholder', 'Enter a hashtag')
            break
        case 'username-like':
            $('#search-query').attr('placeholder', 'Partial or Full Username')
            break
    }
}

function closeOverlay() {
    if ($('#queue-list').is(':visible')) {
        $('#queue-list').hide()
        $('overlay').hide()
    }
}

function enterOnSearch(e) { if (e.keyCode === 13) preSearch() }

function copyToClipboard(i) { clipboard.writeText(i) }

function showSettings() { $('#settings').show() }

function hideSettings() {
    $('#settings').hide()
    initHome()
}

function closeWindow() { window.close() }

function minimizeWindow() { remote.BrowserWindow.getFocusedWindow().minimize() }

function showProgressBar() { $('#footer-progressbar').show() }

function hideProgressBar() { $('#footer-progressbar').hide() }

function setProgressBarValue(v) { $('#footer-progressbar div').css({ width: v + '%' }) }

function showUser(u) {
    $('#search-type').val('user-id')
    $('#search-query').val(u)
    $('overlay').show()

    setTimeout(function() { preSearch() }, 500)
}

function openBookmarks() { ipcRenderer.send('open-bookmarks') }

function showFollowing(u) { ipcRenderer.send('open-followings-window', { userid: u === undefined ? currentUser.uid : u }) }

function showFollowers(u) { ipcRenderer.send('open-followers-window', { userid: u === undefined ? currentUser.uid : u }) }

function playVideo(vid) { ipcRenderer.send('watch-replay', { videoid: vid }) }

function sortReplays(name) {
    $('table#list tbody tr').sort(function(a, b) {
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

function downloadVideo(vid) {
    $('#download-replay-' + vid).html('<i class="icon icon-download bright"></i>')
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

function cancelDownload(i) {
    ipcRenderer.send('download-cancel', { videoid: i })
    $('#download-' + i).remove()
}

function showDownloads() {
    if ($('#queue-list').is(':visible')) {
        $('overlay').hide()
        $('#queue-list').hide()
    } else {
        $('overlay').show()
        $('#queue-list').show()
    }
}

function importReplayIDList() { ipcRenderer.send('import-queue') }

function importUserIDList() { ipcRenderer.send('import-users') }

function ExportFavorites() { ipcRenderer.send('export-users') }

function openURL(u) { shell.openExternal(u) }

function readComments(u) { ipcRenderer.send('read-comments', { userid: u }) }

function goHome() {
    $('main').hide()
    $('#home').show()
    $('footer h1').html('Loading Home').show()

    $('overlay').hide()
    $('#queue-list').hide()

    currentView = 'home'
    initHome()
}

function preSearch(q) {
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
    } else if (u.indexOf('#') > -1) {
        if ($('#search-type').val() !== 'hashtag') {
            $('#search-type').val('hashtag')
            $('#search-query').val($('#search-query').val().replace('#', ''))
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

function AddToBookmarks() {
    if (DataManager.isBookmarked(currentUser) === true) {
        DataManager.removeBookmark(currentUser)
        $('a.bookmark').attr('title', 'Add to Bookmarks').html('<i class="icon icon-star-empty"></i>')
    } else {
        DataManager.addBookmark(currentUser)
        $('a.bookmark').attr('title', 'Remove from Bookmarks').html('<i class="icon icon-star-full bright yellow"></i>')
    }
}

function backupData() {
    ipcRenderer.send('create-backup')

    let p = $('#popup-message')
    let m = 'Backup file stored in your downloads.'
    p.html(m).animate({ top: 40 }, 400).delay(3000).animate({ top: 0 - p.height() - 20 }, 400)
}

function restoreData() {
    ipcRenderer.send('restore-backup')
}

function checkForUpdatesOfLiveMeProTools() {
    request({
        url: 'https://api.github.com/repos/thecoder75/liveme-pro-tools/releases/latest',
        method: 'get',
        headers: {
            'User-Agent' : 'LiveMe Pro Tools Updater Check'
        }
    }, (err, httpResponse, body) => {
        if (!err) {
            let data = JSON.parse(body)
            
            const remarkable = require('remarkable')
            const md = new remarkable()

            const ub = md.render(data.body);
            const rd = (new Date(data.published_at)).toLocaleDateString()
            const rv = parseFloat(data.name)

            if (data.prerelease !== true) {

                if (rv != parseFloat(window.require('electron').remote.app.getVersion())) {
                    if ($('#lmptUpdateNews').length < 1) {
                        $('#lmptUpdateNews').empty()
                    }

                    $('#lmptUpdateNews').append(`
                    <div class="section">
                        <h3><i class="icon icon-download"></i> Update v${rv} available!</h3>
                        <h4>Release Date: ${rd} - Released By: ${data.author.login}</h4>
                        <div class="body">${ub}</div>
                        <button onClick="openURL('${data.html_url}')">Download</button>
                    </div>
                    `)

                }
            }
        }
    })
}

function initHome() {

    $('#lmptUpdateNews').html('')
    $('#home').show()

    checkForUpdatesOfLiveMeProTools()
    if ((appSettings.get('general.enableHomeScan') == true) &&
        (
            (appSettings.get('general.enableShowReplays') == true) || 
            (appSettings.get('general.enableShowFans') == true) || 
            (appSettings.get('general.enableShowFollowings') == true)
        )
    ){
        $('#bookmarklist').show();    
        loadBookmarkFeeds()
    }
}

function passwordShowToggler(e) {
    if (e.innerHTML == 'Show') {
        e.innerHTML = 'Hide'
        document.getElementById('authPassword').type = "text";
    } else {
        e.innerHTML = 'Show'
        document.getElementById('authPassword').type = "password";
    }
}

function rescanFeeds() {
    DataManager.saveToDisk()
    cachedBookmarkFeeds = undefined
    DataManager.loadFromDisk()
    loadBookmarkFeeds()
}

function loadBookmarkFeeds() {
    if (!LiveMe.token) //  delay loop until successful login
    {
        setTimeout(() => loadBookmarkFeeds(), 500)
        $('footer h1').html('Waiting for Login').show()
        return;
    }

    clearHomeUI();

    if (cachedBookmarkFeeds) {
        $('footer h1').html('Bookmark feeds are loaded from cache ...').show()
        loadFromCache(cachedBookmarkFeeds, addToHome)
        $('footer h1').html('').show()

    } else {
        $('footer h1').html('Bookmarks are now being scanned for new replays...').show()
        $('#rescan-btn').html("Scanning ...")
        document.getElementById("rescan-btn").disabled = true;

        setProgressBarValue(0)
        showProgressBar()

        scanLiveme()
    }
}

function scanLiveme() {
    bookmarksFromJson = DataManager.getAllBookmarks()
    if (bookmarksFromJson.length === 0)
        return

    cachedBookmarkFeeds = []

    setImmediate(() => {
        _scanThread(0)
    })
}

function clearHomeUI() {

    if (appSettings.get('general.enableShowReplays') === true) {
        $('#home #newReplaysHeader').show()
        $('#home #newreplays').show().empty()
    } else {
        $('#home #newReplaysHeader').hide()
        $('#home #newreplays').hide()
    }

    if (appSettings.get('general.enableShowFollowings') === true) {
        $('#home #newFollowingsHeader').show()
        $('#home #newfollowings').show().empty()
    } else {
        $('#home #newFollowingsHeader').hide()
        $('#home #newfollowings').hide()
    }

    if (appSettings.get('general.enableShowFans') === true) {
        $('#home #newFansHeader').show()
        $('#home #newfans').show().empty()
    } else {
        $('#home #newFansHeader').hide()
        $('#home #newfans').hide()
    }

}

function loadFromCache(bookmarks, dispatch) {
    setImmediate(() => {
        bookmarks.forEach(b => {
            if (b.changed_followings) {
                dispatch(NEW_FOLLOWINGS, b)
            }
            if (b.changed_followers) {
                dispatch(NEW_FANS, b)
            }
            if (b.hasNewReplays) {
                dispatch(NEW_REPLAYS, b)
            }
        })
    })
}

function _scanThread(id) {
    setImmediate(async() => {
        if (id < bookmarksFromJson.length - 1) {
            // Iterate over bookmarks but start each recursive call with a delay.
            // Each bookmark entry scan is delayed by 50 ms.
            setTimeout(() => _scanThread(id + 1), 50)
        }

        // UI
        $('footer h1').html('Checking ' + id + ' of ' + bookmarksFromJson.length + ' bookmarks.')
        setProgressBarValue((id / bookmarksFromJson.length) * 100)

        // Logic
        let currentBookmarkToScan = bookmarksFromJson[id]
        let updatedBookmark = await _checkBookmark(currentBookmarkToScan, addToHome)
        cachedBookmarkFeeds.push(updatedBookmark)

        // Update UI after last element was scanned.
        if (id === bookmarksFromJson.length - 1) {
            $('footer h1').html('Bookmarks scan complete.')
            hideProgressBar()
            $('#rescan-btn').html("Rescan")
            document.getElementById("rescan-btn").disabled = false;
        }

    })
}

function addToHome(type, bookmark) {
    if (currentView !== 'home') return

    let hideFollowers = appSettings.get("general.homeHideNewFollowers")
    let hideFans = appSettings.get("general.homeHideNewFans")

    switch (type) {
        case NEW_FOLLOWINGS:
            if (hideFollowers) return
            $('#home #newfollowings').append(`
                <div class="bookmark"
                    id="bookmark-${bookmark.uid}"
                    onClick="showFollowing('${bookmark.uid}')">
                    <img src="${bookmark.face}" class="avatar" onError="$(this).hide()">
                    <h1>${bookmark.nickname}</h1>
                    <h3>User is following more accounts now.</h3>
                    <h2>${type}</h2>
                </div>
        `)
            break;
        case NEW_FANS:
            if (hideFans) return
            $('#home #newfans').append(`
                <div class="bookmark"
                    id="bookmark-${bookmark.uid}"
                    onClick="showFollowers('${bookmark.uid}')">
                    <img src="${bookmark.face}" class="avatar" onError="$(this).hide()">
                    <h1>${bookmark.nickname}</h1>
                    <h3>User has more fans now.</h3>
                    <h2>${type}</h2>
                </div>
                `)
            break;
        case NEW_REPLAYS:
            $('#home #newreplays').append(`
                <div class="bookmark"
                    id="bookmark-${bookmark.uid}"
                    onClick="showUser('${bookmark.uid}')">
                    <img src="${bookmark.face}" class="avatar" onError="$(this).hide()">
                    <h1>${bookmark.nickname}</h1>
                    <h3>User has new replays.</h3>
                    <h2>${type}</h2>
                </div>
                `)
            break;
        default:
            break;
    }

}

async function _checkBookmark(b, dispatch) {
    let uid = b.uid
    if (uid === undefined) return
    if (!LiveMe.user) {
        return setTimeout(async() => await _checkBookmark(), 5000)
    }

    let user = await LiveMe.getUserInfo(uid)
    if (user === undefined) return

    b.changed_followings = b.counts.followings != user.count_info.following_count
    b.changed_followers = b.counts.followers != user.count_info.follower_count

    b.counts.replays = user.count_info.video_count
    b.counts.friends = user.count_info.friends_count
    b.counts.followers = user.count_info.follower_count
    b.counts.followings = user.count_info.following_count
    b.signature = user.user_info.usign
    b.sex = user.user_info.sex
    b.face = user.user_info.face
    b.nickname = user.user_info.uname
    b.shortid = user.user_info.short_id

    if (b.changed_followings && (appSettings.get('general.enableShowFollowings') === true)) {
        dispatch(NEW_FOLLOWINGS, b)
    }

    if (b.changed_followers && (appSettings.get('general.enableShowFans') === true)) {
        dispatch(NEW_FANS, b)
    }

    if (b.counts.replays > 0) {
        let replays = await LiveMe.getUserReplays(uid, 1, 2)

        if (replays === undefined) return
        if (replays.length < 1) return

        for (let i = 0; i < replays.length; i++) {
            if (replays[i].vtime - b.newest_replay > 0) {
                b.hasNewReplays = true
                b.newest_replay = Math.floor(replays[0].vtime)

                if (appSettings.get('general.enableShowReplays') === true) {
                    dispatch(NEW_REPLAYS, b)
                }
                break
            }
        }
    }


    return b;
}

function saveAccountFace() {
    let u = appSettings.get('downloads.path')

    request.get(currentUser.face)
        .on('error', () => {

        }).pipe(
            fs.createWriteStream(`${u}/${currentUser.uid}.jpg`)
        )

    $('#popup-message').html('Image saved to downloads.').animate({ top: 40 }, 400).delay(2000).animate({ top: 0 - $('#popup-message').height() }, 400)
}

function doSearch() {
    let query = ''
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

        case 'hashtag':
            $('main').show().removeClass('has-details')
            $('#user-details').hide()
            $('#list').show()
            $('#list thead').html('')
            performHashtagSearch()
            break

        case 'username-like':
            $('main').show().removeClass('has-details')
            $('#list thead').html('')
            performUsernameSearch()
            break
    }
}

function performShortIDSearch() {
    LiveMe.performSearch($('#search-query').val(), 1, 1, 1).then(results => {
        if (results.length > 0) {
            performUserLookup(results[0].user_id)
        }
    })
}

function performVideoLookup(q) {
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

function performUserLookup(uid) {
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
                    <th width="33" align="right">
                    <a href="#" class="link text-right" onClick="sortReplays('vpm')" title="Sort by Views Per Minute (desc)">VPM</a>
                    </th>
                    <th width="70" align="right">
                        <a href="#" class="link text-right" onClick="sortReplays('likes')" title="Sort by Likes (desc)">Likes</a>
                    </th>
                    <th width="33" align="right">
                    <a href="#" class="link text-right" onClick="sortReplays('lpm')" title="Sort by Likes Per Minute (desc)">LPM</a>
                 </th>
                    <th width="70" align="right">
                        <a href="#" class="link text-right" onClick="sortReplays('shares')" title="Sort by Shares (desc)">Shares</a>
                    </th>
                    <th width="33" align="right">
                        <a href="#" class="link text-right" onClick="sortReplays('spm')" title="Sort by Shares Per Minute (desc)">SPM</a>
                    </th>
                    <th width="45">DL</th>
                    <th width="60">Actions</th>
                </tr>
            `)

            let sex = user.user_info.sex < 0 ? '' : (user.user_info.sex === 0 ? 'female' : 'male')
            $('#user-details').show()

            $('img.avatar').attr('src', user.user_info.face)
            $('#user-details div.info h1 span').html(user.user_info.uname)
            $('#user-details div.info h2.id').html('<span>ID:</span> ' + user.user_info.uid + ' <a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard(\'' + user.user_info.uid + '\')"><i class="icon icon-copy"></i></a>')
            $('#user-details div.info h2.shortid').html('<span>Short ID:</span> ' + user.user_info.short_id + ' <a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard(\'' + user.user_info.short_id + '\')"><i class="icon icon-copy"></i></a>')
            $('#user-details div.info h2.level').html('<span>Lvl:</span><b>' + user.user_info.level + '</b>')
            $('#user-details div.info h4').html(`
                <abbr
                    title="${countryCodes.getFullName(user.user_info.countryCode)}">
                    ${user.user_info.countryCode}
                </abbr>
                `)

            if (DataManager.isBookmarked(user.user_info) === true) {
                $('#user-details a.bookmark').attr('title', 'Remove from Bookmarks').html('<i class="icon icon-star-full bright yellow"></i>')
            } else {
                $('#user-details a.bookmark').attr('title', 'Add to Bookmarks').html('<i class="icon icon-star-empty"></i>')
            }

            $('#user-details div.info a.following').html('Following ' + user.count_info.following_count)
            $('#user-details div.info a.followers').html(user.count_info.follower_count + ' Fans')

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
                    changed: false,
                    replays: user.count_info.video_count,
                    friends: user.count_info.friends_count,
                    followers: user.count_info.follower_count,
                    followings: user.count_info.following_count
                },
                last_viewed: Math.floor((new Date()).getTime() / 1000),
                newest_replay: 0
            }

            allReplays = []
            let accstatsUI = document.getElementById("variance")
            accstatsUI.style.opacity = 0.5
            accstatsUI.innerHTML = `
            <abbr title="Variance">
                <span>Var:</span><b> - </b>
            </abbr>`

            getUsersReplays()
            showProgressBar()
        })
        .catch(() => {
            $('#status').html('Account no longer available.')
        })
}

function getUsersReplays() {
    if (!LiveMe.user) {
        $('#replay-result-alert').html('<span>Error!</span> You are not authenticated, please enter your login details under Settings.').fadeIn(400)
        return setTimeout(() => getUsersReplays(), 5000)
    } else {
        $('#replay-result-alert').hide()
    }

    LiveMe.getUserReplays(currentUser.uid, currentPage, MAX_PER_PAGE)
        .then(replays => {

            if ((typeof replays === 'undefined') || (replays == null)) {
                if (currentPage === 1) {
                    $('#replay-result-alert').html('<span>No replays!</span> There is no publicly listed replays available.').fadeIn(400)
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
            // Unhandled error

        })
}

let allReplays = []

function openReplayContextMenu(vid) {
    let replay = allReplays.find(r => r.vid === vid)
    const replayContextMenu = remote.Menu.buildFromTemplate([{
            label: 'Copy ID to Clipboard',
            click: () => { copyToClipboard(vid) }
        }, {
            label: 'Copy Web URL to Clipboard',
            click: () => { copyToClipboard(`https://www.liveme.com/us/v/${vid}/index.html`) }
        
        }, {
            label: 'Copy Source to Clipboard (m3u8 or flv)',
            click: () => copyToClipboard(`${replay.videosource || replay.hlsvideosource}`)
        }, {
            label: 'Read Comments',
            click: () => readComments(replay.vid)
        }

    ])

    replayContextMenu.popup(remote.getCurrentWindow())
}

function _addReplayEntry(replay, wasSearched) {
    if (replay.userid !== currentUser.uid) return

    if (replay.vtime > currentUser.newest_replay) currentUser.newest_replay = replay.vtime

    let dt = new Date(replay.vtime * 1000)
    let ds = (dt.getMonth() + 1) + '-' + dt.getDate() + '-' + dt.getFullYear() + ' ' + (dt.getHours() < 10 ? '0' : '') + dt.getHours() + ':' + (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes()
    let highlight = $('#search-type').val() === 'video-id' ? ($('#search-query').val() === replay.vid ? 'highlight' : '') : ''

    let length = formatDuration(parseInt(replay.videolength) * 1000)

    // will be set to 1 minute if lower than 1, to prevent spikes and null division 
    var lengthInMinutes = Math.max(parseFloat(replay.videolength) / 60, 1)
    let spm = parseInt(replay.sharenum) / (lengthInMinutes)
    let lpm = parseInt(replay.likenum) / (lengthInMinutes)
    let vpm = parseInt(replay.playnumber) / (lengthInMinutes)
    let searched = wasSearched ? 'unlisted' : ''
    let unlisted = searched ? '[UNLISTED]' : ''

    let downloadDate = DataManager.wasDownloaded(replay.vid)
    let watchDate = DataManager.wasWatched(replay.vid)
    let downloaded = downloadDate === false ? '<i class="icon icon-download dim" title="Click to download replay."></i>' : '<i class="icon icon-download bright green" title="Replay was previously downloaded."></i>'
    let watched = watchDate === false ? '<i class="icon icon-eye dim"></i>' : '<i class="icon icon-eye bright green" title="Last watched ' + prettydate.format(watchDate) + '"></i>'
    let seen = watchDate === false ? '' : 'watched'

    let isLive = replay.hlsvideosource.endsWith('flv') || replay.hlsvideosource.indexOf('liveplay') > 0 ? '<b style="color:limegreen;">[LIVE]</b>' : ''
    let inQueue = $('#download-' + replay.vid).length > 0 ? '<a id="download-replay-' + replay.vid + '" class="button icon-only"><i class="icon icon-download dim"></i></a>' : '<a id="download-replay-' + replay.vid + '" class="button icon-only" onClick="downloadVideo(\'' + replay.vid + '\')"">' + downloaded + '</a>'
    let getURL = '<a title="Copy Replay URL to clipboard." class="button icon-only" onClick="copyToClipboard(\'https://www.liveme.com/us/v/'+replay.vid+'/index.html\')"><i class="icon icon-copy bright"></i></a>'

    const template = Handlebars.compile($('#replays-list-row').html())

    let replayData = Object.assign(replay, {
        searched,
        seen,
        highlight,
        watched,
        downloaded,
        unlisted,
        isLive,
        length,
        ds,
        lpm: lpm.toFixed(1),
        vpm: vpm.toFixed(1),
        spm: spm.toFixed(1),
        inQueue,
        getURL,
        source: replay.videosource || replay.hlsvideosource
    })

    allReplays.push(replayData)

    if (allReplays.length < 2) {
        let accstatsUI = document.getElementById("variance")
        accstatsUI.style.opacity = 0.5
        accstatsUI.innerHTML = `
        <abbr title="Variance">
            <span>Var:</span><b> - </b>
        </abbr>`
    } else {
        try {
            var spmVari = variance(allReplays.map(r => r.spm))
            var visibility = 0.1 + Math.max(0, Math.log(spmVari * 5 + 1 - 0.2))

            let accstatsUI = document.getElementById("variance")
            accstatsUI.style.opacity = visibility
            accstatsUI.innerHTML = `
            <abbr title="Variance">
                <span>Var:</span><b> ${spmVari.toFixed(2)}</b>
            </abbr>`


        } catch (error) {

        }
    }






    const html = template(replayData)


    const item = $(html).hide().fadeIn(200)
    $('#list tbody').append(item)
}

function performUsernameSearch() {
    LiveMe.performSearch($('#search-query').val(), currentPage, MAX_PER_PAGE, 1)
        .then(results => {

            currentSearch = 'performUsernameSearch'
            hasMore = results.length >= MAX_PER_PAGE
            setTimeout(function() { scrollBusy = false }, 250)

            for (var i = 0; i < results.length; i++) {
                let bookmarked = DataManager.isBookmarked(results[i].user_id) ? '<i class="icon icon-star-full bright yellow"></i>' : '<i class="icon icon-star-full dim"></i>'
                let viewed = DataManager.wasProfileViewed(results[i].user_id) ?
                    '<i class="icon icon-eye bright blue" title="Last viewed ' + prettydate.format(DataManager.wasProfileViewed(results[i].user_id)) + '"></i>' :
                    '<i class="icon icon-eye dim"></i>'
                var sex = results[i].sex < 0 ? '' : (results[i].sex == 0 ? 'female' : 'male');

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

function performHashtagSearch() {

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

    setTimeout(() => {
        _performHashtagSearch()
    }, 100);
}

function _performHashtagSearch() {
    LiveMe.performSearch($('#search-query').val(), currentPage, MAX_PER_PAGE, 2)
        .then(results => {

            currentSearch = 'performHashtagSearch'
            hasMore = results.length >= MAX_PER_PAGE
            setTimeout(function() { scrollBusy = false }, 250)

            for (var i = 0; i < results.length; i++) {

                let dt = new Date(results[i].vtime * 1000)
                let ds = (dt.getMonth() + 1) + '-' + dt.getDate() + '-' + dt.getFullYear() + ' ' + (dt.getHours() < 10 ? '0' : '') + dt.getHours() + ':' + (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes()

                let length = formatDuration(parseInt(results[i].videolength) * 1000)

                let downloadDate = DataManager.wasDownloaded(results[i].vid)
                let watchDate = DataManager.wasWatched(results[i].vid)
                let downloaded = downloadDate === false ? '<i class="icon icon-floppy-disk dim"></i>' : '<i class="icon icon-floppy-disk bright blue" title="Downloaded ' + prettydate.format(downloadDate) + '"></i>'
                let watched = watchDate === false ? '<i class="icon icon-eye dim"></i>' : '<i class="icon icon-eye bright green" title="Last watched ' + prettydate.format(watchDate) + '"></i>'
                let seen = watchDate === false ? '' : 'watched'

                let isLive = results[i].hlsvideosource.endsWith('flv') || results[i].hlsvideosource.indexOf('liveplay') > 0 ? '<b style="color:limegreen;">[LIVE]</b>' : ''
                let inQueue = $('#download-' + results[i].vid).length > 0 ? '<a id="download-replay-' + results[i].vid + '" class="button icon-only" title="Download Replay"><i class="icon icon-download dim"></i></a>' : '<a id="download-replay-' + results[i].vid + '" class="button icon-only" onClick="downloadVideo(\'' + results[i].vid + '\')" title="Download Replay"><i class="icon icon-download"></i></a>'

                $('#list tbody').append(`
					<tr data-id="${results[i].vid}"  onClick="playVideo('${results[i].vid}')" class="user-${results[i].userid}">
                        <td width="410">${results[i].title}</td>
                        <td width="120" align="center">${ds}</td>
                        <td width="50" align="right">${length}</td>
                        <td width="70" align="right">${results[i].playnumber}</td>
                        <td width="70" align="right">${results[i].likenum}</td>
                        <td width="70" align="right">${results[i].sharenum}</td>
						<td width="70" align="right">${results[i].sharenum}</td>
						<td width="100" style="padding: 0 16px; text-align: right;">
                            ${inQueue}
                        </td>
                    </tr>
                `)

                $('footer h1').html($('#list tbody tr').length + ' accounts found so far, scroll down to load more.')
            }

            if (results.length === 0 && currentPage === 1) {
                $('#status').html('No videos were found searching for #' + $('#search-query').val()).show()
            } else {
                $('#status').hide()
            }


        });
}

function initSettingsPanel() {
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
    $('#downloads-parallel').val(appSettings.get('downloads.parallel') || 3)

    const ffmpegPath = appSettings.get('downloads.ffmpeg') || false
    const ffmpegQuality = appSettings.get('downloads.ffmpegquality') || false
    $('#ffmpeg-transcode-setting').val(ffmpegQuality ? ffmpegQuality : 0)
    if (ffmpegPath) { $('#ffmpegPath').val(ffmpegPath) }

    let stats = DataManager.getStats()
    $('#settings h6#version').html('Version ' + remote.app.getVersion())

    $('#counts-bookmarks').html(stats.bookmarks)
    $('#counts-profiles').html(stats.profiles)
    $('#counts-downloaded').html(stats.downloaded)
    $('#counts-watched').html(stats.watched)

    let loadAllResults = appSettings.get('general.loadAllResults')
    $('#loadAllResults').prop('checked', loadAllResults)

    let enableHomeScan = appSettings.get('general.enableHomeScan')
    $('#enableHomeScan').prop('checked', enableHomeScan)

    let enableShowReplays = appSettings.get('general.enableShowReplays') 
    $('#enableShowReplays').prop('checked', enableShowReplays)
    let enableShowFans = appSettings.get('general.enableShowFans')
    $('#enableShowFans').prop('checked', enableShowFans)
    let enableShowFollowings = appSettings.get('general.enableShowFollowings')
    $('#enableShowFollowings').prop('checked', enableShowFollowings)

    let hideHighFanCount = appSettings.get('general.hide_high_fan_count')
    $('#hide-many-fans').prop('checked', hideHighFanCount)
    $('#hide-many-fans-count').val(appSettings.get('general.hide_high_fan_count_value') || 5000)

    let blockedCountries = appSettings.get('general.blockedCountries') || []
    $('#countryCode').empty()
    for (let i = 0; i < cclist.length; i++) {
        let isblocked = ""
        for (let j = 0; j < blockedCountries.length; j++) {
            if (cclist[i][1] == blockedCountries[j]) {
                isblocked = "selected='selected'"
                break
            }
        }
        $('#countryCode').append(`<option value="${cclist[i][1]}" ${isblocked}>${cclist[i][0]}</option>`)
    }

}

function saveLoginManually() {
    const authEmail = $('#authEmail').val().trim()
    const authPass = $('#authPassword').val().trim()
    appSettings.set('auth.email', authEmail)
    appSettings.set('auth.password', authPass)
}

function saveSettings() {
    const authEmail = $('#authEmail').val().trim()
    const authPass = $('#authPassword').val().trim()
    const savedEmail = appSettings.get('auth.email')
    const savedPass = appSettings.get('auth.password')
        // Check if inputs contain value and that the values are changed (avoid unecessary auths)
    if (authEmail && authPass && (authEmail !== savedEmail || authPass !== savedPass)) {
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
    
    appSettings.set('general.hide_high_fan_count', (!!$('#hide-many-fans').is(':checked')))
    appSettings.set('general.hide_high_fan_count_value', parseInt($('#hide-many-fans-count').val()))
            
    appSettings.set('general.playerpath', $('#playerpath').val())

    appSettings.set('history.viewed_maxage', $('#cleanup-duration').val())

    appSettings.set('downloads.path', $('#downloads-path').val())
    appSettings.set('downloads.template', $('#downloads-template').val())
    appSettings.set('downloads.method', $('input[name="downloadMethod"]:checked').val() || 'ffmpeg')
    appSettings.set('downloads.deltmp', (!!$('#chunk-method-tmp').is(':checked')))
    appSettings.set('downloads.ffmpeg', $('#ffmpegPath').val().trim() || false)
    appSettings.set('downloads.parallel', $('#downloads-parallel').val() || 3)
    appSettings.set('downloads.ffmpegquality', $('#ffmpeg-transcode-setting').val())

    appSettings.set('general.blockedCountries', $('#countryCode').val())
    appSettings.set('general.loadAllResults', (!!$('#loadAllResults').is(':checked')))

    appSettings.set('general.enableHomeScan', (!!$('#enableHomeScan').is(':checked')))
    appSettings.set('general.enableShowReplays', (!!$('#enableShowReplays').is(':checked')))
    appSettings.set('general.enableShowFans', (!!$('#enableShowFans').is(':checked')))
    appSettings.set('general.enableShowFollowings', (!!$('#enableShowFollowings').is(':checked')))

    ipcRenderer.send('downloads-parallel', appSettings.get('downloads.parallel'))
}

function resetSettings() {
    appSettings.set('general', {
        fresh_install: true,
        playerpath: '',
        hide_zeroreplay_fans: false,
        hide_zeroreplay_followings: true,
        homeHideNewFans: false,
        homeHideNewFollowers: false
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

    DataManager.wipeAllData()
    remote.app.relaunch()
}
