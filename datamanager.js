/*
*/

const   events = require('events'),
        path = require('path'),
        fs = require('fs'),
        { app } = require('electron'),
        LiveMeAPI = require('liveme-api');

var     bookmarks = [], profiles = [], downloaded = [], watched = [], errored = [], queued = [], is_busy = false, can_write = true;

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
        errored = [];
        queued = [];

        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), '[]', function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), '[]', function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), '[]', function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), '[]', function(){ });

        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'errored.json'), '[]', function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), '[]', function(){ });

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
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), 'utf8', function (err,data) {
                if (err) {
                    bookmarks = [];
                } else {
                    bookmarks = JSON.parse(data);
                }
            });
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'profiles.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), 'utf8', function (err,data) {
                if (err) {
                    profiles = [];
                } else {
                    profiles = JSON.parse(data);
                }
            });
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), 'utf8', function (err,data) {
                if (err) {
                    downloaded = [];
                } else {
                    downloaded = JSON.parse(data);
                }
            });
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'watched.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), 'utf8', function (err,data) {
                if (err) {
                    watched = [];
                } else {
                    watched = JSON.parse(data);
                }
            });
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'errored.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'errored.json'), 'utf8', function (err,data) {
                if (err) {
                    errored = [];
                } else {
                    errored = JSON.parse(data);
                }
            });
        }
        if (fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'queued.json'))) {
            fs.readFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), 'utf8', function (err,data) {
                if (err) {
                    queued = [];
                } else {
                    queued = JSON.parse(data);
                }
            });
        }

    }
    saveToDisk() {
        if (is_busy == true) return;
        if (can_write == false) return;

        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'bookmarks.json'), JSON.stringify(bookmarks, null, 2), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), JSON.stringify(profiles), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'downloaded.json'), JSON.stringify(downloaded), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), JSON.stringify(watched), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'errored.json'), JSON.stringify(errored), function(){ });
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), JSON.stringify(queued), function(){ });
    }



	/*
	 * 		Track Downloaded Replays
	 */
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


	/*
	 *		Track Watched Replays
	 */
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
	dropWatched(oldest_date, dry_run) {
		if (dry_run == null) dry_run = false;
		var ret = 0, temp = [];
		for (var i = 0; i < watched.length; i++) {
			if (watched[i].dt > oldest_date) {
				temp.push(watched[i]);
				ret++;
			}
		}
		if (!dry_run) {
			watched = temp;
			fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'watched.json'), JSON.stringify(watched), function(){ });
		}
		return ret;
	}


	/*
	 *		Track Viewed Profiles
	 */
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

	unviewProfiles(oldest_date, dry_run) {
		if (dry_run == null) dry_run = false;

		console.log('Old Viewed Profiles Count: ' + profiles.length);

		var ret = 0, temp = [];
		for (var i = 0; i < profiles.length; i++) {
			if (profiles[i].dt > oldest_date) {
				temp.push(profiles[i]);
				ret++;
			}
		}
		if (!dry_run) {
			profiles = temp;
			 fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'profiles.json'), JSON.stringify(profiles), function(){ });
		}
		console.log('New Viewed Profiles Count: ' + temp.length);
		return ret;
	}


	/*
	 *		Account Bookmarks
	 */
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


    /*
     *      Queued
     */
    addToQueueList(vid) {
        is_busy = true;
        var add = true;
        for (var i = 0; i < queued.length; i++) {
            if (queued[i] == vid) add = false;
        }
        if (add == true) {
            queued.push(vid);
        }
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), JSON.stringify(queued), function(){ });
        is_busy = false;
    }
    removeFromQueueList(vid) {
        is_busy = true;
        for (var i = 0; i < queued.length; i++) {
            if (queued[i] == vid) {
                queued.splice(i, 1);
            }
        }
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'queued.json'), JSON.stringify(queued), function(){ });
        is_busy = false;
    }


    /*
     *      Queued
     */
    addToErroredList(vid) {
        is_busy = true;
        var add = true;
        for (var i = 0; i < errored.length; i++) {
            if (errored[i] == vid) add = false;
        }
        if (add == true) {
            errored.push(vid);
        }
        fs.writeFile(path.join(app.getPath('appData'), app.getName(), 'errored.json'), JSON.stringify(errored), function(){ });
        is_busy = false;
    }
}



exports.DataManager = DataManager;
