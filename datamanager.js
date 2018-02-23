/*
*/

const   events = require('events'),
        path = require('path'),
        fs = require('fs'),
        { app } = require('electron'),
        LiveMeAPI = require('liveme-api');

var     bookmarks = [], profiles = [], downloaded = [], watched = [], is_busy = false, can_write = true;

class DataManager {

    constructor() {
		this.events = new (events.EventEmitter)();
	}

    disableWrites() { can_write = false; }
    enableWrites() { can_write = true; }

    wipeAllData() {
        bookmarks = [];
        profiles = [];
        downloaded = [];
        watched = [];
        
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), JSON.stringify(bookmarks), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), JSON.stringify(profiles), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), JSON.stringify(downloaded), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), JSON.stringify(watched), function(){ });        
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
        fs.readFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), 'utf8', function (err,data) {
            if (err) {
                bookmarks = [];
            } else {
                bookmarks = JSON.parse(data);
            }
        });
        fs.readFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), 'utf8', function (err,data) {
            if (err) {
                profiles = [];
            } else {
                profiles = JSON.parse(data);
            }
        });
        fs.readFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), 'utf8', function (err,data) {
            if (err) {
                downloaded = [];
            } else {
                downloaded = JSON.parse(data);
            }
        });
        fs.readFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), 'utf8', function (err,data) {
            if (err) {
                watched = [];
            } else {
                watched = JSON.parse(data);
            }
        });
        
    }
    saveToDisk() {
        if (is_busy == true) return;
        if (can_write == false) return;

        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), JSON.stringify(bookmarks), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), JSON.stringify(profiles), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), JSON.stringify(downloaded), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), JSON.stringify(watched), function(){ });
    }





    addDownloaded(vidid) {
        is_busy = true;
        var add = true, dt = new Date();
        for (var i = 0; i < downloaded.length; i++) {
            if (downloaded[i].videoid == vidid) {
                downloaded[i].dt = Math.floor(dt.getTime() / 1000);
                add =false;
            }
        }
        if (add) {
            downloaded.push({
                dt: Math.floor(dt.getTime() / 1000),
                videoid: vidid
            });
        }
        is_busy = false;
    }
    wasDownloaded(vidid) {
        var ret = false;
        for (var i = 0; i < downloaded.length; i++) {
            if (downloaded[i].videoid == vidid) ret = new Date(downloaded[i].dt * 1000);
        }
        return ret;
    }





    addWatched(vidid) {
        is_busy = true;
        var add = true, dt = new Date();
        for (var i = 0; i < watched.length; i++) {
            if (watched[i].videoid == vidid) { 
                watched[i].dt = Math.floor(dt.getTime() / 1000);
                add =false;
            }
        }
        if (add) {
            watched.push({
                dt: Math.floor(dt.getTime() / 1000),
                videoid: vidid
            });
        }
        is_busy = false;
    }
    wasWatched(vidid) {
        var ret = false;
        for (var i = 0; i < watched.length; i++) {
            if (watched[i].videoid == vidid) ret = new Date(watched[i].dt * 1000);
        }
        return ret;
    }




    addViewed(userid) {
        is_busy = true;
        var add = true, dt = new Date();
        for (var i = 0; i < profiles.length; i++) {
            if (profiles[i].userid == userid) { 
                profiles[i].dt = Math.floor(dt.getTime() / 1000);
                add =false;
            }
        }
        if (add) {
            profiles.push({
                dt: Math.floor(dt.getTime() / 1000),
                userid: userid
            });
        }
        is_busy = false;
    }
    wasProfileViewed(userid) {
        var ret = false;
        for (var i = 0; i < profiles.length; i++) {
            if (profiles[i].userid == userid) ret = new Date(profiles[i].dt * 1000);
        }
        return ret;
    }




    addBookmark(user) {
        is_busy = true;
        var add = true;
        for (var i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid == user.uid) add = false;
        }
        if (add == true) {
            bookmarks.push(user);
        }
        is_busy = false;
    }

    removeBookmark(user) {
        is_busy = true;
        for (var i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid == user.uid) {
                bookmarks.splice(i, 1);
            }
        }
        is_busy = false;
    }

    updateBookmark(user) {
        is_busy = true;
        var add = true;
        for (var i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid == user.uid) {
                bookmarks[i] = user;
            }
        }
        is_busy = false;
    }

    isBookmarked(user) {
        var ret = false;
        for (var i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid == user.uid) ret = true;
        }
        return ret;
    }

    getAllBookmarks() { return bookmarks; }

    getSingleBookmark(userid) {
        var ret = false;
        for (var i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].uid == userid) ret = bookmarks[i];
        }
        return ret;
    }

}



exports.DataManager = DataManager;
