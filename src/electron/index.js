/*

Filename: index.js
Description: Manage all windows used by the app, IPC handlers and LiveME API calls and data exchanges

*/

const appName = 'LiveMe Pro Tools'


const { app, BrowserWindow, ipcMain, Menu, shell, dialog, screen } = require('electron')
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
//app.commandLine.appendSwitch('high-dpi-support', 0)
//app.commandLine.appendSwitch('force-device-scale-factor', 2)

// New window layout
let splashWindow = null
let accountView = []

let downloadsWindow = null
let optionsWindow = null

let watchingWindow = null
let bookmarkWindow = null

let menu = null
let appSettings = null

function createWindow() {

    // console.log(JSON.stringify(screen.getPrimaryDisplay(), false, 2))

    splashWindow = new BrowserWindow({
        icon: path.join(__dirname, '/build/48x48.png'),
        width: 400,
        height: 240,
        autoHideMenuBar: true,
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        resizable: false,
        fullscreen: false,
        maximizable: false,
        frame: false,
        show: false,
        alwaysOnTop: true,
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
        width: 1500,
        height: 780,
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

    downloadsWindow = new BrowserWindow({
        icon: path.join(__dirname, '/build/48x48.png'),
        width: 480,
        minWidth: 480,
        maxWidth: 480,
        height: 600,
        minHeight: 600,
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

    aboutWindow = new BrowserWindow({
        icon: path.join(__dirname, '/build/48x48.png'),
        width: 1000,
        height: 500,
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


    splashWindow.loadURL(`file://${__dirname}/app/splash.html?v=${app.getVersion()}`)
    splashWindow.on('ready-to-show', () => {
            splashWindow.webContents.setZoomFactor(1)
            splashWindow.show()
        })
        .on('show', (event) => {
            setTimeout(function(){
                splashWindow.hide()
            }, 2500)
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
                homeWindow.webContents.setZoomFactor(1)
                homeWindow.show()
            }, 2000)
        })
        .on('close', (event) => {

            homeWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            homeWindow = null
            app.quit()
        })

    downloadsWindow.loadURL(`file://${__dirname}/app/downloads.html`)
    downloadsWindow.on('ready-to-show', () => {
            downloadsWindow.webContents.setZoomFactor(1)
        })
        .on('close', (event) => {
            downloadsWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            downloadsWindow = null
        })


    aboutWindow.loadURL(`file://${__dirname}/app/about.html?v=${app.getVersion()}`)
    aboutWindow.on('ready-to-show', () => {
            aboutWindow.webContents.setZoomFactor(1)
        })
        .on('close', (event) => {
            aboutWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            aboutWindow = null
        })



    menu = Menu.buildFromTemplate(getMenuTemplate())
    Menu.setApplicationMenu(menu)

    if (!appSettings) { initAppSettings() }

    setTimeout(function() {
        if (appSettings) {
            LiveMe.setAuthDetails(appSettings.auth.email.trim(), appSettings.auth.password.trim())

            if (appSettings.startup.checkForUpdates) checkForUpdates()
            if (appSettings.startup.checkForNews) checkForNews()

        }

    }, 1000)


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




function initAppSettings() {

    let filename = path.join(app.getPath('appData'), app.getName(), 'settings-v2.json')

    if (fs.existsSync(filename)) {
        fs.readFileSync(filename, 'utf8', function(err, data) {
            if (err) {

            } else {
                appSettings = JSON.parse(data)
            }
        })
    } else {
        if (!appSettings) {
            appSettings = {
                startup: {
                    checkForUpdates: false,
                    checkForNews: false
                },
                apiTweaks: {
                    speed: 'slow',
                    searchlimit: 40,
                    replaylimit: 10,
                    listlimit: 20
                },
                history: {
                    profileviewed: false,
                    replayviewed: false
                },
                auth: {
                    email: null,
                    password: null
                },
                downloads: {
                    pattern: false,
                    concurrent: 1
                }
            }
        }
    }
}















ipcMain.on('show-about-window', (event, arg) => {
    if (!aboutWindow.isVisible())
        aboutWindow.show()
})




ipcMain.on('show-options-window', (event, arg) => {

    optionsWindow = new BrowserWindow({
        icon: path.join(__dirname, '/build/48x48.png'),
        width: 600,
        height: 800,
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
    optionsWindow.loadURL(`file://${__dirname}/app/options.html`)
    optionsWindow.on('ready-to-show', () => {
            optionsWindow.webContents.setZoomFactor(1)
            optionsWindow.webContents.send('settings-form-refresh', appSettings)
            optionsWindow.show()
        })
        .on('close', (event) => {

            // Write Options to File
            fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'settings-v2.json'), JSON.stringify(appSettings, false, 2), () => {

            })

            optionsWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            optionsWindow = null
        })

})
ipcMain.on('update-settings', (event, arg) => {
    appSettings = arg

    if (appSettings.auth.email != null)
        LiveMe.setAuthDetails(appSettings.auth.email.trim(), appSettings.auth.password.trim())

    if (optionsWindow)
        optionsWindow.close()

})

ipcMain.on('fetch-settings', (event, arg) => {

    optionsWindow.webContents.send('settings-form-refresh', appSettings)

})

ipcMain.on('fetch-settings-sync', (event, arg) => {

    if (!appSettings) { initAppSettings() }
    event.returnValue = appSettings
    return appSettings

})




ipcMain.on('show-user-profile', (event, arg) => {
    OpenAccountProfile(arg.userid)
})

ipcMain.on('fetch-user-profile', (event, arg) => {

    LiveMe.getUserInfo(arg.userid)
        .then(user => {
            if ((user === null) || (user === undefined)) return

            let bookmark = DataManager.getSingleBookmark(user.user_info.uid)
            user.isbookmarked = bookmark ? true : false

            if (bookmark !== false) {
                bookmark.last_viewed = Math.floor(new Date().getTime() / 1000)
                DataManager.updateBookmark(bookmark)
            }
            DataManager.addViewed(user.user_info.uid)

            currentUser = {
                user_id: user.user_info.uid,
                short_id: parseInt(user.user_info.short_id),
                signature: user.user_info.usign,
                sex: user.user_info.sex < 0 ? '' : (user.user_info.sex === 0 ? 'female' : 'male'),
                face: user.user_info.face ? user.user_info.face : 'images/nouser.png',
                nickname: user.user_info.uname,
                level: user.user_info.level,
                country: user.user_info.countryCode,
                bookmarked: user.isbookmarked,
                counts: {
                    changed: false,
                    replays: parseInt(user.count_info.video_count),
                    friends: parseInt(user.count_info.friends_count),
                    followers: parseInt(user.count_info.follower_count),
                    followings: parseInt(user.count_info.following_count)
                },
                last_viewed: parseInt(Math.floor((new Date()).getTime() / 1000)),
                newest_replay: 0,
                locked: false,
                status: user.user_info.status
            }

            user: currentUser
            accountView[currentUser.user_id].webContents.send('render-user-details', {
                user: currentUser
            })
        })
})

ipcMain.on('fetch-user-replays', (event, arg) => {

    LiveMe.getUserReplays(arg.u, arg.p, 10)
        .then(replays => {

            if ((typeof replays === 'undefined') || (replays == null)) {
                accountView[arg.u].webContents.send('render-replay-list', {
                    hasMore: false,
                    user_id: arg.u,
                    page: arg.p,
                    list: null,
                    status: 'no-replays'
                });

                return
            } else {
                accountView[arg.u].webContents.send('render-replay-list', {
                    hasMore: replays.length === 10,
                    user_id: arg.u,
                    page: arg.p,
                    list: replays,
                    status: 'add-replays'
                });
            }
        }).catch(error => {
            // Unhandled error

            console.log(JSON.stringify(error.response.body, false, 2))

        })

})




ipcMain.on('show-download-window', (event, arg) => {
    if (!downloadsWindow.isVisible())
        downloadsWindow.show()
})

ipcMain.on('download-replay', (event, arg) => {

    if (!downloadsWindow.isVisible()) downloadsWindow.show()

    let filename = arg.vid




    downloadWindow.webContents.send('add-download', {
        id: arg.video_id,
        filename: filename,
        title: arg.title
    })

    dlQueue.push(arg, err => {
        if (err) {
            downloadWindow.webContents.send('download-error', {
                id: arg.video_id,
                error: err
            })
        } else {
            downloadWindow.webContents.send('download-error', {
                id: arg.video_id
            })

        }
    })

})









ipcMain.on('search-username', (event, arg) => {

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

ipcMain.on('search-userid', (event, arg) => {

    LiveMe.getUserInfo(arg.u)
        .then(user => {
            if ((user === undefined) || (user === null)) {
                dialog.showMessageBox({
                    type: 'error',
                    title: 'Search Error',
                    message: 'The account was not found.'
                })
            } else {
                OpenAccountProfile(user.user_info.uid)
            }
        })

})

ipcMain.on('search-videoid', (event, arg) => {
    LiveMe.getVideoInfo(q)
        .then(video => {
            if ((video.videosource === '') || (video.hlsvideosource === '')) {
                let endedAt = new Date(LiveMe.getVideoEndDate(video))
                dialog.showMessageBox({
                    type: 'error',
                    title: 'Video Lookup Error',
                    message: 'The video has expired or been deleted.'
                })
            } else {
                OpenAccountProfile(video.userid)
            }
        }).catch(reason => {

        })

})









function OpenAccountProfile(user_id) {

    accountView[user_id] = new BrowserWindow({
        width: 1600,
        height: 840,
        resizable: false,
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

    accountView[user_id].setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))
    accountView[user_id].loadURL(`file://${__dirname}/app/profile.html?uid=${user_id}`)

    accountView[user_id].on('ready-to-show', () => {
            accountView[user_id].webContents.setZoomFactor(1)
            accountView[user_id].show()
        })
        .on('close', (event) => {
            accountView[user_id].webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })
            accountView[user_id] = null
        })

}














function checkForUpdates() {

}

function checkForNews() {
    
}


















/**
 * IPC Event Handlers
 *



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
