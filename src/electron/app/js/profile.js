/*

Filename: profile.js
Description: Handle viewport of Account Profile including replays and video playback

*/
const { ipcRenderer, shell, clipboard } = require('electron')

let page = 0
let user_id = null
let appSettings = null
let hlsPlayer = null

let replays = new Array()


function setupIPCListeners() {
    ipcRenderer.on('render-user-details', (event, arg) => {
        renderUserDetails(arg.user)
    })

    ipcRenderer.on('render-replay-list', (event, arg) => {
        renderReplays(arg)
    })

    ipcRenderer.on('reset-search', (event, arg) => {
        resetSearch()
    })

}

function sendDownloadRequest(video_id) {


}

function watchReplay(video_id) {
    let url = replays[video_id].hlsvideosource ? replays[video_id].hlsvideosource : replays[video_id].videosource

    if(Hls.isSupported()) {
        var video = document.getElementById('videoplayer');
        var hlsPlayer = new Hls();
        hlsPlayer.loadSource(url);
        hlsPlayer.attachMedia(video);
        hlsPlayer.on(Hls.Events.MANIFEST_PARSED,function() {
            video.play();
        });
    }

}

function renderUserDetails(arg) {
    $('#user_face').attr('src', arg.face)
    $('#user-header h3').html(arg.nickname)
    $('#user-header h5').html(arg.signature)
    $('#fan_count').html(arg.counts.followers)
    $('#following_count').html(arg.counts.followings)

    $('#user_id').html(arg.user_id)
    $('#short_id').html(arg.short_id)
    $('#user_level').html(arg.level)
    $('#short_id').html(arg.short_id)

}

function renderReplays(e) {

    for (var i = 0; i < e.list.length; i++) {
        let rdt = new Date(e.list[i].vtime * 1000)
        let rds = (rdt.getMonth() + 1) + '-' + rdt.getDate() + '-' + rdt.getFullYear() + ' at ' + (rdt.getHours() < 10 ? '0' : '') + rdt.getHours() + ':' + (rdt.getMinutes() < 10 ? '0' : '') + rdt.getMinutes()

        replays[e.list[i].vid] = e.list[i]

        $('#replay-list ').data('table').addItem([
            `<img src="${e.list[i].videocapture}" style="width: 64px; height: 64px; border-radius: 32px">`,
            '<span class="title-'+e.list[i].vid+'">'+e.list[i].title+'</span><br><small class="fg-gray">Published on ' + rds + '</small>',
            formatDuration(e.list[i].videolength * 1000),
            e.list[i].watchnumber,
            e.list[i].likenum,
            e.list[i].sharenum,
            `<button class="button button-small" title="Download Replay" onClick="sendDownloadRequest('${e.list[i].vid}')"><span class="mif-download"></span></button> <button class="button button-small" title="Watch Replay" onClick="watchReplay('${e.list[i].vid}')"><span class="mif-play"></span></button>`
        ])
    }

    if ((e.hasmore) && (e.page < (appSettings.limits.search / 20))) {
        setTimeout(function(){
            e.page++
            ipcRenderer.send('fetch-user-replays', { u: user_id, p: e.page })
        }, (appSettings.speed == 'fast' ? 100 : 1000))
    }

}


function formatDuration(i) {
    var sec = Math.floor((i / 1000) % 60),
        min = Math.floor((i / 1000) / 60) % 60,
        hour = Math.floor((i / 1000) / 3600)

    return  ((hour < 10 ? '0' : '') + hour + ':' +
            (min < 10 ? '0' : '') + min + ':' +
            (sec < 10 ? '0' : '') + sec)
}


$(function() {
    setupIPCListeners();

    const u1=window.location.href.split('?')[1]
    user_id = u1.split('=')[1]

    appSettings = ipcRenderer.sendSync('get-app-settings')

    ipcRenderer.send('fetch-user-profile', { userid: user_id })
    ipcRenderer.send('fetch-user-replays', { u: user_id, p: 1 })

    setTimeout(function(){
        // Override video width
        $('.video-player').outerHeight(640)
    }, 50)

})
