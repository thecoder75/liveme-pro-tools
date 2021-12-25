/*

Filename: profile.js
Description: Handle viewport of Account Profile including replays and video playback

*/
const { ipcRenderer, shell, clipboard } = require('electron')

let page = 0
let user_id = null
let appSettings = null

function downloadReplay() { ipcRenderer.send('show-download-window') }
function watchReplay() {


}

function setupIPCListeners() {
    ipcRenderer.on('render-user-details', (event, arg) => {
        renderUserDetails(arg.user)
    })

    ipcRenderer.on('render-replay-list', (event, arg) => {
        console.log('Got request to render replay list')
        renderReplays(arg)
    })

    ipcRenderer.on('reset-search', (event, arg) => {
        resetSearch()
    })

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
            /*
            $('#replay-list').data('list').items.push(
    `
                <li style="display: inline-block; width: 180px; margin: 8px" class="account">
                    <figure class="mt-4">
                        <img class="face" src="${e.list[i].face}" alt="${e.list[i].nickname}" onError="$(this).attr('src','images/nouser.png')" onClick="showProfile('${e.list[i].user_id}')">
                        <figcaption class="nickname">${e.list[i].nickname}</figcaption>
                        <figcaption class="text-italic text-small">
                            ID: ${e.list[i].user_id}
                        </figcaption>
                        <figcaption class="row">
                            <div class="cell-7 text-small">
                                Level: <span class="text-bold level">${e.list[i].level}</span>
                            </div>
                            <div class="cell-2 text-small text-center">
                                <span class="icon mif-${e.list[i].sex}"></span>
                            </div>
                            <div class="cell-3 text-small text-center">
                                ${e.list[i].countryCode}
                            </div>
                        </figcaption>
                        <!--
                        <figcaption class="text-bold row">
                            <div class="cell-4 text-center">
                                <button class="button" onClick="">Replays</button>
                            </div>
                            <div class="cell-4 text-center">
                                <button class="button" onClick="">Fans</button>
                            </div>
                            <div class="cell-4 text-center">
                                <button class="button" onClick="">Followings</button>
                            </div>
                        </figcaption>
                        -->
                    </figure>
                </li>
            )
    `
            */
                console.log(e.list[i])


            }

        if (e.list.length > 0)
            $('#results-list').data('list').draw()

        if ((e.hasmore) && (e.page < (appSettings.limits.search / 20))) {
            setTimeout(function(){
                e.page++
                ipcRenderer.send('fetch-user-replays', { u: user_id, p: e.page })
            }, (appSettings.speed == 'fast' ? 25 : 500))
        }

}


$(function() {
    setupIPCListeners();
    const u1=window.location.href.split('?')[1]
    user_id = u1.split('=')[1]

    appSettings = ipcRenderer.sendSync('get-app-settings')

    ipcRenderer.send('fetch-user-profile', { userid: user_id })
    ipcRenderer.send('fetch-user-replays', { u: user_id, p: 1 })


})
