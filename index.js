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
const DataManager = new (require('./datamanager').DataManager)()
const LivemeAPI = require('liveme-api')
const LiveMe = new LivemeAPI({})
const isDev = require('electron-is-dev')
const ffmpeg = require('fluent-ffmpeg')
const async = require('async')

let mainWindow = null
let playerWindow = null
let bookmarksWindow = null
let chatWindow = null
let wizardWindow = null
let menu = null
let appSettings = require('electron-settings')

function createWindow () {
    let isFreshInstall = appSettings.get('general.fresh_install') == null

    if (isFreshInstall === true) {
        appSettings.set('general', {
            fresh_install: true,
            playerpath: '',
            hide_zeroreplay_fans: false,
            hide_zeroreplay_followings: true
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
            playerWindow: [370, 680],
            bookmarksWindow: [400, 720]
        })
        appSettings.set('downloads', {
            path: path.join(app.getPath('home'), 'Downloads'),
            template: '%%replayid%%'
        })
        appSettings.set('lamd', {
            enabled: false,
            url: 'http://localhost:8280',
            handle_downloads: false
        })
    }

    if (!appSettings.get('downloads.path')) {
        appSettings.set('downloads', {
            path: path.join(app.getPath('home'), 'Downloads'),
            template: '%%replayid%%'
        })
    }

    if (!appSettings.get('downloads.chunks')) {
        appSettings.set('downloads.chunks', 1)
    }

    if (!appSettings.get('lamd.enabled')) {
        appSettings.set('lamd', {
            enabled: false,
            url: 'http://localhost:8280',
            handle_downloads: false
        })
    }

    if (!appSettings.get('history.viewed_maxage')) {
        appSettings.set('history', {
            viewed_maxage: 1
        })
    }

    let test = appSettings.get('position')
    if (test.mainWindow[1] === undefined) {
        appSettings.set('position', {
            mainWindow: [-1, -1],
            playerWindow: [-1, -1],
            bookmarksWindow: [-1, -1]
        })
    }

    /**
     * Create our window definitions
     */
    // let winposition = appSettings.get('position.mainWindow')
    let winsize = appSettings.get('size.mainWindow')

    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, 'appicon.ico'),
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
            webSecurity: false,
            textAreasAreResizable: false,
            plugins: true
        }
    })

    wizardWindow = new BrowserWindow({
        icon: path.join(__dirname, 'appicon.ico'),
        width: 520,
        height: 300,
        darkTheme: true,
        autoHideMenuBar: false,
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        resizable: false,
        fullscreen: false,
        maximizable: false,
        show: false,
        frame: false,
        backgroundColor: 'transparent',
        webPreferences: {
            webSecurity: false,
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
            }, 500)
        })

    wizardWindow.on('close', () => {
        wizardWindow.webContents.session.clearCache(() => {
            // Purge the cache to help avoid eating up space on the drive
        })

        if (mainWindow != null) {
            let pos = appSettings.get('position.mainWindow')
            mainWindow.setPosition(pos[0], pos[1], false).show()
        }

        wizardWindow = null
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

    if (isFreshInstall) {
        DataManager.disableWrites()
        wizardWindow.loadURL(`file://${__dirname}/app/wizard.html`)
        wizardWindow.show()
    } else {
        mainWindow.show()

        let pos = appSettings.get('position.mainWindow').length > 1 ? appSettings.get('position.mainWindow') : [null, null]
        if (pos[0] != null) {
            mainWindow.setPosition(pos[0], pos[1], false)
        }
    }
}

let shouldQuit = app.makeSingleInstance(function (commandLine, workingDirectory) {
    if (mainWindow) {
        mainWindow.focus()
    }
})
if (shouldQuit) {
    app.quit()
    process.exit()
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

/**
 * IPC Event Handlers
 */
ipcMain.on('import-queue', (event, arg) => {})

ipcMain.on('import-users', (event, arg) => {})

ipcMain.on('export-users', (event, arg) => {})

ipcMain.on('downloads-parallel', (event, arg) => {
    dlQueue.concurrency = arg
})

ipcMain.on('download-replay', (event, arg) => {
    DataManager.addToQueueList(arg.videoid)
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
    dlQueue.remove(function (task) {
        if (task.data === arg.videoid) {
            DataManager.removeFromQueueList(task.data)
            return true
        }
        return false
    })
})
/**
 * It is done this way in case the API call to jDownloader returns an error or doesn't connect.
 */
const dlQueue = async.queue((task, done) => {
    // Set custom FFMPEG path if defined
    if (appSettings.get('downloads.ffmepg')) ffmpeg.setFfmpegPath(appSettings.get('downloads.ffmepg'))
    // Get video info
    LiveMe.getVideoInfo(task).then(video => {
        const path = appSettings.get('downloads.path')
        const dt = new Date(video.vtime * 1000)
        const mm = dt.getMonth() + 1
        const dd = dt.getDate()

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
        filename += '.mp4'
        video._filename = filename

        DataManager.addDownloaded(video.vid)

        // 20180409 - Added FFMPEG downloader by TheCoder
        mainWindow.webContents.send('download-start', {
            videoid: task,
            filename: filename
        })

        switch (appSettings.get('downloads.method')) {
        case 'chunk':
            request(video.hlsvideosource, (err, res, body) => {
                if (err || !body) {
                    fs.writeFileSync(`${path}/${filename}-error.log`, JSON.stringify(err, null, 2))
                    return done({ videoid: task, error: err || 'Failed to fetch m3u8 file.' })
                }
                // Separate ts names from m3u8
                let concatList = ''
                const tsList = []
                body.split('\n').forEach(line => {
                    if (line.indexOf('.ts') !== -1) {
                        const tsName = line.split('?')[0]
                        const tsPath = `${path}/lpt_temp/${video.vid}_${tsName}`
                        // Check if TS has already been added to array
                        if (concatList.indexOf(tsPath) === -1) {
                            // We'll use this later to merge downloaded chunks
                            concatList += `${tsPath}|`
                            // Push data to list
                            tsList.push({ name: tsName, path: tsPath })
                        }
                    }
                })
                // remove last |
                concatList = concatList.slice(0, -1)
                // Check if tmp dir exists
                if (!fs.existsSync(`${path}/lpt_temp`)) {
                    // create temporary dir for ts files
                    fs.mkdirSync(`${path}/lpt_temp`)
                }
                // Download chunks
                let downloadedChunks = 0
                async.eachLimit(tsList, 10, (file, next) => {
                    const stream = request(`${video.hlsvideosource.split('/').slice(0, -1).join('/')}/${file.name}`)
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
                    ffmpeg()
                        .on('start', c => {
                            console.log('started', c)
                            mainWindow.webContents.send('download-progress', {
                                videoid: task,
                                state: `Converting to MP4, please wait..`,
                                percent: 100
                            })
                        })
                        .on('end', (stdout, stderr) => {
                            if (appSettings.get('downloads.deltmp')) {
                                tsList.forEach(file => fs.unlinkSync(file.path))
                            }
                            return done()
                        })
                        .on('error', (err, stdout, stderr) => {
                            fs.writeFileSync(`${path}/${filename}-error.log`, JSON.stringify([err, stdout, stderr], null, 2))
                            if (appSettings.get('downloads.deltmp')) {
                                tsList.forEach(file => fs.unlinkSync(file.path))
                            }
                            return done({ videoid: task, error: err })
                        })
                        .input(`concat:${concatList}`)
                        .output(`${path}/${filename}`)
                        // .outputOption('-strict -2')
                        .outputOptions([
                            '-c:v libx264',
                            '-q:v 0',
                            '-c:a copy',
                            '-bsf:a aac_adtstoasc',
                            '-vsync 2',
                            '-preset superfast'
                        ])
                        .run()
                })
            })
            break
        case 'ffmpeg':
            ffmpeg(video.hlsvideosource)
                .outputOptions([
                    '-c copy',
                    '-bsf:a aac_adtstoasc',
                    '-vsync 2',
                    '-movflags faststart'
                ])
                .output(path + '/' + filename)
                .on('end', function (stdout, stderr) {
                    return done()
                })
                .on('progress', function (progress) {
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
                .on('start', function (c) {
                    console.log('started', c)
                    mainWindow.webContents.send('download-start', {
                        videoid: task,
                        filename: filename
                    })
                })
                .on('error', function (err, stdout, stderr) {
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
            let internalplayer = appSettings.get('general.playerpath')
            let playerpath = internalplayer

            if (playerpath.length > 5) {
                exec(playerpath.replace('%url%', video.hlsvideosource))
            } else {
                // Open internal player
                if (playerWindow == null) {
                    let winposition = appSettings.get('position.playerWindow')
                    let winsize = appSettings.get('size.playerWindow')

                    playerWindow = new BrowserWindow({
                        icon: path.join(__dirname, 'appicon.ico'),
                        width: winsize[0],
                        height: winsize[1],
                        x: winposition[0] !== -1 ? winposition[0] : null,
                        y: winposition[1] !== -1 ? winposition[1] : null,
                        minWidth: 380,
                        minHeight: 708,
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
                }
                playerWindow.loadURL(`file://${__dirname}/app/player.html?${video.vid}`)
            }
        })
        .catch(err => {
            console.log('[watch-replay] getVideoInfo Error:', err)
        })
})

ipcMain.on('open-bookmarks', (event, arg) => {})

ipcMain.on('show-user', (event, arg) => {
    mainWindow.webContents.send('show-user', { userid: arg.userid })
})

ipcMain.on('open-followings-window', (event, arg) => {
    let winposition = appSettings.get('position.followingsWindow') ? appSettings.get('position.followingsWindow') : [-1, -1]

    let win = new BrowserWindow({
        x: winposition[0] !== -1 ? winposition[0] : null,
        y: winposition[1] !== -1 ? winposition[1] : null,
        width: 420,
        height: 720,
        resizable: false,
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
        x: winposition[0] !== -1 ? winposition[0] : null,
        y: winposition[1] !== -1 ? winposition[1] : null,
        width: 420,
        height: 720,
        resizable: false,
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
        width: 400,
        height: 660,
        resizable: false,
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
        win.showInactive()
    }).loadURL(`file://${__dirname}/app/comments.html?` + arg.userid)
})

ipcMain.on('open-bookmarks', (event, arg) => {
    if (bookmarksWindow == null) {
        let winposition = appSettings.get('position.bookmarksWindow')
        let winsize = appSettings.get('size.bookmarksWindow')

        bookmarksWindow = new BrowserWindow({
            x: winposition[0] > -1 ? winposition[0] : null,
            y: winposition[1] > -1 ? winposition[1] : null,
            width: 400,
            height: winsize[1],
            minWidth: 400,
            maxWidth: 400,
            minHeight: 480,
            maxHeight: 1200,
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

ipcMain.on('restore-backup', (event, arg) => {
    dialog.showOpenDialog(
        {
            properties: [
                'openFile'
            ],
            buttonLabel: 'Restore',
            filters: [
                {
                    name: 'TAR files',
                    extensions: ['tar']
                }
            ]
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
    let configPath = path.join(app.getPath('appData'), app.getName())
    let backupFile = path.join(app.getPath('home'), 'Downloads', 'liveme-pro-tools-backup.tar')

    tarfs.pack(
        configPath,
        {
            entries: [ 'bookmarks.json', 'downloaded.json', 'profiles.json', 'watched.json' ]
        }
    ).pipe(fs.createWriteStream(backupFile))
})

function getMenuTemplate () {
    let template = [
        {
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
            submenu: [
                {
                    label: 'LiveMe Pro Tools Page',
                    click: () => shell.openExternal('https://github.com/lewdninja/liveme-pro-tools/')
                }
            ]
        }
    ]

    /**
     * This is here in case macOS version gets added back end after all the bugs/issues are figured out.
     * Requires a contributor running macOS now.
     */
    if (process.platform === 'darwin') {
        template.unshift({
            label: appName,
            submenu: [
                {
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

function getMiniMenuTemplate () {
    let template = [
        {
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
