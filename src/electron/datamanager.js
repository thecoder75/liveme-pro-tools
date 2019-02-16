const events = require('events')
const path = require('path')
const fs = require('fs')
const { app, dialog, shell } = require('electron')
const appSettings = require("electron-settings");

let bookmarks = []
let profiles = []
let downloaded = []
let watched = []
let ignored_temp = []
let ignored_forever = []
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

function tryParseJSON(strData, filePath) {
    let obj = []

    // If the raw data is less than 8 bytes, we return a null array list instead
    if (strData.length < 8) {
        return obj
    }

    try {
        obj = JSON.parse(strData)
    } catch(error) {
        canWrite = false
        handleConfigFileError(error, filePath)
        app.quit()
    }
    return obj
}

function handleConfigFileError(error, filePath) {
    let btn1, btn2

    do {
        btn1 = dialog.showMessageBox({
            type: 'error',
            title: `Unable to read ${path.basename(filePath)}`,
            message: `File '${path.basename(filePath)}' appears to be corrupt!\n\n` +
                     'In order to avoid data loss, the program will abort now.\n' +
                     'If you need help, screenshot this error and show it to someone in our Discord group:\n',
            detail: `File: ${filePath}\n${error.name}: ${error.message}`,
            buttons: ['Open Discord group', 'Reset file (DANGEROUS!)', 'Close'],
            cancelId: 2,
            defaultId: 0,
        })

        switch(btn1) {
            case 0:
                shell.openExternal('https://discord.gg/A5p2aF4')
                break
            case 1:
                btn2 = dialog.showMessageBox({
                    type: 'warning',
                    title: 'Are you really sure?',
                    message: `Reset ${path.basename(filePath)} for good?`,
                    detail: 'This will replace the current file by a new (empty) one.\n' +
                            'Be sure to backup your data before proceeding, this action is IRREVERSIBLE!',
                    buttons: ['YES, reset it', 'NO, go back'],
                    calcelId: 1,
                    defaultId: 1,
                })
                break
            default:
                break
        }
        if (btn2 === 0) {
            fs.writeFileSync(filePath, '[]')
            dialog.showMessageBox({
                type: 'info',
                title: 'Success',
                message: `File ${path.basename(filePath)} was reset.`,
                detail: 'If no more errors appear after you close this window, '+
                        'you will have to re-open the program manually.',
                buttons: ['OK']
            })
            break
        }
    } while (btn1 === 0 || (btn1 === 1 && btn2 === 1))
}

class DataManager {
    constructor() {
        this.events = new(events.EventEmitter)()
    }

    disableWrites() {
        canWrite = false
    }
    enableWrites() {
        canWrite = true
    }

    wipeAllData() {
        bookmarks = []
        profiles = []
        downloaded = []
        watched = []
        ignored_temp = []
        ignored_forever = []
        errored = []
        queued = []

        fs.writeFileSync(bookmarksJson, '[]')
        fs.writeFileSync(profilesJson, '[]')
        fs.writeFileSync(downloadedJson, '[]')
        fs.writeFileSync(watchedJson, '[]')
        fs.writeFileSync(ignoredJson, '[]')
        fs.writeFileSync(erroredJson, '[]')
        fs.writeFileSync(queuedJson, '[]')
    }

    getStats() {
        return {
            bookmarks: bookmarks.length,
            profiles: profiles.length,
            downloaded: downloaded.length,
            watched: watched.length
        }
    }

    loadFromDisk() {
        if (fs.existsSync(bookmarksJson)) {
            fs.readFile(bookmarksJson, 'utf8', function(err, data) {
                if (err) {
                    bookmarks = []
                } else {
                    bookmarks = tryParseJSON(data, bookmarksJson)
                    if (bookmarks.length == 0) return

                    for (let i = 0; i < bookmarks.length; i++) {
                        if ('lamd' in bookmarks[i]) {
                            if ('monitored' in bookmarks[i].lamd) {
                                bookmarks[i].lamd.monitor = bookmarks[i].lamd.monitored
                                delete bookmarks[i].lamd.monitored
                            }
                        } else {
                            bookmarks[i].lamd = {
                                monitor: false,
                                last_checked: 0
                            }
                        }
                        bookmarks[i].newest_replay = parseInt(bookmarks[i].newest_replay)
                    }

                    fs.writeFileSync(bookmarksJson, JSON.stringify(bookmarks, null, 2))
                }
            })
        }
        if (fs.existsSync(profilesJson)) {
            fs.readFile(profilesJson, 'utf8', function(err, data) {
                if (err) {
                    profiles = []
                } else {
                    profiles = tryParseJSON(data, profilesJson)
                }
            })
        }
        if (fs.existsSync(downloadedJson)) {
            fs.readFile(downloadedJson, 'utf8', function(err, data) {
                if (err) {
                    downloaded = []
                } else {
                    downloaded = tryParseJSON(data, downloadedJson)
                }
            })
        }
        if (fs.existsSync(watchedJson)) {
            fs.readFile(watchedJson, 'utf8', function(err, data) {
                if (err) {
                    watched = []
                } else {
                    watched = tryParseJSON(data, watchedJson)
                }
            })
        }
        if (fs.existsSync(ignoredJson)) {
            fs.readFile(ignoredJson, 'utf8', function(err, data) {
                if (err) {
                    ignored_forever = []
                } else {
                    ignored_forever = tryParseJSON(data, ignoredJson)
                }
            })
        } else {
            migrateBlacklist()
        }
        if (fs.existsSync(erroredJson)) {
            fs.readFile(erroredJson, 'utf8', function(err, data) {
                if (err) {
                    errored = []
                } else {
                    errored = tryParseJSON(data, erroredJson)
                }
            })
        }
        if (fs.existsSync(queuedJson)) {
            fs.readFile(queuedJson, 'utf8', function(err, data) {
                if (err) {
                    queued = []
                } else {
                    queued = tryParseJSON(data, queuedJson)
                }
            })
        }
    }



    saveToDisk() {
        if (isBusy === true) return
        if (canWrite === false) return

        fs.writeFileSync(bookmarksJson, JSON.stringify(bookmarks, null, 2))
        fs.writeFileSync(profilesJson, JSON.stringify(profiles, null, 2))
        fs.writeFileSync(downloadedJson, JSON.stringify(downloaded, null, 2))
        fs.writeFileSync(watchedJson, JSON.stringify(watched, null, 2))
        fs.writeFileSync(ignoredJson, JSON.stringify(ignored_forever, null, 2))
        fs.writeFileSync(erroredJson, JSON.stringify(errored, null, 2))
        fs.writeFileSync(queuedJson, JSON.stringify(queued, null, 2))
    }

    forceSave() {
        fs.writeFileSync(bookmarksJson, JSON.stringify(bookmarks, null, 2))
        fs.writeFileSync(profilesJson, JSON.stringify(profiles, null, 2))
        fs.writeFileSync(downloadedJson, JSON.stringify(downloaded, null, 2))
        fs.writeFileSync(watchedJson, JSON.stringify(watched, null, 2))
        fs.writeFileSync(ignoredJson, JSON.stringify(ignored_forever, null, 2))
        fs.writeFileSync(erroredJson, JSON.stringify(errored, null, 2))
        fs.writeFileSync(queuedJson, JSON.stringify(queued, null, 2))
    }

    /**
     * Track Downloaded Replays
     */
    addDownloaded(vidid) {
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
    wasDownloaded(vidid) {
        var ret = false
        for (var i = 0; i < downloaded.length; i++) {
            if (downloaded[i].videoid === vidid) ret = new Date(downloaded[i].dt * 1000)
        }
        return ret
    }


    /**
     * Ignore Accounts
     */
    addIgnoredForever(uid) {
        isBusy = true

        let add = true
        for (let i = 0; i < ignored_forever.length; i++) {
            if (ignored_forever[i] == uid) {
                add = false
            }
            if (!add) break
        }
        if (add) ignored_forever.push(uid)
        fs.writeFileSync(ignoredJson, JSON.stringify(ignored_forever, null, 2))

        isBusy = false
    }

    addIgnoredSession(userid) {
        isBusy = true

        let add = true
        for (let i = 0; i < ignored_temp.length; i++) {
            if (ignored_temp[i] == uid) {
                for (let j = 0; j < ignored_forever.length; j++) {
                    if (ignored_forever[j] == uid) {
                        ignored_forever.splice(j, 1)
                    }
                    if (!add) break
                }
                add = false
            }
            if (!add) break
        }
        if (add) ignored_temp.push(uid)

        isBusy = false
    }

    isIgnored(userid) {
        let ret = false
        for (let i = 0; i < ignored_forever; i++) {
            if (ignored_forever[i] == uid) {
                ret = true
                break
            }
        }
        if (!ret) {
            for (let i = 0; i < ignored_temp; i++) {
                if (ignored_temp[i] == uid) {
                    ret = true
                    break
                }
            }    
        }    
        return ret    
    }




    /**
     * Track Watched Replays
     */
    addWatched(vidid) {
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

    wasWatched(vidid) {
        var ret = false
        for (var i = 0; i < watched.length; i++) {
            if (watched[i].videoid === vidid) ret = new Date(watched[i].dt * 1000)
        }
        return ret
    }

    dropWatched(oldestDate, dryRun) {
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
            fs.writeFileSync(watchedJson, JSON.stringify(watched), () => {})
        }
        return ret
    }

    /**
     * Track Viewed Profiles
     */
    addViewed(userid) {
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

    wasProfileViewed(userid) {
        let ret = false
        for (var i = 0; i < profiles.length; i++) {
            if (profiles[i].userid === userid) ret = new Date(profiles[i].dt * 1000)
        }
        return ret
    }

    unviewProfiles(oldestDate, dryRun) {
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
            fs.writeFileSync(profilesJson, JSON.stringify(profiles), () => {})
        }
        return ret
    }

    /**
     * Account Bookmarks
     */
    addBookmark(user) {
        isBusy = true

        let bookmarks_new = []
        if (fs.existsSync(bookmarksJson)) {
            bookmarks_new = JSON.parse(fs.readFileSync(bookmarksJson))
        }

        let add = true
        for (let i = 0; i < bookmarks_new.length; i++) {
            if (bookmarks_new[i].uid === user.uid) add = false
        }
        if (add === true) {
            if ('lamd' in user) {
                // User record is in current format
            } else {
                user.monitor = false
                user.last_checked = 0
            }

            bookmarks_new.push(user)
        }
        fs.writeFileSync(bookmarksJson, JSON.stringify(bookmarks_new, null, 2))
        bookmarks = bookmarks_new
        isBusy = false
    }

    removeBookmark(user) {
        isBusy = true
        let bookmarks_new = []
        if (fs.existsSync(bookmarksJson)) {
            bookmarks_new = JSON.parse(fs.readFileSync(bookmarksJson))
        }

        for (let i = 0; i < bookmarks_new.length; i++) {
            if (bookmarks_new[i].uid === user.uid) {
                bookmarks_new.splice(i, 1)
            }
        }
        fs.writeFileSync(bookmarksJson, JSON.stringify(bookmarks_new, null, 2))
        bookmarks = bookmarks_new
        isBusy = false
    }

    updateBookmark(user) {
        isBusy = true
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === user.uid) {
                bookmarks[i] = user
                break
            }
        }
        isBusy = false
    }

    isBookmarked(user) {
        let ret = false
        for (let i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid === user.uid) {
                ret = true
                break
            }
        }
        return ret
    }

    getAllBookmarks() {
        if (fs.existsSync(bookmarksJson)) {
            bookmarks = JSON.parse(fs.readFileSync(bookmarksJson))
        }
        return bookmarks
    }

    getSingleBookmark(userid) {
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
    addToQueueList(vid) {
        isBusy = true
        let add = true
        for (let i = 0; i < queued.length; i++) {
            if (queued[i] === vid) add = false
        }
        if (add === true) {
            queued.push(vid)
        }
        fs.writeFileSync(queuedJson, JSON.stringify(queued), () => {})
        isBusy = false
    }
    removeFromQueueList(vid) {
        isBusy = true
        for (let i = 0; i < queued.length; i++) {
            if (queued[i] === vid) {
                queued.splice(i, 1)
            }
        }
        fs.writeFileSync(queuedJson, JSON.stringify(queued), () => {})
        isBusy = false
    }


    /**
     * Queued
     */
    addToErroredList(vid) {
        isBusy = true
        let add = true
        for (let i = 0; i < errored.length; i++) {
            if (errored[i] === vid) add = false
        }
        if (add === true) {
            errored.push(vid)
        }
        fs.writeFileSync(erroredJson, JSON.stringify(errored), () => {})
        isBusy = false
    }
}

exports.DataManager = DataManager
