/*
    Wizard
*/
const   { electron, BrowserWindow, remote, ipcRenderer, shell } = require('electron'),
        fs = require('fs'), path = require('path'), 
        appSettings = remote.require('electron-settings'),
        LiveMe = remote.getGlobal('LiveMe'),
        DataManager = remote.getGlobal('DataManager');

var     current_stage = 1, lmt_exists = false, lmtk_exists = false, wait = false;

$(function(){

    if (fs.existsSync(path.join(remote.app.getPath('appData'), 'LiveMeTools', 'Settings'))) {
        lmt_exists = true;
    }
    if (fs.existsSync(path.join(remote.app.getPath('appData'), 'liveme-toolkit', 'viewed.json'))) {
        lmtk_exists = true;
    }

    console.log('LMT: ' + (lmt_exists ? 'true' : 'false'));
    console.log('LMTK: ' + (lmtk_exists ? 'true' : 'false'));

    $('main').show();
    $('#stage1').animate({ opacity: 1.0 }, 400);
});

function goStage2() {
    $('#stage1').animate({ opacity: 0.0 }, 400);
    $('#stage2').animate({ opacity: 1.0 }, 400);   
}

function goStage3(i) {
    appSettings.set('general.hide_zeroreplay_followings', i);
    $('#stage2').animate({ opacity: 0.0 }, 400);

    if (lmt_exists)
        $('#stage3').animate({ opacity: 1.0 }, 400);   
    else if (lmtk_exists)
        $('#stage4').animate({ opacity: 1.0 }, 400);   
    else
        $('#stage5').animate({ opacity: 1.0 }, 400);   
    
}

function goStage4(i) {
    
    if (i == 1) {
        // Import LMT
        $('#wait').show();
        $('#wait .message').html('Importing Favorites...');

        fs.readFile(path.join(remote.app.getPath('appData'), 'LiveMeTools', 'favorites.json'), 'utf8', function (err,data) {
            if (err) {
                // 
            } else {
                var list = JSON.parse(data);
                for (var i = 0; i < list.length; i++) {

                    LiveMe.getUserInfo(list[i].uid).then(user => {

                        let t = Math.floor((new Date()).getTime() / 1000);
                        let u = {
                            uid: user.user_info.uid,
                            shortid: user.user_info.short_id,
                            signature: user.user_info.usign,
                            sex: user.user_info.sex,
                            face: user.user_info.face,
                            nickname: user.user_info.uname,
                            counts: {
                                replays: user.count_info.video_count,
                                friends: user.count_info.friends_count,
                                followers: user.count_info.follower_count,
                                followings: user.count_info.following_count,
                            },
                            last_viewed: t,
                            newest_replay: t - 1
                        };

                        DataManager.addBookmark(u);

                    });
                }

                $('#wait .message').html('Importing Download History...');

                fs.readFile(path.join(remote.app.getPath('appData'), 'LiveMeTools', 'downloadHistory.json'), 'utf8', function (err,data) {
                    if (err) {
                        // 
                    } else {
                        var list = JSON.parse(data);
                        for (var i = 0; i < list.length; i++)
                            DataManager.addWatched(list[i]);
                            DataManager.addDownloaded(list[i]);
                    }

                    $('#wait').hide();

                    $('#stage3').animate({ opacity: 0.0 }, 400);
                    if (lmtk_exists)
                        $('#stage4').animate({ opacity: 1.0 }, 400);   
                    else
                        $('#stage5').animate({ opacity: 1.0 }, 400);   

                });                
            }
        });
    } else {
        $('#stage3').animate({ opacity: 0.0 }, 400);
        if (lmtk_exists)
            $('#stage4').animate({ opacity: 1.0 }, 400);   
        else
            $('#stage5').animate({ opacity: 1.0 }, 400);   
    }  
}

function goStage5(i) {

    if (i == 1) {
        // Import LMTK
        $('#wait').show();
        $('#wait .message').html('Importing Favorites...');

        fs.readFile(path.join(remote.app.getPath('appData'), 'liveme-toolkit', 'favorites.json'), 'utf8', function (err,data) {
            if (err) {
                // 
            } else {
                var list = JSON.parse(data);
                for (var i = 0; i < list.length; i++) {

                    LiveMe.getUserInfo(list[i][0]).then(user => {

                        let t = Math.floor((new Date()).getTime() / 1000);
                        let u = {
                            uid: user.user_info.uid,
                            shortid: user.user_info.short_id,
                            signature: user.user_info.usign,
                            sex: user.user_info.sex,
                            face: user.user_info.face,
                            nickname: user.user_info.uname,
                            counts: {
                                replays: user.count_info.video_count,
                                friends: user.count_info.friends_count,
                                followers: user.count_info.follower_count,
                                followings: user.count_info.following_count,
                            },
                            last_viewed: t,
                            newest_replay: t - 1
                        };
                        DataManager.addBookmark(u);
                    });
                }

                $('#wait .message').html('Importing History...');

                fs.readFile(path.join(remote.app.getPath('appData'), 'liveme-toolkit', 'download_history.json'), 'utf8', function (err,data) {
                    if (err) {
                        // 
                    } else {
                        var list = JSON.parse(data);
                        for (var i = 0; i < list.length; i++)
                            DataManager.addDownloaded(list[i]);                        
                            DataManager.addWatched(list[i]);
                    }

                    fs.readFile(path.join(remote.app.getPath('appData'), 'liveme-toolkit', 'viewed.json'), 'utf8', function (err,data) {
                        if (err) {
                            // 
                        } else {
                            var list = JSON.parse(data);
                            for (var i = 0; i < list.length; i++)
                                DataManager.addViewed(list[i][1]);

                        }

                        $('#wait').hide();

                        $('#stage4').animate({ opacity: 0.0 }, 400);
                        $('#stage5').animate({ opacity: 1.0 }, 400);   

                    });  
                });                
            }
        });
    } else {
        $('#wait').hide();

        $('#stage4').animate({ opacity: 0.0 }, 400);
        $('#stage5').animate({ opacity: 1.0 }, 400);           
    }

}

function goStage6() {

    DataManager.enableWrites();
    DataManager.saveToDisk();
    ipcRenderer.send('show-main'); 
    
    window.close();

}

