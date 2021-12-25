/*

Filename: start.js
Description: Handle startup of the app and the first window code to allow selection of desired action(s)

*/

const { ipcRenderer, shell, clipboard } = require('electron')
let appSettings = null;

function showDownloadsWindow() { ipcRenderer.send('show-download-window') }
function showOptionsWindow() { ipcRenderer.send('show-options-window') }

function setupIPCListeners() {
    ipcRenderer.on('render-user-list', (event, arg) => {
        renderUserList(arg)
    })

    ipcRenderer.on('render-hash-list', (event, arg) => {
        renderHashList(arg)
    })


    ipcRenderer.on('render-no-results', (event, arg) => {

    })

    ipcRenderer.on('reset-search', (event, arg) => {
        resetSearch();
    })

}

function resetSearch() {
    $('#search-no-results').hide();
    $('#search-results').hide();
    $('#search-form').addClass('pt-112');
}

function executeSearch() {
    $('#search-type').attr({'disabled': 'disabled'});
    $('#search-data').attr({'disabled': 'disabled'});

    $('#results-list').html('')
    $('#results-list').data('list').items = []

    switch($('#search-type').val()) {
        case 'byname':
            ipcRenderer.send('search-username', { q: $('#search-query').val(), p: 1 })
            break

        case 'byuid':
            ipcRenderer.send('search-userid', { q: $('#search-query').val() })
            break

        case 'byvid':
            ipcRenderer.send('search-videoid', { q: $('#search-query').val() })
            break



    }

}

function showProfile(userid) {
    ipcRenderer.send('show-user-profile', {
        userid: userid
    })
}




function renderUserList(e) {

    $('#search-type').removeAttr('disabled');
    $('#search-data').removeAttr('disabled');

    $('#search-results').show()

    for (var i = 0; i < e.list.length; i++) {
        $('#results-list').data('list').items.push(
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
`
        )
    }

    $('#results-list').data('list').draw()

    if ((e.hasmore) && (e.page < (appSettings.limits.search / 20))) {
        setTimeout(function(){
            e.page++
            ipcRenderer.send('search-username', { q: e.query, p: e.page })
        }, (appSettings.speed == 'fast' ? 25 : 500))
    }

}


$(function() {
    setupIPCListeners();
    $('#main-title').html('Search')
    $('#search-query').focus()

    appSettings = ipcRenderer.sendSync('get-app-settings')

})
