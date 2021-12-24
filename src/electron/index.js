/**
 * LiveMe Pro Tools
 */

const appName = 'LiveMe Pro Tools'


const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const { exec } = require('child_process')
const os = require('os')
const fs = require('fs')
const path = require('path')
const request = require('request')
const tarfs = require('tar-fs')

const DataManager = new(require('./datamanager').DataManager)()
const LivemeAPI = require('./livemeapi')
const LiveMe = new LivemeAPI({})

const isDev = require('electron-is-dev')
const async = require('async')
const concat = require('concat-files')

// This is required to re-enable autoplay. See:
// https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// New window layout
let splashWindow = null
let homeWindow = null
let accountView = []
let followWindow = null
let bookmarkWindow = null
let settingsWindow = null

let menu = null
let appSettings = require('electron-settings')

function createWindow() {
    splashWindow = new BrowserWindow({
        icon: path.join(__dirname, '/build/48x48.png'),
        width: 400,
        height: 220,
        autoHideMenuBar: true,
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        resizable: false,
        fullscreen: false,
        maximizable: false,
        frame: false,
        show: false,
        backgroundColor: '#ffffff',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: true,
            textAreasAreResizable: false,
            plugins: true
        }
    })


    homeWindow = new BrowserWindow({
        icon: path.join(__dirname, '/build/48x48.png'),
        width: 1480,
        height: 760,
        autoHideMenuBar: true,
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        resizable: false,
        fullscreen: false,
        maximizable: false,
        frame: true,
        show: false,
        backgroundColor: '#ffffff',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: true,
            textAreasAreResizable: false,
            plugins: true
        }
    })


    splashWindow.loadURL(`file://${__dirname}/app/splash.html`)
    splashWindow.on('ready-to-show', () => {
            splashWindow.show()
        })
        .on('close', (event) => {
            splashWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            splashWindow = null
        })


    homeWindow.loadURL(`file://${__dirname}/app/start.html`)
    homeWindow.on('ready-to-show', () => {
            setTimeout(function(){
                homeWindow.show()
                if (splashWindow) splashWindow.close()
            }, 1500)
        })
        .on('close', (event) => {
            homeWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            homeWindow = null
            app.quit()
        })

    menu = Menu.buildFromTemplate(getMenuTemplate())
    Menu.setApplicationMenu(menu)

    global.isDev = isDev
    global.LiveMe = LiveMe
    global.DataManager = DataManager

}

app.on('ready', () => {

    createWindow()
})

app.on('window-all-closed', () => {
    app.quit()
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})




ipcMain.on('show-profile', (event, arg) => {

    accountView[arg.uid] = new BrowserWindow({
        width: 1600,
        minWidth: 1200,
        maxWidth: 2000,
        height: 900,
        minHeight: 900,
        maxHeight: 2000,
        resizable: true,
        autoHideMenuBar: true,
        skipTaskbar: false,
        backgroundColor: '#ffffff',
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        fullscreen: false,
        maximizable: false,
        closable: true,
        frame: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            plugins: true,
            nodeIntegration: true,
            webSecurity: false
        }
    })

    accountView[arg.uid].setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

    accountView[arg.uid].on('ready-to-show', () => {

        if (appSettings.get('auth.email') && appSettings.get('auth.password')) {
            LiveMe.setAuthDetails(appSettings.get('auth.email').trim(), appSettings.get('auth.password').trim())
        }

        LiveMe.getUserInfo(uid)
            .then(user => {
                let bookmark = DataManager.getSingleBookmark(user.user_info.uid)

                if (bookmark !== false) {
                    bookmark.last_viewed = Math.floor(new Date().getTime() / 1000)
                    DataManager.updateBookmark(bookmark)
                }
                DataManager.addViewed(user.user_info.uid)
            })

        accountView[arg.uid].send('render-profile', {
            user: user,
            isbookmarked: bookmark !== false,
            isfollowed: DataManager.isFollowed(user.user_info) !== false
        })

        accountView[arg.uid].show()
    }).loadURL(`file://${__dirname}/app/accountview.html`)


})

ipcMain.on('search-username', (event, arg) => {

    if (appSettings.get('auth.email') && appSettings.get('auth.password')) {
        LiveMe.setAuthDetails(appSettings.get('auth.email').trim(), appSettings.get('auth.password').trim())
    }

    let list = new Array()
    let i = 0

    LiveMe.performSearch(arg.q, arg.p, 10, 1)
        .then(results => {

            for (i = 0; i < results.length; i++) {

                entry = {
                    user_id: results[i].user_id,
                    face: results[i].face ? results[i].face : 'images/nouser.png',
                    nickname: results[i].nickname,
                    countryCode: results[i].countryCode,
                    level: results[i].level,
                    sex: results[i].sex == 0 ? 'male' : (results[i].sex > 0 ? 'female' : ''),
                    bookmarked: DataManager.isBookmarked(results[i].user_id),
                    viewed: DataManager.wasProfileViewed(results[i].user_id)
                }
                list.push(entry)
            }
            homeWindow.webContents.send('render-user-list', {
                page: arg.p,
                query: arg.q,
                hasmore: results.length >= 10,
                list: list
            })
        })
})











/**
 * IPC Event Handlers
 *
ipcMain.on('open-home-window', (event, arg) => {

    var homeWindow = new BrowserWindow({
        icon: path.join(__dirname, 'appicon.png'),
        width: 400,
        minWidth: 400,
        maxWidth: 400,
        height: 720,
        minHeight: 480,
        resizable: true,
        darkTheme: false,
        autoHideMenuBar: true,
        skipTaskbar: false,
        backgroundColor: '#000000',
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        fullscreen: false,
        maximizable: false,
        closable: true,
        frame: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })
    require("@electron/remote/main").enable(homeWindow.webContents)
    homeWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

    homeWindow.on('ready-to-show', () => {
        homeWindow.show()
    }).loadURL(`file://${__dirname}/app/home.html`)
})


ipcMain.on('download-replay', (event, arg) => {
        DataManager.addToQueueList(arg.videoid)
        mainWindow.webContents.send('download-add', { vid: arg.videoid} )
        dlQueue.push(arg, err => {
            if (err) {
                mainWindow.webContents.send('download-error', err)
            } else {
                mainWindow.webContents.send('download-complete', { videoid: arg.videoid })
            }
        })
    })

ipcMain.on('download-cancel', (event, arg) => {
        dlQueue.remove(function(task) {
            if (task.data === arg.videoid) {
                DataManager.removeFromQueueList(task.data)
                return true
            }
            return false
        })
    })

const dlQueue = async.queue((task, done) => {
    // Set custom FFMPEG path if defined
    if (appSettings.get('downloads.ffmpeg')) ffmpeg.setFfmpegPath(appSettings.get('downloads.ffmpeg'))

        // Get video info
    LiveMe.getVideoInfo(task.videoid).then(video => {
        const path = appSettings.get('downloads.path')
        const dt = new Date(video.vtime * 1000)
        const mm = dt.getMonth() + 1
        const dd = dt.getDate()
        let ffmpegOpts = []

        let filename = appSettings.get('downloads.template')
            .replace(/%%broadcaster%%/g, video.uname)
            .replace(/%%longid%%/g, video.userid)
            .replace(/%%replayid%%/g, video.vid)
            .replace(/%%replayviews%%/g, video.playnumber)
            .replace(/%%replaylikes%%/g, video.likenum)
            .replace(/%%replayshares%%/g, video.sharenum)
            .replace(/%%replaytitle%%/g, video.title ? video.title : 'untitled')
            .replace(/%%replayduration%%/g, video.videolength)
            .replace(/%%replaydatepacked%%/g, (dt.getFullYear() + (mm < 10 ? '0' : '') + mm + (dd < 10 ? '0' : '') + dd))
            .replace(/%%replaydateus%%/g, ((mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd + '-' + dt.getFullYear()))
            .replace(/%%replaydateeu%%/g, ((dd < 10 ? '0' : '') + dd + '-' + (mm < 10 ? '0' : '') + mm + '-' + dt.getFullYear()))

        filename = filename.replace(/[/\\?%*:|"<>]/g, '-')
        filename = filename.replace(/([^a-z0-9\s]+)/gi, '-')
        filename = filename.replace(/[\u{0080}-\u{FFFF}]/gu, '')

        video._filename = filename

        mainWindow.webContents.send('download-start', {
            videoid: task.videoid,
            filename: filename
        })

        // If no M3U8 URLs are returned from getVideoInfo then we use the original source path that was discovered during fetching of the replays.
        let properSource = video.hlsvideosource ? video.hlsvideosource : (video.videosource ? video.videosource : task.source)
        //let properSource = LiveMe.pickProperVideoSource(video)

        if (properSource === '') {
            let err = "No replay URL could be discovered."

            fs.writeFileSync(`${path}/${filename}-error.log`, err)
            return done({
                videoid: task.videoid,
                error: err
            })
        }

        switch (parseInt(appSettings.get('downloads.ffmpegquality'))) {
            case 20: // Linux H264 VAAPI Accelerated
                ffmpegOpts = [
                    '-hwaccel vaapi',
                    '-hwaccel_output_format vaapi',
                    '-vaapi_device /dev/dri/renderD128',
                    '-c:v h264_vaapi',
                    '-vf "format=nv12,hwupload"',
                    '-qp 25',
                    '-vsync 2',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            case 19: // Linux HEVC VAAPI Accelerated
                ffmpegOpts = [
                    '-hwaccel vaapi',
                    '-hwaccel_output_format vaapi',
                    '-vaapi_device /dev/dri/renderD128',
                    '-c:v hevc_vaapi',
                    '-vf "format=nv12,hwupload"',
                    '-qp 30',
                    '-vsync 2',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            case 10: // macOS Video Toolbox
                ffmpegOpts = [
                    '-c:v h264_videotoolbox',
                    '-qp 22',
                    '-r 15',
                    '-bf 4',
                    '-vsync 2',
                    '-preset slow',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            case 2: // Best
                ffmpegOpts = [
                    '-c:v h264',
                    '-crf 21',
                    '-r 15',
                    '-bf 2',
                    '-vsync 2',
                    '-preset slow',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            case 1: // Fast
                ffmpegOpts = [
                    '-c:v h264',
                    '-crf 21',
                    '-r 15',
                    '-bf 2',
                    '-vsync 2',
                    '-preset superfast',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            default: // None
                ffmpegOpts = [
                    '-c copy'
                ]
                break
        }


        if (appSettings.get('downloads.saveMessageHistory') == true) {
            LiveMe.getVideoInfo(video.vid).then(vid => {
                LiveMe.getChatHistoryForVideo(vid.msgfile)
                .then(raw => {
                    let t = raw.split('\n')
                    var dump = ''

                    for (let i = 0; i < t.length - 1; i++) {
                        try {
                            let j = JSON.parse(t[i])
                            let timeStamp = formatDuration(parseInt(j.timestamp) - (vid.vtime * 1000))

                            if (j.objectName === 'RC:TxtMsg') {
                                dump += `[${timeStamp}] ${j.content.user.name}: ${j.content.content}`
                                dump += '\n';
                            }
                        } catch (err) {
                            // Caught
                            console.log(err)
                        }
                    }

                    fs.writeFileSync(`${path}/${filename}.txt`, dump)

                })
            })
        }

        request(properSource, (err, res, body) => {
            if (err || !body) {
                fs.writeFileSync(`${path}/${filename}-error.log`, JSON.stringify(err, null, 2))
                return done({ videoid: task.videoid, error: err || 'Failed to fetch m3u8 file.' })
            }
            // Separate ts names from m3u8
            let concatList = ''
            const tsList = []
            body.split('\n').forEach(line => {
                    if (line.indexOf('.ts') !== -1) {
                        let tsName = video.vid + '_' + line.split('?')[0].replace(/\//g, '_')
                        let tsPath = `${path}/lmpt_temp/${tsName}`

                        if (process.platform == 'win32') {
                            tsPath = tsPath.replace(/\\/g, '/');
                        }

                        // Check if TS has already been added to array
                        if (concatList.indexOf(tsPath) === -1) {
                            // We'll use this later to merge downloaded chunks
                            concatList += 'file ' + tsName + '\n'

                            // Push data to list
                            tsList.push({ name: tsName, path: tsPath, url: line.split('?')[0] })
                        }
                    }
                })
            if (!fs.existsSync(`${path}/lmpt_temp`)) {
                // create temporary dir for ts files
                fs.mkdirSync(`${path}/lmpt_temp`)
            }
            fs.writeFileSync(`${path}/lmpt_temp/${video.vid}.txt`, concatList)

            // Download chunks
            let downloadedChunks = 0

            async.eachLimit(tsList, 2, (file, next) => {

                const stream = request(`${properSource.split('/').slice(0, -1).join('/')}/${file.url}`)
                    .on('error', err => {
                        fs.writeFileSync(`${path}/${file.name}-error.log`, JSON.stringify(err, null, 2))
                        return done({ videoid: task.videoid, error: err })
                    })
                    .pipe(
                        fs.createWriteStream(file.path)
                    )
                    // Events
                stream.on('finish', () => {
                    downloadedChunks += 1
                    if (mainWindow.webContents === null) return;
                    mainWindow.webContents.send('download-progress', {
                        videoid: task.videoid,
                        state: `Downloading stream chunks.. (${downloadedChunks}/${tsList.length})`,
                        percent: Math.round((downloadedChunks / tsList.length) * 100)
                    })
                    next()
                })

            }, () => {
                // Chunks downloaded
                let cfile = path + '/lmpt_temp/' + video.vid + '.txt'

                // Just combined the chunks into a single TS file
                let concatFile = fs.readFileSync(cfile, 'utf-8')
                let cList = []

                concatFile.split('\n').forEach(line => {
                    let l = line.split(' ')

                    if (l.length > 1)
                        cList.push(`${path}/lmpt_temp/${l[1]}`)
                })

                mainWindow.webContents.send('download-progress', {
                    videoid: task.videoid,
                    state: `Combining chunks, please wait...`,
                    percent: 0
                })

                concat(cList, `${path}/${filename}.ts`, (err) => {
                    if (err) {
                        mainWindow.webContents.send('download-progress', {
                            videoid: task.videoid,
                            state: `Error combining chunks`,
                            percent: 100
                        })
                        fs.writeFileSync(`${path}/${filename}-error.log`, err)
                        return done({ videoid: task.videoid, error: err })
                    }
                })

                return done()

            })

        })
    })
})


/**
 * Watch a Replay - Use either internal player or external depending on settings
 *
ipcMain.on('watch-replay', (event, arg) => {
    DataManager.addWatched(arg.videoid)


    switch(appSettings.get('player.pick') || 0) {
        case '99':    // External Player
            let playerPath = appSettings.get('player.path') || ' '
            exec(playerPath.replace('%url%', arg.source))
            break

        default:    // Default to internal player
            // Open internal player
            if (playerWindow == null) {
                let winposition = appSettings.get('position.playerWindow') ? appSettings.get('position.playerWindow') : [-1, -1]
                let winsize = appSettings.get('size.playerWindow') ? appSettings.get('size.playerWindow') : [360, 640]

                playerWindow = new BrowserWindow({
                    icon: path.join(__dirname, 'appicon.png'),
                    width: winsize[0],
                    height: winsize[1],
                    x: winposition[0] !== -1 ? winposition[0] : null,
                    y: winposition[1] !== -1 ? winposition[1] : null,
                    minWidth: 360,
                    minHeight: 360,
                    darkTheme: true,
                    autoHideMenuBar: false,
                    disableAutoHideCursor: true,
                    titleBarStyle: 'default',
                    maximizable: false,
                    frame: false,
                    backgroundColor: '#000000',
                    webPreferences: {
                        webSecurity: false,
                        textAreasAreResizable: false,
                        plugins: true
                    }
                })
                require("@electron/remote/main").enable(playerWindow.webContents)
                playerWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))
                playerWindow.on('close', () => {
                    appSettings.set('position.playerWindow', playerWindow.getPosition())
                    appSettings.set('size.playerWindow', playerWindow.getSize())

                    playerWindow.webContents.session.clearCache(() => { })
                    playerWindow = null
                })
                playerWindow.loadURL(`file://${__dirname}/app/player.html`)
                playerWindow.webContents.once('dom-ready', () => {
                    playerWindow.webContents.send('play-video', arg, appSettings.get('player'))
                })
            } else {
                playerWindow.webContents.session.clearCache(() => { })
                // Need to allow time for the cache to get cleared before starting the next video
                setTimeout(() => {
                    playerWindow.webContents.send('play-video', arg, appSettings.get('player'))
                }, 200)
            }
            playerWindow.focus()
            break
    }

})

ipcMain.on('save-player-options', (event, options) => {
    appSettings.set('player', options)
})

ipcMain.on('show-user', (event, arg) => {
    mainWindow.webContents.send('show-user', { userid: arg.userid })
})
*/

/*
ipcMain.on('open-followings-window', (event, arg) => {
    let winposition = appSettings.get('position.followingsWindow') ? appSettings.get('position.followingsWindow') : [-1, -1]

    let win = new BrowserWindow({
        icon: path.join(__dirname, 'appicon.png'),
        x: winposition[0] !== -1 ? winposition[0] : null,
        y: winposition[1] !== -1 ? winposition[1] : null,
        width: 420,
        minWidth: 420,
        maxWidth: 420,
        height: 720,
        minHeight: 600,
        resizable: true,
        darkTheme: false,
        autoHideMenuBar: true,
        skipTaskbar: false,
        backgroundColor: '#000000',
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        fullscreen: false,
        maximizable: false,
        closable: true,
        frame: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    })
    require("@electron/remote/main").enable(win.webContents)
    win.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

    win.on('ready-to-show', () => {
        win.show()
    }).on('close', () => {
        appSettings.set('position.followingsWindow', win.getPosition())
    }).loadURL(`file://${__dirname}/app/listwindow.html?1&` + arg.userid)
})

ipcMain.on('open-followers-window', (event, arg) => {
    let winposition = appSettings.get('position.fansWindow') ? appSettings.get('position.fansWindow') : [-1, -1]

    var win = new BrowserWindow({
        icon: path.join(__dirname, 'appicon.png'),
        x: winposition[0] !== -1 ? winposition[0] : null,
        y: winposition[1] !== -1 ? winposition[1] : null,
        width: 420,
        minWidth: 420,
        maxWidth: 420,
        height: 720,
        minHeight: 600,
        resizable: true,
        darkTheme: false,
        autoHideMenuBar: true,
        skipTaskbar: false,
        backgroundColor: '#000000',
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        fullscreen: false,
        maximizable: false,
        closable: true,
        frame: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    })
    require("@electron/remote/main").enable(win.webContents)
    win.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

    win.on('ready-to-show', () => {
        win.show()
    }).on('close', () => {
        appSettings.set('position.fansWindow', win.getPosition())
    }).loadURL(`file://${__dirname}/app/listwindow.html?0&` + arg.userid)
})

ipcMain.on('read-comments', (event, arg) => {
    let win = new BrowserWindow({
        icon: path.join(__dirname, 'appicon.png'),
        width: 400,
        minWidth: 400,
        maxWidth: 400,
        height: 480,
        minHeight: 480,
        resizable: true,
        darkTheme: false,
        autoHideMenuBar: true,
        skipTaskbar: false,
        backgroundColor: '#000000',
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        fullscreen: false,
        maximizable: false,
        closable: true,
        frame: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })
    require("@electron/remote/main").enable(win.webContents)
    win.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

    win.on('ready-to-show', () => {
        if (process.platform === 'linux') {
            // window.showInactive() doesn't work properly on Linux:
            // https://github.com/electron/electron/issues/7259
            win.show()
        } else {
            win.showInactive()
        }
    }).loadURL(`file://${__dirname}/app/comments.html?` + arg.userid)
})

ipcMain.on('open-bookmarks', (event, arg) => {
    if (bookmarksWindow == null) {
        let winposition = appSettings.get('position.bookmarksWindow') ? appSettings.get('position.bookmarksWindow') : [-1, -1]
        let winsize = appSettings.get('size.bookmarksWindow') ? appSettings.get('size.bookmarksWindow') : [440, 480]

        bookmarksWindow = new BrowserWindow({
            icon: path.join(__dirname, 'appicon.png'),
            x: winposition[0] !== -1 ? winposition[0] : null,
            y: winposition[1] !== -1 ? winposition[1] : null,
            width: 440,
            height: winsize[1],
            minWidth: 440,
            maxWidth: 480,
            minHeight: 480,
            darkTheme: true,
            autoHideMenuBar: false,
            disableAutoHideCursor: true,
            titleBarStyle: 'default',
            fullscreen: false,
            maximizable: false,
            frame: false,
            show: false,
            backgroundColor: '#000000',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            }
        })
        require("@electron/remote/main").enable(bookmarksWindow.webContents)
        bookmarksWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

        bookmarksWindow.on('close', () => {
            appSettings.set('position.bookmarksWindow', bookmarksWindow.getPosition())
            appSettings.set('size.bookmarksWindow', bookmarksWindow.getSize())

            bookmarksWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            bookmarksWindow = null
        })
    } else {
        bookmarksWindow.restore()
    }
    bookmarksWindow.on('ready-to-show', () => {
        bookmarksWindow.show()
    }).loadURL(`file://${__dirname}/app/bookmarks.html`)
})


ipcMain.on('open-follows', (event, arg) => {
    if (followsWindow == null) {
        let winposition = appSettings.get('position.followsWindow') ? appSettings.get('position.followsWindow') : [-1, -1]
        let winsize = appSettings.get('size.followsWindow') ? appSettings.get('size.followsWindow') : [440, 480]

        followsWindow = new BrowserWindow({
            icon: path.join(__dirname, 'appicon.png'),
            x: winposition[0] !== -1 ? winposition[0] : null,
            y: winposition[1] !== -1 ? winposition[1] : null,
            width: 440,
            height: winsize[1],
            minWidth: 440,
            maxWidth: 480,
            minHeight: 480,
            darkTheme: true,
            autoHideMenuBar: false,
            disableAutoHideCursor: true,
            titleBarStyle: 'default',
            fullscreen: false,
            maximizable: false,
            frame: false,
            show: false,
            backgroundColor: '#000000',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            }
        })
        require("@electron/remote/main").enable(followsWindow.webContents)
        followsWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

        followsWindow.on('close', () => {
            appSettings.set('position.followsWindow', followsWindow.getPosition())
            appSettings.set('size.followsWindow', followsWindow.getSize())

            followsWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            followsWindow = null
        })
    } else {
        followsWindow.restore()
    }
    followsWindow.on('ready-to-show', () => {
        followsWindow.show()
    }).loadURL(`file://${__dirname}/app/follows.html`)
})


ipcMain.on('open-housekeeping', (event, arg) => {
    if (housekeepingWindow == null) {
        housekeepingWindow = new BrowserWindow({
            icon: path.join(__dirname, 'appicon.png'),
            width: 520,
            height: 480,
            minWidth: 520,
            maxWidth: 520,
            minHeight: 600,
            maxHeight: 1600,
            darkTheme: true,
            autoHideMenuBar: false,
            disableAutoHideCursor: true,
            titleBarStyle: 'default',
            fullscreen: false,
            maximizable: false,
            frame: false,
            show: false,
            backgroundColor: '#000000',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
        }
        })

        require("@electron/remote/main").enable(housekeepingWindow.webContents)
        housekeepingWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

        housekeepingWindow.on('close', () => {
            housekeepingWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            housekeepingWindow = null
        })
    } else {
        housekeepingWindow.restore()
    }
    housekeepingWindow.on('ready-to-show', () => {
        housekeepingWindow.show()
    }).loadURL(`file://${__dirname}/app/housekeeping.html`)
})
*/

/*
ipcMain.on('restore-backup', (event, arg) => {
    dialog.showOpenDialog({
            properties: [
                'openFile'
            ],
            buttonLabel: 'Restore',
            filters: [{
                name: 'TAR files',
                extensions: ['tar']
            }]
        },
        (filePath) => {
            if (filePath != null) {
                mainWindow.webContents.send('shutdown')

                DataManager.disableWrites()
                let configPath = path.join(app.getPath('appData'), app.getName(), '/')
                fs.createReadStream(filePath[0]).pipe(tarfs.extract(configPath))
                setTimeout(() => {
                    app.relaunch()
                    app.quit()
                }, 1000)
            }
        }
    )
})

ipcMain.on('create-backup', (event, arg) => {
    let configPath = path.join(app.getPath('appData'), app.getName()),
        dt = new Date()
    let fname = 'liveme_pro_tools_backup-' + dt.getFullYear() + (dt.getMonth() < 9 ? '0' : '') + (dt.getMonth() + 1) + (dt.getDate() < 10 ? '0' : '') + dt.getDate()
    let backupFile = path.join(app.getPath('home'), 'Downloads', fname + '.tar')
    tarfs.pack(
        configPath, {
            entries: ['bookmarks.json', 'downloaded.json', 'profiles.json', 'watched.json', 'ignored.json', 'Settings']
        }
    ).pipe(fs.createWriteStream(backupFile))
})
*/

function getMenuTemplate() {
    let template = [{
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { role: 'selectall' }
            ]
        },
        {
            role: 'window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' },
                { type: 'separator' },
                {
                    label: 'Developer Tools',
                    submenu: [
                        { role: 'reload' },
                        { role: 'forcereload' },
                        { role: 'toggledevtools' }
                    ]
                }
            ]
        },
        {
            role: 'help',
            submenu: [{
                label: 'LiveMe Pro Tools Page',
                click: () => shell.openExternal('https://github.com/thecoder75/liveme-pro-tools/')
            }]
        }
    ]

    if (process.platform === 'darwin') {
        template.unshift({
            label: appName,
            submenu: [{
                    label: 'About ' + appName,
                    click: () => {}
                },
                { type: 'separator' },
                { role: 'services', submenu: [] },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                {
                    label: 'Quit ' + appName,
                    accelerator: 'CommandOrControl+Q',
                    click: () => { mainWindow.close() }
                }
            ]
        })
    }
    return template
}

function getMiniMenuTemplate() {
    let template = [{
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { role: 'selectall' }
            ]
        },
        {
            role: 'window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' },
                { type: 'separator' },
                {
                    label: 'Developer Tools',
                    submenu: [
                        { role: 'reload' },
                        { role: 'forcereload' },
                        { role: 'toggledevtools' }
                    ]
                }
            ]
        }
    ]
    return template
}


function formatDuration(i) {
    var sec = Math.floor((i / 1000) % 60),
        min = Math.floor((i / 1000) / 60) % 60,
        hour = Math.floor((i / 1000) / 3600)

    return  ((hour < 10 ? '0' : '') + hour + ':' +
            (min < 10 ? '0' : '') + min + ':' +
            (sec < 10 ? '0' : '') + sec)
}
