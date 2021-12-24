/*

Filename: start.js
Description: Handle startup of the app and the first window code to allow selection of desired action(s)

*/

const { ipcRenderer, shell, clipboard } = require('electron')

function showDownloads() { ipcRenderer.send('show-download-window') }
function showOptions() { ipcRenderer.send('show-options-window') }

function setupIPCListeners() {
    ipcRenderer.on('render-user-list', (event, arg) => {
        renderResults(arg)
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
    $('#stype').attr('disabled','disabled');
    $('#sdata').attr('disabled','disabled');

    $('#results-list').html('')
    $('#results-list').data('list').items = []

    switch($('#search-type').val()) {
        case 'byname':
            ipcRenderer.send('search-username', { q: $('#search-query').val(), p: 1 })
            break

    }

}

function renderResults(e) {

    $('#search-busy .cell-12').html('&nbsp;')
    $('#search-busy').hide()
    $('#search-form').show()
    $('#search-results').show()
    $('h2.title').html('Results')

    for (var i = 0; i < e.list.length; i++) {
        $('#results-list').data('list').items.push(
`
            <li style="display: inline-block; width: 180px; margin: 8px" class="account">
                <figure class="">
                    <div class="img-container thumbnail">
                        <img class="face" src="${e.list[i].face}" alt="${e.list[i].nickname}" onError="$(this).attr('src','images/nouser.png')">
                    </div>
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

    if ((e.hasmore) && (e.page < 2)) {
        setTimeout(function(){
            e.page++
            ipcRenderer.send('search-username', { q: e.query, p: e.page })
        }, 500)
    }

}


$(function() {
    setupIPCListeners();
    $('#main-title').html('Search')


    setTimeout(function(){
        $('#main-title').focus()
    }, 250)

})
