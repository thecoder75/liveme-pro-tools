const events = require('events')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
// const LiveMeAPI = require('liveme-api')

let bookmarks = []
let profiles = []
let downloaded = []
let watched = []
let errored = []
let queued = []
let isBusy = false
let canWrite = true

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

    wipeAllData () {
        bookmarks = []
        profiles = []
        downloaded = []
        watched = []
        errored = []
        queued = []

        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), '[]', () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), '[]', () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), '[]', () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), '[]', () => { })

        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'errored.json'), '[]', () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), '[]', () => { })
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
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), 'utf8', function (err, data) {
                if (err) {
                    bookmarks = []
                } else {
                    bookmarks = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'profiles.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), 'utf8', function (err, data) {
                if (err) {
                    profiles = []
                } else {
                    profiles = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), 'utf8', function (err, data) {
                if (err) {
                    downloaded = []
                } else {
                    downloaded = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'watched.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), 'utf8', function (err, data) {
                if (err) {
                    watched = []
                } else {
                    watched = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'errored.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'errored.json'), 'utf8', function (err, data) {
                if (err) {
                    errored = []
                } else {
                    errored = JSON.parse(data)
                }
            })
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'queued.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), 'utf8', function (err, data) {
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

        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), JSON.stringify(bookmarks, null, 2), () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), JSON.stringify(profiles), () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), JSON.stringify(downloaded), () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), JSON.stringify(watched), () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'errored.json'), JSON.stringify(errored), () => { })
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), JSON.stringify(queued), () => { })
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
            fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), JSON.stringify(watched), () => { })
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

        console.log('Old Viewed Profiles Count: ' + profiles.length)

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
            fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), JSON.stringify(profiles), () => { })
        }
        console.log('New Viewed Profiles Count: ' + temp.length)
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
            }
        }
        isBusy = false
    }

    isBookmarked (user) {
        let ret = false
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === user.uid) ret = true
        }
        return ret
    }

    getAllBookmarks () { return bookmarks }

    getSingleBookmark (userid) {
        let ret = false
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === userid) ret = bookmarks[i]
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
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), JSON.stringify(queued), () => { })
        isBusy = false
    }
    removeFromQueueList (vid) {
        isBusy = true
        for (let i = 0; i < queued.length; i++) {
            if (queued[i] === vid) {
                queued.splice(i, 1)
            }
        }
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), JSON.stringify(queued), () => { })
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
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'errored.json'), JSON.stringify(errored), () => { })
        isBusy = false
    }
}

exports.DataManager = DataManager
