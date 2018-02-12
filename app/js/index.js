/*

    LiveMe Pro Tools - index.js

*/

const   MAX_PER_PAGE = 5;

const   { electron, BrowserWindow, remote, ipcRenderer, shell, dialog, clipboard } = require('electron'),
        fs = require('fs'), path = require('path'), 
        appSettings = remote.require('electron-settings'),
        LiveMe = remote.getGlobal('LiveMe'),
        DataManager = remote.getGlobal('DataManager'),
        formatDuration = require('format-duration'),
        prettydate = require('pretty-date'),
        request = require('request');

var     current_user = {}, current_page = 1, current_index = 0, tempvar = null, has_more = false, current_search = '', scroll_busy = false;


$(function(){

    document.title = 'LiveMe Pro Tools v' + remote.app.getVersion();        // Set Title of Window

    setupContextMenu();     // Set up the Context Menu for Cut/Copy/Paste on text fields
    onTypeChange();         // Init Search Field
    setupIPCListeners();    // Set up our IPC listeners
    setupLoadOnScroll();    // Setup loading more on scroll only when searching for usernames

    initSettingsPanel();
    initHome();

});

function setupContextMenu() {

    const InputMenu = remote.Menu.buildFromTemplate([{
            label: 'Undo',
            role: 'undo',
        }, {
            label: 'Redo',
            role: 'redo',
        }, {
            type: 'separator',
        }, {
            label: 'Cut',
            role: 'cut',
        }, {
            label: 'Copy',
            role: 'copy',
        }, {
            label: 'Paste',
            role: 'paste',
        }, {
            type: 'separator',
        }, {
            label: 'Select all',
            role: 'selectall',
        },
    ]);

    document.body.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();

        let node = e.target;

        while (node) {
            if (node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable) {
                InputMenu.popup(remote.getCurrentWindow());
                break;
            }
            node = node.parentNode;
        }
    }); 
}

function setupLoadOnScroll() {
    $('main').scroll(function() {
        if (($(this).scrollTop() + $(this).height()) > ($('table').height() - 80)) {
    
            if (has_more == false) return;
            if (scroll_busy == true) return;
            scroll_busy = true;

            current_page++;
            if (current_search == 'performUsernameSearch') {
                performUsernameSearch();
            } else if (current_search == 'performHashtagSearch') {
                performHashtagSearch();
            } else
                scroll_busy = false;
        }
    });
}

function setupIPCListeners() {
    ipcRenderer.on('show-user' , function(event, arg) {
        $('#search-query').val(arg.userid);
        $('#search-type').val('user-id');
        doSearch();
    });

    ipcRenderer.on('popup-message' , function(event, arg) {
        var p = $('#popup-message');
        p.html(arg.text).animate({ top: 40 }, 400).delay(3000).animate({ top: 0 - p.height() - 20 }, 400);

    });

    ipcRenderer.on('go-home' , function(event, arg) {
        goHome();
    });

    ipcRenderer.on('shutdown' , function(event, arg) {
        $('overlay').show();
        $('#status').html('Storing data and shutting down...');
    });

}



function showMainMenu() {

    const MainAppMenu = remote.Menu.buildFromTemplate(
        [
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
                        click: () => shell.openExternal('https://github.com/thecoder75/liveme-pro-tools/')
                    },
                    {
                        label: 'Report an Issue',
                        click: () => shell.openExternal('https://github.com/thecoder75/liveme-pro-tools/issues')
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
            },

        ]
    );  

    MainAppMenu.popup(
        remote.getCurrentWindow(),
        {
            x: 0,
            y: 40
        }
    )

}

function onTypeChange() {
    var t=$('#search-type').val();
    switch (t) {
        case 'user-id': 
            $('#search-query').attr('placeholder', 'User ID'); 
            break;
        case 'short-id': 
            $('#search-query').attr('placeholder', 'Short ID'); 
            break;
        case 'video-id': 
            $('#search-query').attr('placeholder', 'Video ID'); 
            break;
        case 'video-url':
            $('#search-query').attr('placeholder', 'Video URL'); 
            break;
        case 'username-like': 
            $('#search-query').attr('placeholder', 'Partial or Full Username'); 
            break;
    }
}

function enterOnSearch(e) { if (e.keyCode == 13) preSearch(); } 
function copyToClipboard(i) { clipboard.writeText(i); }
function showSettings() { $('#settings').show(); }
function hideSettings() { $('#settings').hide(); }
function closeWindow() { window.close(); }

function showProgressBar() { $('#footer-progressbar').show(); }
function hideProgressBar() {  $('#footer-progressbar').hide(); }
function setProgressBarValue(v) { $('#footer-progressbar div').css({ width: v + '%'}); }

function showUser(u) {
    $('#search-type').val('user-id');
    $('#search-query').val(u);
    $('overlay').show();

    setTimeout(function(){ preSearch(); }, 500);
}

function openBookmarks() { ipcRenderer.send('open-bookmarks'); }
function showFollowing(u) { ipcRenderer.send('open-followings-window', { userid: current_user.uid != undefined ? current_user.uid : u }); }
function showFollowers(u) { ipcRenderer.send('open-followers-window', { userid: current_user.uid != undefined ? current_user.uid : u }); }

function playVideo(vid) { ipcRenderer.send('watch-replay', { videoid: vid }); }
/* MAY BE ADDED IN FUTURE RELEASE function viewMessages(vid) { ipcRenderer.send('view-messages', { videoid: vid }); } */
function downloadVideo(vid) { 
    ipcRenderer.send('download-replay', { videoid: vid }); 
}
function openURL(u) { shell.openExternal(u); }
function readComments(u) { ipcRenderer.send('read-comments', { userid: u }); }

function goHome() { 
    $('footer').hide(); 
    $('main').hide(); 
    $('#home').show(); 
    initHome(); 
}

function preSearch(q) {
    var u=$('#search-query').val(), isnum = /^\d+$/.test(u);
    $('overlay').hide();

    if ((u.length==20) && (isnum)) {
        if ($('#search-type').val() != 'video-id') {
            $('#search-type').val('video-id');
            onTypeChange();
        }
    } else if ((u.length == 18) && (isnum)) {
        if ($('#search-type').val() != 'user-id') {
            $('#search-type').val('user-id');
            onTypeChange();
        }
    } else if (((u.length == 8) || (u.length == 9)) && (isnum)) {
        if ($('#search-type').val() != 'short-id') {
            $('#search-type').val('short-id');
            onTypeChange();
        }
    } else if (u.indexOf('http') > -1) {
        if ($('#search-type').val() != 'video-url') {
            $('#search-type').val('video-url');
            onTypeChange();
        }
    } else if (!isnum) {        
        if ($('#search-type').val() != 'username-like') {
            $('#search-type').val('username-like');
            onTypeChange();
        }
    }
    doSearch();    
}

function AddToBookmarks() {

    if (DataManager.isBookmarked(current_user) == true) {
        DataManager.removeBookmark(current_user);
        $('a.bookmark').attr('title', 'Add to Bookmarks').html('<i class="icon icon-star-empty"></i>');
    } else {
        DataManager.addBookmark(current_user);
        $('a.bookmark').attr('title', 'Remove from Bookmarks').html('<i class="icon icon-star-full bright yellow"></i>');
    }
}

function backupData() {

    ipcRenderer.send('create-backup');

    var p = $('#popup-message'), m = 'Backup file stored in your downloads.';
    p.html(m).animate({ top: 40 }, 400).delay(3000).animate({ top: 0 - p.height() - 20 }, 400);

}

function restoreData() {
    ipcRenderer.send('restore-backup');
}


function initHome() {

    $('#home div.panel').html('');

    // Check for updates
    request({
        url: 'https://raw.githubusercontent.com/thecoder75/liveme-pro-tools/master/package.json',
        method: 'get'
    }, function(err,httpResponse,body) {
        
        var ghversion = JSON.parse(body).version, lversion = remote.app.getVersion(),
            g = ghversion.split('.'), ghv = g[0]+''+g[1],
            l = lversion.split('.'), lv = l[0]+''+l[1],
            upgrade = (g[0] - l[0]) + (g[1] - l[1]);

        if (upgrade > 0) {
            $('#home div.panel').append(`
                <div class="section">
                    <h3><i class="icon icon-github"></i> Update Available</h3>
                    <p>
                        An updated release of LiveMe Pro Tools is available.
                    </p>
                    <button onClick="openURL('https://github.com/thecoder75/liveme-pro-tools/releases/')">Download</button>
                </div>
            `);
        }
    });  

    setTimeout(function(){
        request({
            url: 'https://raw.githubusercontent.com/thecoder75/liveme-pro-tools/master/feed.json',
            method: 'get'
        }, function(err,httpResponse,body) {
            var feed = JSON.parse(body);

            for (i = 0; i < feed.length; i++) {
                $('#home div.panel').append(`
                <div class="section">
                    <h4>${feed[i].title}</h4>
                    ${feed[i].body}
                </div>
                `);
            }

        });  

    }, 1000);

    $('footer h1').html('Bookmarks are now being scanned for new replays...');
    showProgressBar();

    var bookmarks = DataManager.getAllBookmarks();
    tempvar = {
        index: 0,
        max: bookmarks.length,
        list: bookmarks
    };

    $('#home #bookmarklist').html('');
    for (i = 0; i < tempvar.list.length; i++) {
        $('#home #bookmarklist').append(`
            <div class="bookmark nonew" id="bookmark-${tempvar.list[i].uid}" data-viewed="${tempvar.list[i].last_viewed}" onClick="showUser('${tempvar.list[i].uid}')">
                <img src="${tempvar.list[i].face}" class="avatar" onError="$(this).hide()">
                <h1>${tempvar.list[i].nickname}</h1>
                <h2></h2>
            </div>
        `);

    }


    setTimeout(function(){
        _homethread();
    }, 250);


}

function _homethread() {

    setTimeout(function(){

        if (tempvar.index == tempvar.max) {
            $('footer h1').html('');
            hideProgressBar();
            $('div.nonew').remove();
        } else {
            setTimeout(function() { _homethread(); }, 250);
        }

        setProgressBarValue((tempvar.index / tempvar.max) * 100);

        if (tempvar.index < tempvar.max) { tempvar.index++; _checkBookmark(tempvar.index); }
        if (tempvar.index < tempvar.max) { tempvar.index++; _checkBookmark(tempvar.index); }
        if (tempvar.index < tempvar.max) { tempvar.index++; _checkBookmark(tempvar.index); }
        if (tempvar.index < tempvar.max) { tempvar.index++; _checkBookmark(tempvar.index); }

    }, 250);
}

function _checkBookmark(i) {

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

        if (b.counts.replays > 0) {
            LiveMe.getUserReplays(tempvar.list[i].uid, 1, 2).then(replays => {

                if (replays == undefined) return;
                if (replays.length < 1) return;

                var count = 0, userid = replays[0].userid, d = $('#bookmark-'+userid).attr('data-viewed');
                for (i = 0; i < replays.length; i++) {
                    if (replays[i].vtime - d > 0) count++;
                }

                if (count > 0) {
                    $('#bookmark-' + userid + ' h2').html('NEW');
                    $('#bookmark-' + userid).show().removeClass('nonew');

                    var bookmark = DataManager.getSingleBookmark(userid);
                    bookmark.newest_replay = Math.floor(replays[0].vtime);
                    DataManager.updateBookmark(bookmark);

                }

            });
        }

    });        

}


function doSearch() {
    var query = '',
        userid = '',
        q = $('#search-query').val();

    if (q.length < 1) return;

    $('#user-details').hide();
    $('main').hide().removeClass('has-panel');
    $('#status').show().html('Performing LiveMe Search...');

    $('#home').hide();

    current_page = 1;
    $('#list tbody').html('');
    
    switch($('#search-type').val()) {
        case 'video-url':
            var t = q.split('/');
            if (q.indexOf('/live/') > -1) {
                query = q[3];
                performVideoLookup(query);
            } else if (q[q.length-1].indexof('yolo') > -1) {
                var a=q[q.length-1].split('-');
                $('#search-query').val(a[1]);
                $('#search-type').val('video-id');
                query=a[1];
                performVideoLookup(query);
            } else if (q.indexOf('videoid') > -1) {
                var a=t[t.length-1].split('?'),b=a[1].split('&');
                for(i=0;i<b.length;i++) {
                    if(b[i].indexOf('videoid') > -1) {
                        var c=b[i].split('=');
                        query=c[1];
                        $('#search-query').val(c[1]);
                        $('#search-type').val('video-id');
                    }
                }
                performVideoLookup(query);
            } else if (q.indexOf('userid') > -1) {
                var a=t[t.length-1].split('?'),b=a[1].split('&');
                for(i=0;i<b.length;i++) {
                    if(b[i].indexOf('userid') > -1) {
                        var c=b[i].split('=');
                        query=c[1];
                        $('#search-query').val(c[1]);
                        $('#search-type').val('user-id');
                    }
                }
                performUserLookup(query);
            }
            break;

        case 'video-id':
            performVideoLookup($('#search-query').val());
            break;

        case 'user-id':
            performUserLookup($('#search-query').val());
            break;

        case 'short-id':
            performShortIDSearch();
            break;

        case 'username-like':
            $('main').show().removeClass('has-details');
            $('.details').hide();
            $('#list thead').html('');
            performUsernameSearch();
            break;
    }
}

function performShortIDSearch() {
    LiveMe.performSearch($('#search-query').val(), 1, 1, 1).then(results => {
        if (results.length > 0) {
            performUserLookup(results[0].user_id);
        }
    });
}

function performVideoLookup(q) {
    LiveMe.getVideoInfo(q)
        .then(video => {
            if (video.videosource.length < 1) {
                $('#status').html('Video not found or was deleted from the servers.');
                $('overlay').hide();
                $('main').hide();
            } else {
                _addReplayEntry(video, true);
                performUserLookup(video.userid);
            }
        }).catch( err => {
            $('#status').html('Video not found or was deleted from the servers.');
            $('overlay').hide();
            $('main').hide();
        });
}

function performUserLookup(uid) {

    LiveMe.getUserInfo(uid)
        .then(user => {

            var bookmark = DataManager.getSingleBookmark(user.user_info.uid);
            if (bookmark != false) {
                bookmark.last_viewed = Math.floor(new Date().getTime() / 1000);
                DataManager.updateBookmark(bookmark);
            } else {
                DataManager.addViewed(user.user_info.uid);
            }

            $('#list thead').html(`
                    <tr>
                        <th width="410">Title</th>
                        <th width="120">Date</th>
                        <th width="50" align="right">Length</th>
                        <th width="70" align="right">Views</th>
                        <th width="70" align="right">Likes</th>
                        <th width="70" align="right">Shares</th>
                        <th width="210">Actions</th>
                    </tr>
            `);    

            var sex = user.user_info.sex < 0 ? '' : (user.user_info.sex == 0 ? 'female' : 'male');
            $('#user-details').show();

            $('img.avatar').attr('src', user.user_info.face)
            $('#user-details div.info h1 span').html(user.user_info.uname);
            $('#user-details div.info h2.id').html('<span>ID:</span> '+user.user_info.uid+' <a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard(\''+user.user_info.uid+'\')"><i class="icon icon-copy"></i></a>');
            $('#user-details div.info h2.shortid').html('<span>Short ID:</span> '+user.user_info.short_id+' <a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard(\''+user.user_info.uid+'\')"><i class="icon icon-copy"></i></a>');
            $('#user-details div.info h2.level').html('<span>Level:</span><b>'+user.user_info.level+'</b>');
            $('#user-details div.info h4').html(user.user_info.countryCode);
            
            if (DataManager.isBookmarked(user.user_info) == true) {
                $('#user-details a.bookmark').attr('title','Remove from Bookmarks').html('<i class="icon icon-star-full bright yellow"></i>');
            } else {
                $('#user-details a.bookmark').attr('title','Add to Bookmarks').html('<i class="icon icon-star-empty"></i>');
            }

            $('#user-details div.info a.following').html('Following ' + user.count_info.following_count);
            $('#user-details div.info a.followers').html(user.count_info.follower_count + ' Followers');

            setTimeout(function(){
                $('#status').hide();
                $('overlay').hide();
                $('main').show();
            }, 250);
            current_page = 1;

            current_user = {
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
                    followings: user.count_info.following_count,
                },
                last_viewed: Math.floor((new Date()).getTime() / 1000),
                newest_replay: 0
            };

            getUsersReplays();
            showProgressBar();
        }).catch(error => {
            $('#status').html('Account no longer available.');
        })

}

function getUsersReplays() {

    LiveMe.getUserReplays(current_user.uid, current_page, MAX_PER_PAGE)
        .then(replays => {

            if ((typeof replays == 'undefined') || (replays == null)) {
                if (current_page == 1) {
                    $('footer h1').html('No publicly listed replays available.');
                    hideProgressBar();
                }
                return;
            }
            if (replays.length > 0) {
                if (replays[0].uid == current_user.userid) {

                    for (var i = 0; i < replays.length; i++) {
                        _addReplayEntry(replays[i], false);
                    }   
                }
            } 

            $('table tbody tr').not('.user-'+current_user.uid).remove();

            $('footer h1').html($('#list tbody tr').length + ' visible of ' + current_user.counts.replays + ' total replays loaded.');
            setProgressBarValue(($('#list tbody tr').length / current_user.counts.replays) * 100);
            has_more = replays.length == MAX_PER_PAGE;

            current_search = 'getUsersReplays';

            if (has_more == true) {
                setTimeout(function(){
                    current_page++;
                    getUsersReplays();
                }, 500);
            } else {
                var c = $('#list tbody tr td.highlight').length, d = $('#list tbody tr').length;
                if (c.length == 0) {
                    $('#list table tbody tr.unlisted').removeClass('unlisted');
                } else {
                    $('#list table tbody tr.unlisted').remove();
                    $('footer h1').html($('#list tbody tr').length + ' visible of ' + current_user.counts.replays + ' total replays loaded.');   
                }
                if (d == 0) $('footer h1').html('No publicly listed replays available.');

                hideProgressBar();
            }

        });
        
}

function _addReplayEntry(replay, wasSearched) {

    if (replay.userid != current_user.uid) return;

    if (replay.vtime > current_user.newest_replay) current_user.newest_replay = replay.vtime;

    let dt = new Date(replay.vtime * 1000);
    var ds = (dt.getMonth() + 1) + '-' + dt.getDate() + '-' + dt.getFullYear() + ' ' + (dt.getHours() < 10 ? '0' : '') + dt.getHours() + ':' + (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes();
    var highlight = $('#search-type').val() == 'video-id' ? ($('#search-query').val() == replay.vid ? 'highlight' : '') : '';

    var length = formatDuration(parseInt(replay.videolength) * 1000);
    var searched = wasSearched ? 'unlisted' : '', unlisted = searched ? '[UNLISTED]' : '';

    var downloadDate = DataManager.wasDownloaded(replay.vid), watchDate = DataManager.wasWatched(replay.vid);
    var downloaded = downloadDate == false ? '<i class="icon icon-floppy-disk dim"></i>' : '<i class="icon icon-floppy-disk bright blue" title="Downloaded '+prettydate.format(downloadDate)+'"></i>';
    var watched = watchDate == false ? '<i class="icon icon-eye dim"></i>' : '<i class="icon icon-eye bright green" title="Last watched '+prettydate.format(watchDate)+'"></i>';
    var seen = watchDate == false ? '' : 'watched';

    var isLive = replay.hlsvideosource.endsWith('flv') || replay.hlsvideosource.indexOf('liveplay') > 0 ? '[LIVE]' : '';

    var h = `
                    <tr data-id="${replay.vid}" class="${searched} ${seen} user-${replay.userid}">
                        <td width="410" class="${highlight}">${watched}&nbsp;&nbsp;${downloaded}&nbsp;&nbsp;&nbsp;${unlisted}${isLive}${replay.title}</td>
                        <td width="120" class="${highlight}" align="center">${ds}</td>
                        <td width="50" class="${highlight}" align="right">${length}</td>
                        <td width="70" class="${highlight}" align="right">${replay.playnumber}</td>
                        <td width="70" class="${highlight}" align="right">${replay.likenum}</td>
                        <td width="70" class="${highlight}" align="right">${replay.sharenum}</td>
                        <td width="210" class="${highlight}" style="padding: 0 16px; text-align: right;">
                            <a class="button mini icon-small" onClick="copyToClipboard('${replay.vid}')" style="font-size: 10pt;" title="Copy ID to Clipboard">ID</a>
                            &nbsp;&nbsp;
                            <a class="button mini icon-small" onClick="copyToClipboard('${replay.hlsvideosource}')" href="#" style="font-size: 10pt;" title="Copy URL to Clipboard">URL</a>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                            <a class="button icon-only" onClick="playVideo('${replay.vid}')" title="Watch Replay"><i class="icon icon-play"></i></a>&nbsp;&nbsp;
                            <a class="button icon-only" onClick="readComments('${replay.vid}')" title="Read Comments"><i class="icon icon-bubbles3"></i></a>&nbsp;&nbsp;
                            <a class="button icon-only" onClick="downloadVideo('${replay.vid}')" title="Download Replay"><i class="icon icon-download"></i></a>
                        </td>
                    </tr>
    `;
    $('#list tbody').append(h);

    /*
        MAY BE ADDED IN FUTURE RELEASE
        <a class="button icon-only" onClick="viewMessages('${replay.vid}')" title="View Message History"><i class="icon icon-bubbles"></i></a>&nbsp;&nbsp;
    */

}

function performUsernameSearch() {
    LiveMe.performSearch($('#search-query').val(), current_page, MAX_PER_PAGE, 1)
        .then(results => {
            
            current_search = 'performUsernameSearch';
            has_more = results.length >= MAX_PER_PAGE;
            setTimeout(function(){ scroll_busy = false; }, 250);

            for(var i = 0; i < results.length; i++) {

                var bookmarked = DataManager.isBookmarked(results[i].user_id) ? '<i class="icon icon-star-full bright yellow"></i>' : '<i class="icon icon-star-full dim"></i>';
                var viewed = DataManager.wasProfileViewed(results[i].user_id) ? 
                    '<i class="icon icon-eye bright blue" title="Last viewed '+prettydate.format(DataManager.wasProfileViewed(results[i].user_id))+'"></i>' : 
                    '<i class="icon icon-eye dim"></i>';
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
                    `);

                LiveMe.getUserInfo(results[i].user_id)
                    .then(user => {
                        if (user == undefined) return;
                        if (user == null) return;

                        $('#user-'+user.user_info.uid+' td.details a.replays').html(`${user.count_info.video_count} Replays`);
                        $('#user-'+user.user_info.uid+' td.details a.followings').html(`Following ${user.count_info.following_count}`);
                        $('#user-'+user.user_info.uid+' td.details a.followers').html(`${user.count_info.follower_count} Fans`);

                        $('#user-'+user.user_info.uid+' td.details h5.userid').html(`ID: <span>${user.user_info.uid}<a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard('${user.user_info.uid}')"><i class="icon icon-copy"></i></a></span>`);
                        $('#user-'+user.user_info.uid+' td.details h5.shortid').html(`Short ID: <span>${user.user_info.short_id}<a class="button icon-only" title="Copy to Clipboard" onClick="copyToClipboard('${user.user_info.short_id}')"><i class="icon icon-copy"></i></a></span>`);

                        $('#user-'+user.user_info.uid+' td.details h5.level').html(`Level: <span>${user.user_info.level}</span>`);
                        $('#user-'+user.user_info.uid+' td.details h5.country').html(`${user.user_info.countryCode}`);
                    });

                $('footer h1').html($('#list tbody tr').length + ' accounts found so far, scroll down to load more.');
            }

            if (results.length == 0 && current_page == 1) {
                $('#status').html('No users were found searching for ' + $('#search-query').val()).show();
            } else {
                $('#status').hide();
            }

        }); 
}


function initSettingsPanel() {
    $('#viewmode-followers').prop('checked', appSettings.get('general.hide_zeroreplay_fans'));
    $('#viewmode-followings').prop('checked', appSettings.get('general.hide_zeroreplay_followings'));

    $('#playerpath').val(appSettings.get('general.playerpath'));
    $('#download-handler').val(appSettings.get('downloads.handler'));

    var v = remote.app.getVersion().split('.')[2];
    $('#settings h6#version').html('Version ' + v);
}

function saveSettings() {       

    appSettings.set('general.hide_zeroreplay_fans', ($('#viewmode-followers').is(':checked') ? true : false) )
    appSettings.set('general.hide_zeroreplay_followings', ($('#viewmode-followings').is(':checked') ? true : false) )

    appSettings.set('general.playerpath', $('#playerpath').val());    
    appSettings.set('downloads.handler', $('#download-handler').val());    
}

function resetSettings() {
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

    DataManager.wipeAllData();

}
