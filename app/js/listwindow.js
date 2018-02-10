/*

*/
const   { ipcRenderer, remote, clipboard } = require('electron'), 
        LiveMe = remote.getGlobal('LiveMe'), 
        appSettings = require('electron-settings'),
        DataManager = remote.getGlobal('DataManager');

var     winType = 0, userid = '', userinfo, max_count = 0, current_page = 1, scroll_busy = false, MAX_PAGE_SIZE = 10;

$(function(){
    var u = window.location.href, q = u.split('?')[1].split('&');

    userid = q[1];
    winType = parseInt(q[0]);

    LiveMe.getUserInfo(userid).then(user => { 
        max_count = winType > 0 ? user.count_info.following_count: user.count_info.follower_count;

        $('header h1').html(user.user_info.uname + (winType == 0 ? ' Fans' : ' Followings')); 
    });

    setTimeout(function(){ $('main').show(); }, 250);
    current_page = 1;
    switch (winType) {
        case 1:   // Followers/Fans
            doFollowings();
            break;

        case 0:   // Followings
            doFans();
            break;

    }

    $('main').scroll(function() {
        if (($(this).scrollTop() + $(this).height()) > ($('table').height() - 128)) {

            if (has_more == false) return;
            if (scroll_busy == true) return;

            scroll_busy = true;
            current_page++;

            if (winType == 1) {
                doFollowings();
            } else {
                doFans();
            }
        }
    });

});

function copyToClipboard(i) { clipboard.writeText(i); }
function closeWindow() { window.close(); }

/*
    Since dynamic loading is used, search will only work on what is already downloaded
    so it won't work for most people now.

function enterOnSearch(e) { if (e.keyCode == 13) beginSearch(); } 
function beginSearch() {
    var q = $('#search-query').val();

    var f = $('tr:contains(\''+q+'\')');
    console.log(f);
    if (f != null) {
        $('main').animate({
            scrollTop: f.offset().top - f.height()
        }, 400);
    }
}
*/

function doFollowings() {
    LiveMe.getFollowing(userid, current_page, MAX_PAGE_SIZE).then(results => {
        for(var i = 0; i < results.length; i++) {
            addEntry(results[i]);
        }
        
        setTimeout(function(){ scroll_busy = false; }, 250);        

        has_more = results.length >= MAX_PAGE_SIZE;
        $('footer h1').html($('table.fflist tbody tr').length + ' of ' + max_count + ' accounts loaded, scroll for more.');

        if (has_more && ($('table.fflist tbody tr').length < (MAX_PAGE_SIZE * 2))) {
            current_page++;
            doFollowings();
        }
    });


}

function doFans() {
    LiveMe.getFans(userid, current_page, MAX_PAGE_SIZE).then(results => {
        for(var i = 0; i < results.length; i++) {
            addEntry(results[i]);
        }

        setTimeout(function(){ scroll_busy = false; }, 250);        

        has_more = results.length >= MAX_PAGE_SIZE;
        $('footer h1').html($('table.fflist tbody tr').length + ' of ' + max_count + ' accounts loaded, scroll for more.');

        if (has_more && ($('table.fflist tbody tr').length < (MAX_PAGE_SIZE * 2))) {
            current_page++;
            doFans();
        }
    });
}

function addEntry(entry) {
    var prettydate = require('pretty-date');
    var sex = entry.sex < 0 ? '' : (entry.sex == 0 ? 'female' : 'male'), 
        seenRaw = DataManager.wasProfileViewed(entry.uid),
        seenDate = seenRaw != false ? prettydate.format(seenRaw) : 'never',
        seen = seenRaw != false ? 'bright blue' : 'dim',
        bookmarked = DataManager.isBookmarked(entry) ? 'star-full bright yellow' : 'star-empty dim';

    $("table.fflist tbody").append(`
                    <tr id="entry-${entry.uid}" class="entry-${entry.uid}">
                        <td width="64">
                            <img src="${entry.face}" style="height: 64px; width: 64px;" onError="$(this).hide()" align="bottom">
                        </td>
                        <td width="90%">
                            <div class="seen" title="Last seen ${seenDate}"><i class="icon icon-eye ${seen}"></i></div>
                            <div class="bookmarked"><i class="icon icon-${bookmarked}"></i></div>
                            <h1>${entry.nickname}</h1>
                            <div id="user-${entry.uid}" class="countrylevel" data-seen="Last seen ${seenDate}">
                            </div>
                            <div id="user-${entry.uid}-buttons" class="buttons">
                                <a class="button mini view" onClick="showUser('${entry.uid}')">View Account</a>
                                <a class="button mini fans" onClick="showFollowers('${entry.uid}')"></a>
                                <a class="button mini following" onClick="showFollowing('${entry.uid}')">0</a>
                            </div>
                        </td>
                    </tr>

    `);

    LiveMe.getUserInfo(entry.uid).then(user => {

        if ((user.count_info.replay_count < 1) && (appSettings.get('general.hide_zeroreplay_followings') == true) && (winType == 1)) {
            $('#entry-' + user.user_info.uid).hide();
        } else if ((user.count_info.replay_count < 1) && (appSettings.get('general.hide_zeroreplay_fans') == true) && (winType == 0)) {
            $('#entry-' + user.user_info.uid).hide();
        } else {
            var ds = $('#user-' + user.user_info.uid).attr('data-seen'), seen = ds.indexOf('never') > -1 ? '' : ds;
            $('#user-' + user.user_info.uid).html(`
                                    <div class="cell" style="width: 125px;">
                                        ${user.user_info.countryCode}&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;<b>Level:</b> ${user.user_info.level}
                                    </div>
                                    <div class="cell" style="width: 160px; text-align: right;">
                                        ${seen}
                                    </div>
                                    <br>
                                    <div class="cell" style="width: 125px;">
                                        Short ID: <a onClick="copyToClipboard('${user.user_info.short_id}')" title="Click to copy to clipboard.">${user.user_info.short_id}</a>
                                    </div>
                                    <div class="cell" style="width: 160px; text-align: right;">
                                        ID: <a onClick="copyToClipboard('${user.user_info.uid}')" title="Click to copy to clipboard.">${user.user_info.uid}</a>
                                    </div>

            `);

            $('#entry-' + user.user_info.uid).addClass('entry-' + user.user_info.short_id);
            $('#user-' + user.user_info.uid + '-buttons a.view').html(user.count_info.replay_count + ' Replays');
            $('#user-' + user.user_info.uid + '-buttons a.fans').html(user.count_info.follower_count + ' Fans');
            $('#user-' + user.user_info.uid + '-buttons a.following').html('Following ' + user.count_info.following_count);
        }
    });

    /*
        <div class="item small clickable" onClick="getVideos('${entry.uid}')" id="${entry.uid}">
            <div class="avatar">
                <img src="${entry.face}" class="${sex}" onerror="this.src='images/blank.png'">
            </div>
            <div class="content">
                <div class="header">${entry.nickname}</div>
                <div class="meta">
                    <div>Country: ${entry.countryCode} &nbsp;&nbsp;- </div>
                    <div>Level: ${entry.level} </div>

                </div>
            </div>
        </div>
    */
}

function showFollowing(u) { ipcRenderer.send('open-followings-window', { userid: u }); }
function showFollowers(u) { ipcRenderer.send('open-followers-window', { userid: u }); }
function showUser(u) { 
    $('#entry-'+u).animate({ opacity: 0.3 }, 200); ipcRenderer.send('show-user', { userid: u }); 
}
