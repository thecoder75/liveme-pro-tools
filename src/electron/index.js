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
const ffmpeg = require('fluent-ffmpeg')
const async = require('async')
const concat = require('concat-files')

// This is required to re-enable autoplay. See:
// https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null
let playerWindow = null
let bookmarksWindow = null
let chatWindow = null
let wizardWindow = null
let homeWindow = null
let housekeepingWindow = null
let menu = null
let appSettings = require('electron-settings')

function createWindow() {
    /**
     * Create our window definitions
     */
    let winsize = appSettings.get('size.mainWindow')

    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, 'appicon.png'),
        width: winsize[0],
        height: winsize[1],
        minWidth: 1024,
        maxWidth: 1024,
        minHeight: 480,
        maxHeight: 1200,
        autoHideMenuBar: true,
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        fullscreen: false,
        maximizable: false,
        frame: false,
        show: false,
        backgroundColor: '#000000',
        webPreferences: {
            webSecurity: true,
            textAreasAreResizable: false,
            plugins: true
        }
    })

    /**
     * Configure our window contents and callbacks
     */
    mainWindow.loadURL(`file://${__dirname}/app/index.html`)
    mainWindow
        .on('open', () => {})
        .on('close', () => {
            appSettings.set('position.mainWindow', mainWindow.getPosition())
            appSettings.set('size.mainWindow', mainWindow.getSize())

            DataManager.saveToDisk()

            if (playerWindow != null) {
                playerWindow.close()
            }
            if (bookmarksWindow != null) {
                bookmarksWindow.close()
            }
            if (chatWindow != null) {
                chatWindow.close()
            }

            mainWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            })

            mainWindow = null

            setTimeout(() => {
                app.quit()
            }, 250)
        })
    
    /**
     * Build our application menus using the templates provided
     * further down.
     */
    menu = Menu.buildFromTemplate(getMenuTemplate())
    Menu.setApplicationMenu(menu)

    global.isDev = isDev
    global.LiveMe = LiveMe
    global.DataManager = DataManager

    DataManager.loadFromDisk()

    setTimeout(() => {
        const dt = new Date()
        let ma = appSettings.get('history.viewed_maxage')
        let od = Math.floor((dt.getTime() - (ma * 86400000)) / 1000)
        DataManager.unviewProfiles(od, false)

    }, 250)

    let pos = appSettings.get('position.mainWindow').length > 1 ? appSettings.get('position.mainWindow') : [null, null]
    if (pos[0] != null) {
        mainWindow.setPosition(pos[0], pos[1], false)
    }
    mainWindow.show()

}

app.on('ready', () => {
    let isFreshInstall = typeof appSettings.get('general.fresh_install') === 'undefined' ? true : false

    if (appSettings.get('downloads.template')) {
        appSettings.set('general.fresh_install', false);
        isFreshInstall = false;
    }

    if (isFreshInstall) {
        appSettings.set('general', {
            fresh_install: false,
            playerpath: '',
            hide_zeroreplay_fans: false,
            hide_zeroreplay_followings: true,
            enableHomeScan: false
        })
        appSettings.set('position', {
            mainWindow: [-1, -1],
            playerWindow: [-1, -1],
            bookmarksWindow: [-1, -1],
            fansWindow: [-1, -1],
            followingsWindow: [-1, -1]
        })
        appSettings.set('size', {
            mainWindow: [1024, 600],
            playerWindow: [360, 640],
            bookmarksWindow: [400, 720]
        })
        appSettings.set('downloads', {
            path: path.join(app.getPath('home'), 'Downloads'),
            template: '%%replayid%%',
            chunkthreads: 1,
            chunks: 1,
            ffmpegquality: 1
        })
        appSettings.set('player', {
            volume: 1,
            muted: false
        })
    }

    if (!appSettings.get('history.viewed_maxage')) {
        appSettings.set('history', {
            viewed_maxage: 1
        })
    }

    if (!appSettings.get('lamd.concurrent')) {
        appSettings.set('lamd', {
            cycletime: 60,
            concurrent: 3
        })
    }

    if (!appSettings.get('player')) {
        appSettings.set('player', {
            volume: 1,
            muted: false
        })
    }

    let test = appSettings.get('position')
    if (typeof test.mainWindow[1] === 'undefined') {
        appSettings.set('position', {
            mainWindow: [-1, -1],
            playerWindow: [-1, -1],
            bookmarksWindow: [-1, -1]
        })
    }
    
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

/**
 * IPC Event Handlers
 */
ipcMain.on('import-queue', (event, arg) => {})

ipcMain.on('import-users', (event, arg) => {})

ipcMain.on('export-users', (event, arg) => {})

ipcMain.on('downloads-parallel', (event, arg) => {
    dlQueue.concurrency = arg
})

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
        show: false
    })
    homeWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))

    homeWindow.on('ready-to-show', () => {
        homeWindow.show()
    }).loadURL(`file://${__dirname}/app/home.html`)
})


ipcMain.on('download-replay', (event, arg) => {
        DataManager.addToQueueList(arg.videoid)
        mainWindow.webContents.send('download-add', { vid: arg.videoid} )
        dlQueue.push(arg.videoid, err => {
            if (err) {
                mainWindow.webContents.send('download-error', err)
            } else {
                mainWindow.webContents.send('download-complete', { videoid: arg.videoid })
            }
        })
    })
    /**
     * Cannot cancel active download, only remove queued entries.
     */
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
    LiveMe.getVideoInfo(task).then(video => {
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
            videoid: task,
            filename: filename
        })

        let properSource = LiveMe.pickProperVideoSource(video)

        if (properSource === '') {
            let err = "Replay might still being generated or was deleted. Refresh the user's page and try again."

            fs.writeFileSync(`${path}/${filename}-error.log`, err)
            return done({
                videoid: task,
                error: err
            })
        }

        switch (parseInt(appSettings.get('downloads.ffmpegquality'))) {
            case 21: // Linux NVENC Accelerated
                ffmpegOpts = [
                    '-c:v h264_nvenc',
                    '-qp 22',
                    '-r 15',
                    '-bf 4',
                    '-vsync 2',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            case 20: // Linux VAAPI Accelerated
                ffmpegOpts = [
                    '-hwaccel vaapi',
                    '-hwaccel_output_format vaapi',
                    '-vaapi_device /dev/dri/renderD128',
                    '-c:v h264_vaapi',
                    '-vf hwupload,format=vaapi',
                    '-qp 22',
                    '-r 15',
                    '-bf 4',
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

            case 5: // AMD AMF Hardware Enabled - Experimental
                ffmpegOpts = [
                    '-c:v h264_amf',
                    '-qp 22',
                    '-r 15',
                    '-bf 4',
                    '-vsync 2',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            case 4: // nVidia Hardware Enabled - Experimental
                ffmpegOpts = [
                    '-c:v h264_nvenc',
                    '-qp 22',
                    '-r 15',
                    '-bf 4',
                    '-vsync 2',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            case 3: // Intel Hardware Enabled - Experimental
                ffmpegOpts = [
                    '-c:v h264_qsv',
                    '-qp 22',
                    '-r 15',
                    '-bf 4',
                    '-vsync 2',
                    '-c:a copy',
                    '-bsf:a aac_adtstoasc'
                ]
                break

            case 2: // Best
                ffmpegOpts = [
                    '-c:v h264',
                    '-crf 21',
                    '-r 15',
                    '-bf 4',
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
                    '-bf 4',
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


        switch (appSettings.get('downloads.method')) {
            case 'chunk':
                request(properSource, (err, res, body) => {
                    if (err || !body) {
                        fs.writeFileSync(`${path}/${filename}-error.log`, JSON.stringify(err, null, 2))
                        return done({ videoid: task, error: err || 'Failed to fetch m3u8 file.' })
                    }
                    // Separate ts names from m3u8
                    let concatList = ''
                    const tsList = []
                    body.split('\n').forEach(line => {
                            if (line.indexOf('.ts') !== -1) {
                                const tsName = line.split('?')[0].replace('\/', '_')
                                let tsPath = `${path}/lmpt_temp/${video.vid}_${tsName}`

                                if (process.platform == 'win32') {
                                    tsPath = tsPath.replace(/\\/g, '/');
                                }

                                // Check if TS has already been added to array
                                if (concatList.indexOf(tsPath) === -1) {
                                    // We'll use this later to merge downloaded chunks
                                    concatList += 'file ' + video.vid + '_' + tsName + '\n'
                                        // Push data to list
                                    tsList.push({ name: tsName, path: tsPath })
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

                        const stream = request(`${properSource.split('/').slice(0, -1).join('/')}/${file.name}`)
                            .on('error', err => {
                                fs.writeFileSync(`${path}/${filename}-error.log`, JSON.stringify(err, null, 2))
                                return done({ videoid: task, error: err })
                            })
                            .pipe(
                                fs.createWriteStream(file.path)
                            )
                            // Events
                        stream.on('finish', () => {
                            downloadedChunks += 1
                            mainWindow.webContents.send('download-progress', {
                                videoid: task,
                                state: `Downloading stream chunks.. (${downloadedChunks}/${tsList.length})`,
                                percent: Math.round((downloadedChunks / tsList.length) * 100)
                            })
                            next()
                        })

                    }, () => {
                        // Chunks downloaded
                        let cfile = path + '/lmpt_temp/' + video.vid + '.txt'

                        if (parseInt(appSettings.get('downloads.ffmpegquality')) == 0) {
                            // Just combined the chunks into a single TS file
                            let concatFile = fs.readFileSync(cfile, 'utf-8')
                            let cList = []

                            concatFile.split('\n').forEach(line => {
                                let l = line.split(' ')
                                
                                if (l.length > 1)
                                    cList.push(`${path}/lmpt_temp/${l[1]}`)
                            })

                            mainWindow.webContents.send('download-progress', {
                                videoid: task,
                                state: `Combining chunks, please wait...`,
                                percent: 0
                            })

                            concat(cList, `${path}/${filename}.ts`, (err) => {
                                if (err) {
                                    mainWindow.webContents.send('download-progress', {
                                        videoid: task,
                                        state: `Error combining chunks`,
                                        percent: 100
                                    })
                                    fs.writeFileSync(`${path}/${filename}-error.log`, err)
                                    return done({ videoid: task, error: err })
                                }
                            })

                            return done()
                        } else {
                            ffmpeg()
                                .on('start', c => {
                                    mainWindow.webContents.send('download-progress', {
                                        videoid: task,
                                        state: `Converting to MP4 file, please wait..`,
                                        percent: 0
                                    })
                                })
                                .on('progress', function(progress) {
                                    // FFMPEG doesn't always have this >.<
                                    let p = progress.percent
                                    if (p > 100) p = 100
                                    mainWindow.webContents.send('download-progress', {
                                        videoid: task,
                                        state: `Combining and converting to MP4 file, please wait...`,
                                        percent: p
                                    })
                                })
                                .on('end', (stdout, stderr) => {
                                    DataManager.addDownloaded(video.vid)
                                    if (appSettings.get('downloads.deltmp')) {
                                        tsList.forEach(file => fs.unlinkSync(file.path))
                                    }
                                    return done()
                                })
                                .on('error', (err) => {
                                    fs.writeFileSync(`${path}/${filename}-error.log`, err)
                                    return done({ videoid: task, error: err })
                                })
                                .input(cfile.replace(/\\/g, '/'))
                                .inputFormat('concat')
                                .output(`${path}/${filename}.mp4`)
                                .inputOptions([
                                    '-safe 0',
                                    '-f concat'
                                ])
                                .outputOptions(ffmpegOpts)
                                .run()
                        }

                        if (appSettings.get('downloads.saveMessageHistory') == true) {
                            LiveMe.getChatHistoryForVideo(video.msgfile)
                            .then(raw => {
                                let t = raw.split('\n')
                                let dump = ''

                                for (let i = 0; i < t.length - 1; i++) {
                                    try {
                                        let j = JSON.parse(t[i])
                                        let timeStamp = formatDuration(parseInt(j.timestamp) - startTime)
            
                                        if (j.objectName === 'app:joinchatroommsgcontent') {
                                        } else if (j.objectName === 'app:leavechatrrommsgcontent') {
                                        } else if (j.objectName === 'app:praisemsgcontent') {
                                        } else if (j.objectName === 'RC:TxtMsg') {
                                            dump += `[${timeStamp}] ${j.content.user.name}: ${j.content.content}`
                                            dump += '\n';
                                        }
                                    } catch (err) {
                                        // Caught
                                        console.log(err)
                                    }
                                }

                                fs.writeFileSync(`${path}/${filename}-chat.txt`, dump)
                                return done()
                            })
                        }

                    })
                        
                })
                break
            case 'ffmpeg':
                let outFile = path + '/' + filename + '.mp4'

                ffmpeg(properSource)
                    .outputOptions(ffmpegOpts)
                    .output(process.platform == 'win32' ? outFile.replace(/\\/g, '/') : outFile)
                    .on('end', function(stdout, stderr) {
                        DataManager.addDownloaded(video.vid)
                        return done()
                    })
                    .on('progress', function(progress) {
                        // FFMPEG doesn't always have this >.<
                        if (!progress.percent) {
                            progress.percent = ((progress.targetSize * 1000) / +video.videosize) * 100
                        }
                        mainWindow.webContents.send('download-progress', {
                            videoid: task,
                            state: `Downloading (${Math.round(progress.percent)}%)`,
                            percent: progress.percent
                        })
                    })
                    .on('start', function(c) {
                        mainWindow.webContents.send('download-start', {
                            videoid: task,
                            filename: filename
                        })
                    })
                    .on('error', function(err, stdout, stderr) {
                        fs.writeFileSync(`${path}/${filename}-error.log`, JSON.stringify([err, stdout, stderr], null, 2))
                        return done({ videoid: task, error: err })
                    })
                    .run()
                break
        }
    })
}, +appSettings.get('downloads.parallel') || 3)


/**
 * Watch a Replay - Use either internal player or external depending on settings
 */
ipcMain.on('watch-replay', (event, arg) => {
    DataManager.addWatched(arg.videoid)

    LiveMe.getVideoInfo(arg.videoid)
        .then(video => {
            let playerpath = appSettings.get('general.playerpath') || ' '

            if (playerpath.length > 5) {
                exec(playerpath.replace('%url%', LiveMe.pickProperVideoSource(video)))
            } else {
                // Open internal player
                if (playerWindow == null) {
                    let winposition = appSettings.get('position.playerWindow')
                    let winsize = appSettings.get('size.playerWindow')

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
                        fullscreen: false,
                        maximizable: false,
                        frame: false,
                        backgroundColor: '#000000',
                        webPreferences: {
                            webSecurity: false,
                            textAreasAreResizable: false,
                            plugins: true
                        }
                    })
                    playerWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()))
                    playerWindow.on('close', () => {
                        appSettings.set('position.playerWindow', playerWindow.getPosition())
                        appSettings.set('size.playerWindow', playerWindow.getSize())

                        playerWindow.webContents.session.clearCache(() => {
                            // Purge the cache to help avoid eating up space on the drive
                        })
                        playerWindow = null
                    })
                    playerWindow.loadURL(`file://${__dirname}/app/player.html`)
                    playerWindow.webContents.once('dom-ready', () => {
                        playerWindow.webContents.send('play-video', video, appSettings.get('player'))
                    })
                } else {
                    playerWindow.webContents.send('play-video', video, appSettings.get('player'))
                }
                playerWindow.focus()
            }
        })
        .catch(err => {
            console.log('[watch-replay] getVideoInfo Error:', err)
        })
})

ipcMain.on('save-player-options', (event, options) => {
    appSettings.set('player', options)
})

ipcMain.on('open-bookmarks', (event, arg) => {})

ipcMain.on('show-user', (event, arg) => {
    mainWindow.webContents.send('show-user', { userid: arg.userid })
})

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
        show: false
    })
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
        show: false
    })
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
        show: false
    })
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
        let winposition = appSettings.get('position.bookmarksWindow')
        let winsize = appSettings.get('size.bookmarksWindow')

        bookmarksWindow = new BrowserWindow({
            icon: path.join(__dirname, 'appicon.png'),
            x: winposition[0] > -1 ? winposition[0] : null,
            y: winposition[1] > -1 ? winposition[1] : null,
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
            backgroundColor: '#000000'
        })

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


ipcMain.on('open-housekeeping', (event, arg) => {
    if (housekeepingWindow == null) {
        housekeepingWindow = new BrowserWindow({
            icon: path.join(__dirname, 'appicon.png'),
            width: 520,
            height: 480,
            minWidth: 520,
            maxWidth: 520,
            minHeight: 480,
            maxHeight: 1600,
            darkTheme: true,
            autoHideMenuBar: false,
            disableAutoHideCursor: true,
            titleBarStyle: 'default',
            fullscreen: false,
            maximizable: false,
            frame: false,
            show: false,
            backgroundColor: '#000000'
        })

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
            entries: ['bookmarks.json', 'downloaded.json', 'profiles.json', 'watched.json', 'ignored.json']
        }
    ).pipe(fs.createWriteStream(backupFile))
})

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

    /**
     * This is here in case macOS version gets added back end after all the bugs/issues are figured out.
     * Requires a contributor running macOS now.
     */
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
