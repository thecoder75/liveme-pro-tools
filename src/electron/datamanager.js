const events = require('events')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const appSettings = require("electron-settings");

let bookmarks = []
let profiles = []
let downloaded = []
let watched = []
let ignored_temp = {}
let ignored_forever = {}
let errored = []
let queued = []
let isBusy = false
let canWrite = true

const bookmarksJson = path.join(app.getPath('appData'), app.getName(), 'bookmarks.json')
const profilesJson = path.join(app.getPath('appData'), app.getName(), 'profiles.json')
const downloadedJson = path.join(app.getPath('appData'), app.getName(), 'downloaded.json')
const watchedJson = path.join(app.getPath('appData'), app.getName(), 'watched.json')
const ignoredJson = path.join(app.getPath('appData'), app.getName(), 'ignored.json')
const erroredJson = path.join(app.getPath('appData'), app.getName(), 'errored.json')
const queuedJson = path.join(app.getPath('appData'), app.getName(), 'queued.json')


function timestamp() { return + new Date() }

function migrateBlacklist() { 
    try {
        if(fs.existsSync(ignoredJson)){
            return
        }

        let blacklist = appSettings.get("blacklist", {});
        ignored_forever = blacklist
        fs.writeFileSync(ignoredJson, JSON.stringify(ignored_forever), () => { })
        // if something throws, we don't delete so it will be redone next start
        appSettings.delete("blacklist")

    } catch (error) {
        
    }
}

class DataManager {
    constructor () {
        this.events = new (events.EventEmitter)()
    }

    disableWrites () {
        canWrite = false
    }
    enableWrites () {
        canWrite = true
    }

    getAppDataFolder() {
        return path.join(app.getPath('appData'), app.getName())
    }

    wipeAllData () {
        bookmarks = []
        profiles = []
        downloaded = []
        watched = []
        ignored_temp = {}
        ignored_forever = {}
        errored = []
        queued = []

        fs.writeFileSync(bookmarksJson, '[]', () => { })
        fs.writeFileSync(profilesJson, '[]', () => { })
        fs.writeFileSync(downloadedJson, '[]', () => { })
        fs.writeFileSync(watchedJson, '[]', () => { })
        fs.writeFileSync(ignoredJson, '{}', () => { })
        fs.writeFileSync(erroredJson, '[]', () => { })
        fs.writeFileSync(queuedJson, '[]', () => { })
    }

    getStats () {
        return {
            bookmarks: bookmarks.length,
            profiles: profiles.length,
            downloaded: downloaded.length,
            watched: watched.length
        }
    }

    loadFromDisk () {
        if (fs.existsSync(bookmarksJson)) {
            fs.readFile(bookmarksJson, 'utf8', function (err, data) {
                if (err) {
                    bookmarks = []
                } else {
                    bookmarks = JSON.parse(data)

                    if (bookmarks[0].counts.changed == undefined) {
                        // Upgrade to new format

                        for (var i = 0; i < bookmarks.length; i++)
                            bookmarks[i].counts = {
                                replays: bookmarks[i].counts.replays,
                                friends: bookmarks[i].counts.friends,
                                followers: bookmarks[i].counts.followers,
                                followings: bookmarks[i].counts.followings,
                                changed: false
                            }

                        fs.writeFileSync(bookmarksJson, JSON.stringify(bookmarks, null, 2), () => { })
                    }
                }
            })
        }
        if (fs.existsSync(profilesJson)) {
            fs.readFile(profilesJson, 'utf8', function (err, data) {
                if (err) {
                    profiles = []
                } else {
                    profiles = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(downloadedJson)) {
            fs.readFile(downloadedJson, 'utf8', function (err, data) {
                if (err) {
                    downloaded = []
                } else {
                    downloaded = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(watchedJson)) {
            fs.readFile(watchedJson, 'utf8', function (err, data) {
                if (err) {
                    watched = []
                } else {
                    watched = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(ignoredJson)) {
            fs.readFile(ignoredJson, 'utf8', function (err, data) {
                if (err) {
                    ignored_forever = {}
                } else {
                    ignored_forever = JSON.parse(data)
                }
            })
        }
        else{
            migrateBlacklist()
        }
        if (fs.existsSync(erroredJson)) {
            fs.readFile(erroredJson, 'utf8', function (err, data) {
                if (err) {
                    errored = []
                } else {
                    errored = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(queuedJson)) {
            fs.readFile(queuedJson, 'utf8', function (err, data) {
                if (err) {
                    queued = []
                } else {
                    queued = JSON.parse(data)
                }
            })
        }
    }

   

    saveToDisk () {
        if (isBusy === true) return
        if (canWrite === false) return

        fs.writeFileSync(bookmarksJson, JSON.stringify(bookmarks, null, 2), () => { })
        fs.writeFileSync(profilesJson, JSON.stringify(profiles), () => { })
        fs.writeFileSync(downloadedJson, JSON.stringify(downloaded), () => { })
        fs.writeFileSync(watchedJson, JSON.stringify(watched), () => { })
        fs.writeFileSync(ignoredJson, JSON.stringify(ignored_forever), () => { })
        fs.writeFileSync(erroredJson, JSON.stringify(errored), () => { })
        fs.writeFileSync(queuedJson, JSON.stringify(queued), () => { })
    }

    /**
     * Track Downloaded Replays
     */
    addDownloaded (vidid) {
        isBusy = true
        let add = true
        let dt = new Date()
        for (var i = 0; i < downloaded.length; i++) {
            if (downloaded[i].videoid === vidid) {
                downloaded[i].dt = Math.floor(dt.getTime() / 1000)
                add = false
            }
        }
        if (add) {
            downloaded.push({
                dt: Math.floor(dt.getTime() / 1000),
                videoid: vidid
            })
        }
        isBusy = false
    }
    wasDownloaded (vidid) {
        var ret = false
        for (var i = 0; i < downloaded.length; i++) {
            if (downloaded[i].videoid === vidid) ret = new Date(downloaded[i].dt * 1000)
        }
        return ret
    }


    /**
     * Ignore Accounts
     */
    addIgnoredForever (userid) {
        isBusy = true

        ignored_forever[userid] = timestamp()

        isBusy = false
    }

    addIgnoredSession (userid) {
        isBusy = true

        if(userid in ignored_forever) { // remove from forever in case user miss clicked
            delete ignored_forever[userid]
        }
        ignored_temp[userid] = 0; 
        // We don't save ignored_temp to disk, so the next time the app loads,
        // those entries will not be ignored anymore (what we want).

        isBusy = false
    }

    isIgnored (userid) {
        return userid in ignored_forever || userid in ignored_temp;
    }




    /**
     * Track Watched Replays
     */
    addWatched (vidid) {
        isBusy = true
        let add = true
        let dt = new Date()
        for (var i = 0; i < watched.length; i++) {
            if (watched[i].videoid === vidid) {
                watched[i].dt = Math.floor(dt.getTime() / 1000)
                add = false
            }
        }
        if (add) {
            watched.push({
                dt: Math.floor(dt.getTime() / 1000),
                videoid: vidid
            })
        }
        isBusy = false
    }

    wasWatched (vidid) {
        var ret = false
        for (var i = 0; i < watched.length; i++) {
            if (watched[i].videoid === vidid) ret = new Date(watched[i].dt * 1000)
        }
        return ret
    }

    dropWatched (oldestDate, dryRun) {
        if (dryRun == null) dryRun = false

        let ret = 0
        let temp = []

        for (var i = 0; i < watched.length; i++) {
            if (watched[i].dt > oldestDate) {
                temp.push(watched[i])
                ret++
            }
        }
        if (!dryRun) {
            watched = temp
            fs.writeFileSync(watchedJson, JSON.stringify(watched), () => { })
        }
        return ret
    }

    /**
     * Track Viewed Profiles
     */
    addViewed (userid) {
        isBusy = true
        let add = true
        let dt = new Date()
        for (var i = 0; i < profiles.length; i++) {
            if (profiles[i].userid === userid) {
                profiles[i].dt = Math.floor(dt.getTime() / 1000)
                add = false
            }
        }
        if (add) {
            profiles.push({
                dt: Math.floor(dt.getTime() / 1000),
                userid: userid
            })
        }
        isBusy = false
    }

    wasProfileViewed (userid) {
        let ret = false
        for (var i = 0; i < profiles.length; i++) {
            if (profiles[i].userid === userid) ret = new Date(profiles[i].dt * 1000)
        }
        return ret
    }

    unviewProfiles (oldestDate, dryRun) {
        if (dryRun == null) dryRun = false

        let ret = 0
        let temp = []
        for (let i = 0; i < profiles.length; i++) {
            if (profiles[i].dt > oldestDate) {
                temp.push(profiles[i])
                ret++
            }
        }
        if (!dryRun) {
            profiles = temp
            fs.writeFileSync(profilesJson, JSON.stringify(profiles), () => { })
        }
        return ret
    }

    /**
     * Account Bookmarks
     */
    addBookmark (user) {
        isBusy = true
        let add = true
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === user.uid) add = false
        }
        if (add === true) {
            bookmarks.push(user)
        }
        isBusy = false
    }

    removeBookmark (user) {
        isBusy = true
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === user.uid) {
                bookmarks.splice(i, 1)
            }
        }
        isBusy = false
    }

    updateBookmark (user) {
        isBusy = true
        // let add = true
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === user.uid) {
                bookmarks[i] = user
                break
            }
        }
        isBusy = false
    }

    isBookmarked (user) {
        let ret = false
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === user.uid) {
                ret = true
                break
            }
        }
        return ret
    }

    getAllBookmarks () { return bookmarks }

    getSingleBookmark (userid) {
        let ret = false
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === userid) {
                ret = bookmarks[i]
                break
            }
        }
        return ret
    }

    /**
     * Queued
     */
    addToQueueList (vid) {
        isBusy = true
        let add = true
        for (let i = 0; i < queued.length; i++) {
            if (queued[i] === vid) add = false
        }
        if (add === true) {
            queued.push(vid)
        }
        fs.writeFileSync(queuedJson, JSON.stringify(queued), () => { })
        isBusy = false
    }
    removeFromQueueList (vid) {
        isBusy = true
        for (let i = 0; i < queued.length; i++) {
            if (queued[i] === vid) {
                queued.splice(i, 1)
            }
        }
        fs.writeFileSync(queuedJson, JSON.stringify(queued), () => { })
        isBusy = false
    }


    /**
     * Queued
     */
    addToErroredList (vid) {
        isBusy = true
        let add = true
        for (let i = 0; i < errored.length; i++) {
            if (errored[i] === vid) add = false
        }
        if (add === true) {
            errored.push(vid)
        }
        fs.writeFileSync(erroredJson, JSON.stringify(errored), () => { })
        isBusy = false
    }
}

exports.DataManager = DataManager
