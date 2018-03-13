/*
    LiveMe Pro Tools
*/

const   appName = 'LiveMe Pro Tools';

const 	{ app, BrowserWindow, ipcMain, Menu, shell, dialog, autoUpdater } = require('electron'),
        { exec, execFile } = require('child_process');
        os = require('os'),
		fs = require('fs'),
        path = require('path'),
        request = require('request'),
        tarfs = require('tar-fs'),
        DataManager = new(require('./datamanager').DataManager)(),
        LiveMe = require('liveme-api'),
        isDev = require('electron-is-dev'),
        formatDuration = require('format-duration'),
        ffmpeg = require('fluent-ffmpeg'),
        m3u8stream = require('./modules/m3u8stream');               // We use a custom variation of this module

var 	mainWindow = null,
        playerWindow = null,
		bookmarksWindow = null,
        chatWindow = null,
        wizardWindow = null,
        menu = null,
        appSettings = require('electron-settings'),
        download_list = [],
        download_active = false;



function createWindow() {
    var isFreshInstall = appSettings.get('general.fresh_install') == null;

    if (isFreshInstall == true) {
        appSettings.set('general', {
            fresh_install: true,
            playerpath: '',
            hide_zeroreplay_fans: false,
            hide_zeroreplay_followings: true
        });
        appSettings.set('position', {
            mainWindow: [ -1, -1],
            playerWindow: [ -1, -1],
            bookmarksWindow: [ -1, -1],
            fansWindow: [-1, -1],
            followingsWindow: [-1, -1],
        });
        appSettings.set('size', {
            mainWindow: [ 1024, 600],
            playerWindow: [ 370, 680 ],
            bookmarksWindow: [ 400, 720 ]
        });
        appSettings.set('downloads', {
            path: path.join(app.getPath('home'), 'Downloads'),
            template: '%%replayid%%',
            chunks: 1
        });
        appSettings.set('lamd', {
            enabled: false,
            url: 'http://localhost:8280',
            handle_downloads: false
        });

	}

    if (!appSettings.get('downloads.path')) {
        appSettings.set('downloads', {
            path: path.join(app.getPath('home'), 'Downloads'),
            template: '%%replayid%%',
            chunks: 1
        });
    }

    if (!appSettings.get('downloads.chunks')) { appSettings.set('downloads.chunks', 1); }

    if (!appSettings.get('lamd.enabled')) {
        appSettings.set('lamd', {
            enabled: false,
            url: 'http://localhost:8280',
            handle_downloads : false
        });
    }

    if (!appSettings.get('history')) {
        appSettings.set('history', {
			viewed_maxage: 30
        });
    }

    var test = appSettings.get('position');
    if (test.mainWindow[1] == undefined) {
        appSettings.set('position', {
            mainWindow: [ -1, -1],
            playerWindow: [ -1, -1],
            bookmarksWindow: [ -1, -1]
        });
    }

    /*
        Create our window definitions
    */
    var winposition = appSettings.get('position.mainWindow'), winsize = appSettings.get('size.mainWindow');

    mainWindow = new BrowserWindow({
        icon: __dirname + '/appicon.ico',
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
    });

    wizardWindow = new BrowserWindow({
        icon: __dirname + '/appicon.ico',
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
    });


    /*
        Configure our window contents and callbacks
    */
    mainWindow.loadURL(`file://${__dirname}/app/index.html`);
	mainWindow
        .on('open', () => {

    	})
        .on('close', () => {

            appSettings.set('position.mainWindow', mainWindow.getPosition() );
            appSettings.set('size.mainWindow', mainWindow.getSize() );

            DataManager.saveToDisk();

            if (playerWindow != null) { playerWindow.close(); }
            if (bookmarksWindow != null) { bookmarksWindow.close(); }
            if (chatWindow != null) { chatWindow.close(); }

            mainWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            });

            mainWindow = null;

            setTimeout(function(){
                app.quit();
            }, 500);
        });



    wizardWindow.on('close', () => {
        wizardWindow.webContents.session.clearCache(() => {
            // Purge the cache to help avoid eating up space on the drive
        });

        if (mainWindow != null) {
			var pos = appSettings.get('position.mainWindow');
			mainWindow.setPosition(pos[0], pos[1], false).show();
        }

        wizardWindow = null;
    });


    /*
        Build our application menus using the templates provided
        further down.
    */
    menu = Menu.buildFromTemplate(getMenuTemplate());
    Menu.setApplicationMenu(menu);

    global.isDev = isDev;
    global.LiveMe = LiveMe;
    global.DataManager = DataManager;

    DataManager.loadFromDisk();

	setTimeout(() => {
		var dt = new Date(), ma = appSettings.get('history.viewed_maxage'), od = Math.floor((dt.getTime() - (ma * 86400000)) / 1000);
		DataManager.unviewProfiles(od, false);
	}, 250);



    if (isFreshInstall) {
        DataManager.disableWrites();
        wizardWindow.loadURL(`file://${__dirname}/app/wizard.html`);
        wizardWindow.show();
    } else {
		mainWindow.show();

		var pos = appSettings.get('position.mainWindow').length > 1 ? appSettings.get('position.mainWindow') : [null, null];
		if (pos[0] != null)	mainWindow.setPosition(pos[0], pos[1], false);
	}

    setInterval(() => {
        downloadFile();
    }, 500);

}

var shouldQuit = app.makeSingleInstance( function(commandLine,workingDirectory) {
	if (mainWindow) {
		mainWindow.focus();
	}
});
if (shouldQuit) {
	app.quit();
	return;
}



app.on('ready', () => {
    createWindow();
});
app.on('window-all-closed', () => {
	app.quit();
});
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});



/*


                        IPC Event Handlers


*/
ipcMain.on('download-replay', (event, arg) => {
    download_list.push(arg.videoid);
});
/*
 * 		Cannot cancel active download, only remove queued entries.
 */
ipcMain.on('download-cancel', (event, arg) => {

	for (var i = 0; i < download_list.length; i++) {
		if (download_list[i] == arg.videois) {
			download_list.splice(i, 1);
		}
	}

});
/*
    It is done this way in case the API call to jDownloader returns an error or doesn't connect.
*/
function downloadFile() {

	if (download_active == true) return;
    if (download_list.length == 0) return;

	download_active = true;

    LiveMe.getVideoInfo(download_list[0]).then(video => {

        var path = appSettings.get('downloads.path'),
            filename = appSettings.get('downloads.template')
                .replace(/%%broadcaster%%/g, video.uname)
                .replace(/%%longid%%/g, video.userid)
                .replace(/%%replayid%%/g, video.vid)
                .replace(/%%replayviews%%/g, video.playnumber)
                .replace(/%%replaylikes%%/g, video.likenum)
                .replace(/%%replayshares%%/g, video.sharenum)
                .replace(/%%replaytitle%%/g, video.title ? video.title : 'untitled')
                .replace(/%%replayduration%%/g, video.videolength);

		filename = filename.replace(/[/\\?%*:|"<>]/g, '-');
		filename = filename.replace(/([^a-z0-9\s]+)/gi, '-');
		filename = filename.replace(/[\u{0080}-\u{FFFF}]/gu, '');

        filename += '.ts';
        video._filename = filename;

        
        DataManager.addDownloaded(video.vid);

        /*
        ffmpeg(video.hlsvideosource)
            .outputOptions([
                '-c copy',
                '-bsf:a aac_adtstoasc',
                '-vsync 2',
                '-movflags faststart'
            ])
            .output(path + '/' + filename)
            .on('end', function(stdout, stderr) {
                mainWindow.webContents.send('download-complete', { videoid: download_list[0] }); 
                download_list.shift();
            })
            .on('progress', function(progress) {
                mainWindow.webContents.send('download-progress', {
                    videoid: download_list[0],
                    current: progress.percent,
                    total: 100
                });
            })
            .on('start', function(c) {
                mainWindow.webContents.send('download-start', {
                    videoid: download_list[0],
                    filename: filename
                });                
            })
            .on('error', function(err, stdout, etderr) {
                mainWindow.webContents.send('download-error', { videoid: download_list[0], error: err }); 
                download_list.shift();
            })
            .run();
        */


        mainWindow.webContents.send('download-start', {
            videoid: download_list[0],
            filename: filename
        });                
        m3u8stream(video, {
            chunkReadahead: appSettings.get('downloads.chunks'),
            on_progress: (e) => {
				if (mainWindow != null) {
					mainWindow.webContents.send('download-progress', {
						videoid: e.videoid,
						current: e.index,
						total: e.total
					});
				}
            },
            on_complete: (e) => {
                if (mainWindow != null) { mainWindow.webContents.send('download-complete', { videoid: e.videoid }); }
                DataManager.addDownloaded(e.videoid);
                download_active = false;
                download_list.shift();
            },
            on_error: (e) => {
                if (mainWindow != null) { mainWindow.webContents.send('download-error', { videoid: e.videoid, error: e.error }); }
                download_active = false;
                download_list.shift();
            }
        }).pipe(fs.createWriteStream(path + '/' + filename));
        
    });

}


/*
    Watch a Replay - Use either internal player or external depending on settings
*/
ipcMain.on('watch-replay', (event, arg) => {

    DataManager.addWatched(arg.videoid);

    LiveMe.getVideoInfo(arg.videoid)
        .then(video => {
            var internalplayer = playerpath = appSettings.get('general.playerpath');

            if (playerpath.length > 5) {
                exec(playerpath.replace('%url%', video.hlsvideosource));
            } else {
                // Open internal player
                if (playerWindow == null) {

                    var winposition = appSettings.get('position.playerWindow'), winsize = appSettings.get('size.playerWindow');

                    playerWindow = new BrowserWindow({
                        icon: __dirname + '/appicon.ico',
                        width: winsize[0],
                        height: winsize[1],
                        x: winposition[0] != -1 ? winposition[0] : null,
                        y: winposition[1] != -1 ? winposition[1] : null,
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
                    });
                    playerWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()));
                    playerWindow.on('close', () => {
                        appSettings.set('position.playerWindow', playerWindow.getPosition());
                        appSettings.set('size.playerWindow', playerWindow.getSize());

                        playerWindow.webContents.session.clearCache(() => {
                            // Purge the cache to help avoid eating up space on the drive
                        });
                        playerWindow = null;
                    });
                }
                playerWindow.loadURL(`file://${__dirname}/app/player.html?${video.vid}`);

            }
        });
});

ipcMain.on('open-bookmarks', (event, arg) => {

});

ipcMain.on('show-user', (event, arg) => {
    mainWindow.webContents.send('show-user', { userid: arg.userid });
});

ipcMain.on('open-followings-window', (event, arg) => {

	var winposition = appSettings.get('position.followingsWindow') ? appSettings.get('position.followingsWindow') : [-1, -1];

    var win = new BrowserWindow({
		x: winposition[0] != -1 ? winposition[0] : null,
		y: winposition[1] != -1 ? winposition[1] : null,
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
    });
    win.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()));

    win.on('ready-to-show', () => {
        win.show();
    }).on('close', () => {
		appSettings.set('position.followingsWindow', win.getPosition());
	}).loadURL(`file://${__dirname}/app/listwindow.html?1&` + arg.userid);
});

ipcMain.on('open-followers-window', (event, arg) => {

	var winposition = appSettings.get('position.fansWindow') ? appSettings.get('position.fansWindow') : [-1, -1];

    var win = new BrowserWindow({
		x: winposition[0] != -1 ? winposition[0] : null,
		y: winposition[1] != -1 ? winposition[1] : null,
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
    });
    win.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()));

    win.on('ready-to-show', () => {
        win.show();
    }).on('close', () => {
		appSettings.set('position.fansWindow', win.getPosition());
    }).loadURL(`file://${__dirname}/app/listwindow.html?0&` + arg.userid);
});

ipcMain.on('read-comments', (event, arg) => {

    var win = new BrowserWindow({
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
    });
    win.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()));

    win.on('ready-to-show', () => {
        win.showInactive();
    }).loadURL(`file://${__dirname}/app/comments.html?` + arg.userid);
});

ipcMain.on('open-bookmarks', (event, arg) => {
    if (bookmarksWindow == null) {
        var winposition = appSettings.get('position.bookmarksWindow'), winsize = appSettings.get('size.bookmarksWindow');

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
        });

        bookmarksWindow.setMenu(Menu.buildFromTemplate(getMiniMenuTemplate()));

        bookmarksWindow.on('close', () => {
            appSettings.set('position.bookmarksWindow', bookmarksWindow.getPosition());
            appSettings.set('size.bookmarksWindow', bookmarksWindow.getSize());

            bookmarksWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            });
            bookmarksWindow = null;
        });


    }
    bookmarksWindow.on('ready-to-show', () => {
        bookmarksWindow.show();
    }).loadURL(`file://${__dirname}/app/bookmarks.html`);

});



ipcMain.on('restore-backup', (event, arg) => {
    let d = dialog.showOpenDialog(
        {
            properties: [
                'openFile',
            ],
            buttonLabel : 'Restore',
            filters : [
                { name : 'TAR files', extensions: [ 'tar' ]}
            ]
        },
        (filePath) => {

            if (filePath != null) {

                mainWindow.webContents.send('shutdown');

                DataManager.disableWrites();
                var config_path = path.join(app.getPath('appData'), app.getName(), '/');
                fs.createReadStream(filePath[0]).pipe(tarfs.extract(config_path));
                setTimeout(function(){
                    app.relaunch();
                    app.quit();
                }, 1000);

            }
        }
    );
});


ipcMain.on('create-backup', (event, arg) => {

    var config_path = path.join(app.getPath('appData'), app.getName()), backup_file = path.join(app.getPath('home'), 'Downloads', 'liveme-pro-tools-backup.tar');

    tarfs.pack(
        config_path,
        {
            entries: [ 'bookmarks.json', 'downloaded.json', 'profiles.json', 'watched.json' ]
        }
    ).pipe(fs.createWriteStream(backup_file));

});








function getMenuTemplate() {

    var template = [
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
                    click: () => shell.openExternal('https://thecoder75.github.io/liveme-pro-tools/')
                }
            ]
        }
    ];

	/*
		This is here in case macOS version gets added back end after all the bugs/issues are figured out.

		Requires a contributor running macOS now.
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
                    click: () => { mainWindow.close(); }
                }
            ]
        });
    }

    return template;
}



function getMiniMenuTemplate() {

    var template = [
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
    ];

    return template;
}
