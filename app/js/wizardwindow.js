/*
    Wizard
*/
const   { electron, BrowserWindow, remote, ipcRenderer, shell } = require('electron'),
        fs = require('fs'), path = require('path'), 
        appSettings = remote.require('electron-settings'),
        LiveMe = remote.getGlobal('LiveMe'),
        DataManager = remote.getGlobal('DataManager');

var     current_stage = 1, 
        lmt_exists = false, 
        lmtk_exists = false, 
        wait = false, 
        tempvar = { index: 0, max: 0, list: [] }, 
        TRANSITION_TIME = 200;

$(function(){

    /*
        LiveMe Tools       -->      LiveMe Tools/favorites.json
        LiveMe Toolkit     -->      liveme-toolkit/bookmarks.json

    */
    if (fs.existsSync(path.join(remote.app.getPath('appData'), 'LiveMeTools', 'favorites.json'))) {
        lmt_exists = true;
    }
    if (fs.existsSync(path.join(remote.app.getPath('appData'), 'liveme-toolkit', 'bookmarks.json'))) {
        lmtk_exists = true;
    }

    $('main').show();
    $('#stage1').animate({ opacity: 1.0 }, TRANSITION_TIME);
});

function goStage2() {

    $('#stage1').animate({ opacity: 0.0 }, TRANSITION_TIME);
    
    if (lmt_exists)
        $('#stage3').animate({ opacity: 1.0 }, TRANSITION_TIME);   
    else if (lmtk_exists)
        $('#stage4').animate({ opacity: 1.0 }, TRANSITION_TIME);   
    else
        $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   
    
}

function goStage4(i) {
    
    if (i == 1) {
        // Import LMT
        $('#wait').show();
        $('#wait .message').html('Importing Favorites...');

        fs.readFile(path.join(remote.app.getPath('appData'), 'LiveMeTools', 'favorites.json'), 'utf8', function (err,data) {
            if (err) {
                $('#stage3').animate({ opacity: 0.0 }, TRANSITION_TIME);
                if (lmtk_exists)
                    $('#stage4').animate({ opacity: 1.0 }, TRANSITION_TIME);   
                else
                    $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   
            } else {
                var list = JSON.parse(data);
                for (var i = 0; i < list.length; i++) {

                    let t1 = Math.floor((new Date()).getTime() / 1000) - 86400;
                    let t2 = Math.floor((new Date()).getTime() / 1000) - 604800;

                    let u = {
                        uid: list[i].uid,
                        shortid: list[i].short_id,
                        signature: list[i].usign,
                        sex: list[i].sex,
                        face: list[i].face,
                        nickname: list[i].uname,
                        counts: {
                            replays: 0,
                            friends: 0,
                            followers: 0,
                            followings: 0,
                        },
                        last_viewed: t1,
                        newest_replay: t2
                    };

                    DataManager.addBookmark(u);

                }

                $('#wait .message').html('Importing Download History...');

                fs.readFile(path.join(remote.app.getPath('appData'), 'LiveMeTools', 'downloadHistory.json'), 'utf8', function (err,data) {
                    if (err) {
                        $('#wait').hide();

                        $('#stage3').animate({ opacity: 0.0 }, TRANSITION_TIME);
                        if (lmtk_exists)
                            $('#stage4').animate({ opacity: 1.0 }, TRANSITION_TIME);   
                        else
                            $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   
                    } else {
                        var list = JSON.parse(data);
                        for (var i = 0; i < list.length; i++)
                            DataManager.addWatched(list[i]);
                            DataManager.addDownloaded(list[i]);
                    }

                    $('#wait').hide();

                    $('#stage3').animate({ opacity: 0.0 }, TRANSITION_TIME);
                    if (lmtk_exists)
                        $('#stage4').animate({ opacity: 1.0 }, TRANSITION_TIME);   
                    else
                        $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   

                });                
            }
        });
    } else {
        $('#stage3').animate({ opacity: 0.0 }, TRANSITION_TIME);
        if (lmtk_exists)
            $('#stage4').animate({ opacity: 1.0 }, TRANSITION_TIME);   
        else
            $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   
    }  
}

function goStage5(i) {

    if (i == 1) {
        // Import LMTK
        $('#wait').show();
        $('#wait .message').html('Importing Favorites...');

        fs.readFile(path.join(remote.app.getPath('appData'), 'liveme-toolkit', 'favorites.json'), 'utf8', function (err,data) {
            if (err) {
                $('#wait').hide();

                $('#stage4').animate({ opacity: 0.0 }, TRANSITION_TIME);
                $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   
            } else {
                var list = JSON.parse(data);
                for (var i = 0; i < list.length; i++) {

                    let t1 = Math.floor((new Date()).getTime() / 1000) - 86400;
                    let t2 = Math.floor((new Date()).getTime() / 1000) - 604800;

                    let u = {
                        uid: list[i].uid,
                        shortid: list[i].short_id,
                        signature: list[i].usign,
                        sex: list[i].sex,
                        face: list[i].face,
                        nickname: list[i].uname,
                        counts: {
                            replays: 0,
                            friends: 0,
                            followers: 0,
                            followings: 0,
                        },
                        last_viewed: t1,
                        newest_replay: t2
                    };

                    DataManager.addBookmark(u);

                }

                $('#wait .message').html('Importing History...');

                fs.readFile(path.join(remote.app.getPath('appData'), 'liveme-toolkit', 'download_history.json'), 'utf8', function (err,data) {
                    if (err) {
                        $('#wait').hide();

                        $('#stage4').animate({ opacity: 0.0 }, TRANSITION_TIME);
                        $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   
                    } else {
                        var list = JSON.parse(data);
                        for (var i = 0; i < list.length; i++)
                            DataManager.addDownloaded(list[i]);                        
                            DataManager.addWatched(list[i]);
                    }

                    fs.readFile(path.join(remote.app.getPath('appData'), 'liveme-toolkit', 'viewed.json'), 'utf8', function (err,data) {
                        if (err) {
                            $('#wait').hide();

                            $('#stage4').animate({ opacity: 0.0 }, TRANSITION_TIME);
                            $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   
                        } else {
                            var list = JSON.parse(data);
                            for (var i = 0; i < list.length; i++)
                                DataManager.addViewed(list[i][1]);

                        }

                        $('#wait').hide();

                        $('#stage4').animate({ opacity: 0.0 }, TRANSITION_TIME);
                        $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);   

                    });  
                });                
            }
        });
    } else {
        $('#wait').hide();

        $('#stage4').animate({ opacity: 0.0 }, TRANSITION_TIME);
        $('#stage5').animate({ opacity: 1.0 }, TRANSITION_TIME);           
    }

}

function goStage6() {

    $('#stage5').animate({ opacity: 0.0 }, TRANSITION_TIME);
    $('#stage6').animate({ opacity: 1.0 }, TRANSITION_TIME);           

    tempvar.list = DataManager.getAllBookmarks();
    tempvar.index = 0;
    tempvar.max = tempvar.list.length;

    setTimeout(function(){
        processBookmarksThread();
    }, TRANSITION_TIME);

}





function processBookmarksThread() {

    setTimeout(function(){

        if (tempvar.index == tempvar.max) {
            DataManager.enableWrites();
            DataManager.saveToDisk();
            ipcRenderer.send('show-main'); 
            
            window.close();
        } else {
            setTimeout(function() { processBookmarksThread(); }, TRANSITION_TIME);
        }

        $('#progressbar div').css({ width: ((tempvar.index / tempvar.max) * 100) + '%' });

        if (tempvar.index < tempvar.max) { tempvar.index++; _updateBookmark(tempvar.index); }
        if (tempvar.index < tempvar.max) { tempvar.index++; _updateBookmark(tempvar.index); }
        if (tempvar.index < tempvar.max) { tempvar.index++; _updateBookmark(tempvar.index); }
        if (tempvar.index < tempvar.max) { tempvar.index++; _updateBookmark(tempvar.index); }
        if (tempvar.index < tempvar.max) { tempvar.index++; _updateBookmark(tempvar.index); }

    }, 200);
}

function _updateBookmark(i) {

    if (tempvar.list[i] == undefined) return;

    LiveMe.getUserInfo(tempvar.list[i].uid).then(user => {

        if (user == undefined) return;

        var b = DataManager.getSingleBookmark(user.user_info.uid);

        b.counts.replays = user.count_info.video_count;
        b.counts.friends = user.count_info.friends_count;
        b.counts.followers = user.count_info.follower_count;
        b.counts.followings = user.count_info.following_count;

        b.signature = user.user_info.usign;
        b.sex = user.user_info.sex;
        b.face = user.user_info.face;
        b.nickname = user.user_info.uname;
        b.shortid = user.user_info.short_id;

        DataManager.updateBookmark(b);

    });

}
