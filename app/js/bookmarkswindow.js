
const   { ipcRenderer, remote, clipboard } = require('electron'), 
        LiveMe = remote.getGlobal('LiveMe'), 
        appSettings = require('electron-settings'),
        prettydate = require('pretty-date'),
        DataManager = remote.getGlobal('DataManager');

$(function(){
    $('main').show();
    setTimeout(function(){
        redrawList();
    }, 400);
});

function closeWindow() { window.close(); }
function copyToClipboard(i) { clipboard.writeText(i); }
function showFollowing(u) { ipcRenderer.send('open-followings-window', { userid: u }); }
function showFollowers(u) { ipcRenderer.send('open-followers-window', { userid: u }); }
function showUser(u) { ipcRenderer.send('show-user', { userid: u }); }

function redrawList() {
    var list = DataManager.getAllBookmarks();

    $('#bookmark-list').html('');
    $('footer h1').html('Reloading list...');

    for (i = 0; i < list.length; i++) {
        var d1 = prettydate.format(new Date(list[i].newest_replay * 1000));
        var d2 = prettydate.format(new Date(list[i].last_viewed * 1000));
        var isNew = list[i].newest_replay > list[i].last_viewed ? 'new' : '';

        $('#bookmark-list').append(`
                    <tr id="entry-${list[i].uid}" data-viewed="${list[i].last_viewed}">
                        <td width="64">
                            <img src="${list[i].face}" style="height: 64px; width: 64px;" onError="$(this).hide()" align="bottom">
                        </td>
                        <td width="90%" class="main ${isNew}">
                            <div class="flag">NEW</div>
                            <h1>${list[i].nickname}</h1>
                            <h3><span>Latest Replay:</span> ${d1}</h3>
                            <h4><span>Last Viewed:</span> ${d2}</h4>
                            <div id="user-${list[i].uid}-buttons" class="buttons">
                                <a class="button mini view" onClick="showUser('${list[i].uid}')">${list[i].counts.replays} replays</a>
                                <a class="button mini fans" onClick="showFollowers('${list[i].uid}')">${list[i].counts.followers} Fans</a>
                                <a class="button mini following" onClick="showFollowing('${list[i].uid}')">Following ${list[i].counts.followings}</a>
                            </div>
                        </td>

                    </tr>
        `);
    
        LiveMe.getUserReplays(list[i].uid, 1, 10).then(replays => {

            if (replays == undefined) return;
            if (replays.length < 1) return;

            var count = 0, userid = replays[0].userid, d = $('#entry-'+userid).attr('data-viewed');
            for (i = 0; i < replays.length; i++) {
                if (replays[i].vtime - d > 0) count++;
            }


            if (count > 0) {
                $('#entry-' + userid + ' td.main').addClass('new');

                console.log(JSON.stringify(replays[0], null, 2));

                var bookmark = DataManager.getSingleBookmark(userid);
                bookmark.newest_replay = Math.floor(replays[0].vtime / 1000);
                DataManager.updateBookmark(bookmark);

            }


        });


    }
    $('footer h1').html(list.length + ' bookmarks listed.');


}

/*

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


*/