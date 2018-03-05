
const   { ipcRenderer, remote, clipboard } = require('electron'),
        LiveMe = remote.getGlobal('LiveMe'),
        appSettings = require('electron-settings'),
        prettydate = require('pretty-date'),
        DataManager = remote.getGlobal('DataManager');

var     list = [], index, max;

$(function(){
    $('main').show();

    list = DataManager.getAllBookmarks();
    index = 0;
    max = list.length;

    $('#bookmark-list').html('');
    $('footer h1').html(max + ' bookmarks listed.');

    setImmediate(() => {
        drawEntry();
    });

});

function minimizeWindow() { remote.BrowserWindow.getFocusedWindow().minimize(); }
function closeWindow() { window.close(); }
function copyToClipboard(i) { clipboard.writeText(i); }
function showFollowing(u) { ipcRenderer.send('open-followings-window', { userid: u }); }
function showFollowers(u) { ipcRenderer.send('open-followers-window', { userid: u }); }
function showUser(u) { ipcRenderer.send('show-user', { userid: u }); }

function redrawList() {
    index = 0;
    $('#bookmark-list').html('');
    drawEntry();
}

function drawEntry() {

    if (index == max) return;

    var d1 = prettydate.format(new Date(list[index].newest_replay * 1000));
    var d2 = prettydate.format(new Date(list[index].last_viewed * 1000));
    var isNew = list[index].newest_replay > list[index].last_viewed ? 'new' : 'not-new';

    $('#bookmark-list').append(`
                <tr id="entry-${list[index].uid}" data-viewed="${list[index].last_viewed}" class="${isNew}">
                    <td width="64">
                        <img src="${list[index].face}" style="height: 64px; width: 64px;" onError="$(this).hide()" align="bottom">
                    </td>
                    <td width="90%" class="main ${isNew}">
                        <div class="flag">NEW</div>
                        <h1>${list[index].nickname}</h1>
                        <h3><span>Latest Replay:</span> ${d1}</h3>
                        <h4><span>Last Viewed:</span> ${d2}</h4>
                        <div id="user-${list[index].uid}-buttons" class="buttons">
                            <a class="button mini view" onClick="showUser('${list[index].uid}')">${list[index].counts.replays} replays</a>
                            <a class="button mini fans" onClick="showFollowers('${list[index].uid}')">${list[index].counts.followers} Fans</a>
                            <a class="button mini following" onClick="showFollowing('${list[index].uid}')">Following ${list[index].counts.followings}</a>
                        </div>
                    </td>

                </tr>
    `);
    index++;

    setImmediate(() => { drawEntry(); });
}

function hideNonRecent() {
    $('#bookmark-list tr.not-new').toggle();
}

