const appSettings = require("electron-settings");


let blacklistForever = {}
let blacklistSession = {}

function timestamp() { return + new Date() }

class Blacklist {
    constructor() {
        blacklistForever = appSettings.get("blacklist", {});
    }

    isBlacklisted(uid) {
        return uid in blacklistForever || uid in blacklistSession;
    }

    addForever(uid) {
        // I need to safe something as value, so I chose a timestamp, maybe this information can be useful in the future. 
        blacklistForever[uid] = timestamp(); 
        appSettings.set("blacklist", blacklistForever);
    }

    addForSession(uid) {
        if(uid in blacklistForever) { // remove from forever in case user miss clicked
            delete blacklistForever[uid]
            appSettings.set("blacklist", blacklistForever);
        }
        blacklistSession[uid] = 0; 
        // We don't save blacklistSession to appSettings, so the next time the app loads,
        // those entries will not be blacklisted anymore (what we want).
    }
}

exports.Blacklist = Blacklist;
