const { electron, BrowserWindow, remote, ipcRenderer } = require('electron')
const appSettings = remote.require('electron-settings')
const LiveMe = remote.getGlobal('LiveMe')
const DataManager = remote.getGlobal('DataManager')

let bookmarksFromJson = undefined
let cachedBookmarkFeeds = undefined

const NEW_FANS = "New Fans"
const NEW_FOLLOWINGS = "New Following"
const NEW_REPLAYS = "New Replay"

$(function(){
    setTimeout(() => {
        loadBookmarkFeeds()        
    }, 100)
})

function closeWindow() { window.close() }
function showFollowing(u) { ipcRenderer.send('open-followings-window', { userid: u === undefined ? currentUser.uid : u }) }
function showFollowers(u) { ipcRenderer.send('open-followers-window', { userid: u === undefined ? currentUser.uid : u }) }
function showUser(u) { ipcRenderer.send('show-user', { userid: u }) }

function loadBookmarkFeeds() {
    if (!LiveMe.token) {
        setTimeout(() => loadBookmarkFeeds(), 500)
        $('header h1').html('Recent Activity - Waiting...')
        return;
    }

    bookmarksFromJson = DataManager.getAllBookmarks()
    if (bookmarksFromJson.length === 0)
        return

    setImmediate(() => {
        _scanThread(0)
    })
}

function clearHomeUI() {

    if (appSettings.get('general.enableShowReplays') === true) {
        $('#home #newReplaysHeader').show()
        $('#home #newreplays').show().empty()
    } else {
        $('#home #newReplaysHeader').hide()
        $('#home #newreplays').hide()
    }

    if (appSettings.get('general.enableShowFollowings') === true) {
        $('#home #newFollowingsHeader').show()
        $('#home #newfollowings').show().empty()
    } else {
        $('#home #newFollowingsHeader').hide()
        $('#home #newfollowings').hide()
    }

    if (appSettings.get('general.enableShowFans') === true) {
        $('#home #newFansHeader').show()
        $('#home #newfans').show().empty()
    } else {
        $('#home #newFansHeader').hide()
        $('#home #newfans').hide()
    }

}

function _scanThread(id) {
    setImmediate(async() => {
        if (id < bookmarksFromJson.length - 1) {
            // Iterate over bookmarks but start each recursive call with a delay.
            // Each bookmark entry scan is delayed by 50 ms.
            setTimeout(() => _scanThread(id + 1), 50)
            
            let step = Math.floor(bookmarksFromJson.length / 20);
            if (id % step == 0) $('header h1').html('Recent Activity - Scanning ('+Math.ceil((id / bookmarksFromJson.length) * 100)+'%)...')
        } else {
            // We need to save the bookmarks once the scan is complete so they're updated
            $('header h1').html('Recent Activity')
            setTimeout(() => {
                DataManager.saveToDisk()
            }, 1000)
        }

        let currentBookmarkToScan = bookmarksFromJson[id]
        let updatedBookmark = await _checkBookmark(currentBookmarkToScan, addToHome)
    })
}

function addToHome(type, bookmark) {

    let hideFollowers = appSettings.get("general.homeHideNewFollowers")
    let hideFans = appSettings.get("general.homeHideNewFans")
    let m = ''
    let c = 0
    let s = ''

    switch (type) {
        case NEW_FOLLOWINGS:
            if (bookmark.counts.new_following != 0) {
                m = bookmark.counts.new_following > 0 ? 'more' : 'less'
                c = Math.abs(bookmark.counts.new_following)
                s = c > 1 ? 's' : ''
                $('#newfollowings').append(`
                    <div class="bookmark" id="bookmark-${bookmark.uid}" onClick="showFollowing('${bookmark.uid}')">
                        <img src="${bookmark.face}" class="avatar" onError="$(this).hide()">
                        <h1>${bookmark.nickname}</h1>
                        <h3>User is following ${c} ${m} account${s} now.</h3>
                        <h2>${type}</h2>
                    </div>
                `)
            }
            break;
        case NEW_FANS:
            if (bookmark.counts.new_followers != 0) {
                m = bookmark.counts.new_followers > 0 ? 'more' : 'less'
                c = Math.abs(bookmark.counts.new_followers)
                s = c > 1 ? 's' : ''
                $('#newfans').append(`
                    <div class="bookmark" id="bookmark-${bookmark.uid}" onClick="showFollowers('${bookmark.uid}')">
                        <img src="${bookmark.face}" class="avatar" onError="$(this).hide()">
                        <h1>${bookmark.nickname}</h1>
                        <h3>User has ${c} ${m} fan${s} now.</h3>
                        <h2>${type}</h2>
                    </div>
                `)
            }
            break;
        case NEW_REPLAYS:
            s = bookmark.counts.new_replays > 1 ? 's' : ''
            $('#newreplays').append(`
                <div class="bookmark" id="bookmark-${bookmark.uid}" onClick="showUser('${bookmark.uid}')">
                    <img src="${bookmark.face}" class="avatar" onError="$(this).hide()">
                    <h1>${bookmark.nickname}</h1>
                    <h3>User has ${bookmark.counts.new_replays} new replay${s}.</h3>
                    <h2>${type}</h2>
                </div>
            `)
            break;
        default:
            break;
    }

}

async function _checkBookmark(b, dispatch) {
    let uid = b.uid
    if (uid === undefined) return
    if (!LiveMe.user) {
        return setTimeout(async() => await _checkBookmark(), 5000)
    }

    let user = await LiveMe.getUserInfo(uid)
    if (user === undefined) return

    b.changed_followings = b.counts.followings != user.count_info.following_count
    b.changed_followers = b.counts.followers != user.count_info.follower_count

    // We now store how much has changed on the counts
    b.counts.new_following = parseInt(user.count_info.following_count) - parseInt(b.counts.followings)
    b.counts.new_followers = parseInt(user.count_info.follower_count) - parseInt(b.counts.followers)
    b.counts.new_replays = parseInt(user.count_info.video_count) - parseInt(b.counts.replays)
    
    b.counts.replays = parseInt(user.count_info.video_count)
    b.counts.friends = parseInt(user.count_info.friends_count)
    b.counts.followers = parseInt(user.count_info.follower_count)
    b.counts.followings = parseInt(user.count_info.following_count)
    b.counts.changed = false        // This is used as a secondary flag for new replays

    b.signature = user.user_info.usign
    b.sex = user.user_info.sex
    b.face = user.user_info.face
    b.nickname = user.user_info.uname
    b.shortid = parseInt(user.user_info.short_id)

    DataManager.updateBookmark(b)

    if (b.changed_followings && (appSettings.get('general.enableShowFollowings') === true)) {
        dispatch(NEW_FOLLOWINGS, b)
    }

    if (b.changed_followers && (appSettings.get('general.enableShowFans') === true)) {
        dispatch(NEW_FANS, b)
    }

    if (b.counts.replays > 0) {
        let replays = await LiveMe.getUserReplays(uid, 1, 2)

        if (replays === undefined) return
        if (replays.length < 1) return

        for (let i = 0; i < replays.length; i++) {
            if (replays[i].vtime - b.newest_replay > 0) {
                b.counts.changed = true
                b.newest_replay = parseInt(replays[0].vtime)
                DataManager.updateBookmark(b)

                if (appSettings.get('general.enableShowReplays') === true) {
                    dispatch(NEW_REPLAYS, b)
                }
                break
            }
        }
    }

    return b;
}