/*

*/
const   { ipcRenderer, remote, clipboard } = require('electron'),
        LiveMe = remote.getGlobal('LiveMe'),
        appSettings = require('electron-settings'),
        formatDuration = require('format-duration'),
        DataManager = remote.getGlobal('DataManager');

$(function(){
    $('main').show();
    setTimeout(function(){
        redrawList();
    }, 400);
});

function minimizeWindow() { remote.BrowserWindow.getFocusedWindow().minimize(); }
function closeWindow() { window.close(); }
function showUser(u) { ipcRenderer.send('show-user', { userid: u }); }

function redrawList() {
    var videoid = window.location.href.split('?')[1];

    LiveMe.getVideoInfo(videoid)
        .then(video => {

            var username = video.uname;
            var startTime = video.vtime * 1000;

            $('main').show();

            LiveMe.getChatHistoryForVideo(video.msgfile)
                .then(raw => {
                    var t = raw.data.split('\n'), messages = [];
                    for (var i = 0; i < t.length - 1; i++) {
                        try {

                            var j = JSON.parse(t[i]), timeStamp = formatDuration(parseInt(j.timestamp) - startTime);

                            if (j.objectName == 'app:joinchatroommsgcontent') {
                            } else if (j.objectName == 'app:leavechatrrommsgcontent') {
                            } else if (j.objectName == 'app:praisemsgcontent') {
                            } else if (j.objectName == 'RC:TxtMsg') {
                                $('main').append(`
                                    <div class="entry">
                                        <div class="time">${timeStamp}</div>
                                        <div class="user"><a onClick="showUser('${j.content.user.id}')">${j.content.user.name}</a></div>
                                        <div class="content">
                                            ${j.content.content}
                                        </div>
                                    </div>
                                `);
                            }
                        } catch(err) {
                            // Caught
                            console.log(err);
                        }
                    }
                });
        });
}
