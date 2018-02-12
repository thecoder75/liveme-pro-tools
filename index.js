/*
    LiveMe Pro Tools
*/

const   appName = 'LiveMe Pro Tools';

const 	{ app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron'),
        { exec, execFile } = require('child_process');
        os = require('os'),
		fs = require('fs'),
        path = require('path'),
        request = require('request'),
        tarfs = require('tar-fs'),
        DataManager = new(require('./datamanager').DataManager)(),
        LiveMe = require('liveme-api'),
        isDev = require('electron-is-dev');

var 	mainWindow = null,
        playerWindow = null,
		bookmarksWindow = null,
        chatWindow = null,
        wizardWindow = null,
        menu = null,
        appSettings = require('electron-settings'),
        download_list = [];



function createWindow() {
    var isFreshInstall = appSettings.get('general.fresh_install') == null;

    //if (isDev) isFreshInstall = true;

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
            bookmarksWindow: [ -1, -1]
        });
        appSettings.set('size', {
            mainWindow: [ 1024, 600],
            playerWindow: [ 370, 680 ],
            bookmarksWindow: [ 400, 720 ]
        });
        appSettings.set('downloads', {
            handler: 1
        });
	}

    if (!appSettings.get('downloads.handler')) {
        appSettings.set('downloads', {
            handler: 1
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
    var winposition = appSettings.get('position'), winsize = appSettings.get('size');

    mainWindow = new BrowserWindow({
        icon: __dirname + '/appicon.ico',
        width: winsize.mainWindow[0],
        height: winsize.mainWindow[1],
        x: winposition.mainWindow[0] != -1 ? winposition.mainWindow[0] : null,
        y: winposition.mainWindow[1] != -1 ? winposition.mainWindow[1] : null,        
        minWidth: 1024,
        maxWidth: 1024,
        minHeight: 480,
        darkTheme: true,
        autoHideMenuBar: false,
        disableAutoHideCursor: true,
        titleBarStyle: 'default',
        fullscreen: false,
        maximizable: false,
        frame: false,
        show: false,
        backgroundColor: 'transparent',
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
            appSettings.set('position.mainWindow', JSON.stringify(mainWindow.getPosition()) );
            appSettings.set('size.mainWindow', JSON.stringify(mainWindow.getSize()) );

            DataManager.saveToDisk();

            mainWindow.webContents.session.clearCache(() => {
                // Purge the cache to help avoid eating up space on the drive
            });

            mainWindow = null;
            
            setTimeout(function(){
                app.quit();
            }, 1000);
        });


    wizardWindow.on('close', () => {
        wizardWindow.webContents.session.clearCache(() => {
            // Purge the cache to help avoid eating up space on the drive
        });        

        if (mainWindow != null) {
            mainWindow.show();        
        }

        wizardWindow = null;
    });


    /*
        Build our application menus using the templates provided
        further down.
    */
    menu = Menu.buildFromTemplate(getMenuTemplate());
    Menu.setApplicationMenu(menu);

    global.LiveMe = LiveMe;
    global.DataManager = DataManager;

    DataManager.loadFromDisk();


    if (isFreshInstall) {
        DataManager.disableWrites();
        wizardWindow.loadURL(`file://${__dirname}/app/wizard.html`);
        wizardWindow.show();
    } else {
        mainWindow.show();   
    }

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
    setTimeout(function(){
        downloadFile();
    }, 100);
});
/*
    It is done this way in case the API call to jDownloader returns an error or doesn't connect.
*/
function downloadFile() {

    if (download_list.length == 0) return;

    var handler = appSettings.get('downloads.handler');

    LiveMe.getVideoInfo(download_list[0]).then(video => {
        let isLive = video.hlsvideosource.endsWith('flv') || video.hlsvideosource.indexOf('liveplay') > 0 ? true : false;
        if (isLive) {
            mainWindow.webContents.send('popup-message', {
                text: 'Video is live and cannot be downloaded.'
            });
        } else {
            request({
                url: 'http://localhost:8297/addLink',
                method: 'post',
                json: true,
                timeout: 3000,
                body: { 
                    url: video.hlsvideosource, 
                    packageName: video.vid, 
                    forcePackageName: false 
                }
            }, function(err,httpResponse,body) {
                if (err) {
                    mainWindow.webContents.send('popup-message', {
                        text: 'No response from jDownloader, trying again...'
                    });
                    setTimeout(function(){ downloadFile(); }, 2000);
                } else if (httpResponse.statusCode == 200) {
                    DataManager.addDownloaded(download_list[0]);
                    download_list.shift();
                }
            });  
        }
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

    var win = new BrowserWindow({
        width: 420,
        height: 720,
        resizable: false,
        darkTheme: false,
        autoHideMenuBar: true,
        skipTaskbar: false,
        backgroundColor: '#000000',     // We utilize the macOS Vibrancy mode
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
    }).loadURL(`file://${__dirname}/app/listwindow.html?1&` + arg.userid);
});

ipcMain.on('open-followers-window', (event, arg) => {

    var win = new BrowserWindow({
        width: 420,
        height: 720,
        resizable: false,
        darkTheme: false,
        autoHideMenuBar: true,
        skipTaskbar: false,
        backgroundColor: '#000000',     // We utilize the macOS Vibrancy mode
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
        backgroundColor: '#000000',     // We utilize the macOS Vibrancy mode
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
            icon: __dirname + '/appicon.ico',
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
            backgroundColor: '#000000',
            webPreferences: {
                webSecurity: false,
                textAreasAreResizable: false,
                plugins: true
            }
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
