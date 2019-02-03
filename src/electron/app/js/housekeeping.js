const { ipcRenderer, remote, clipboard } = require('electron')
const LiveMe = remote.getGlobal('LiveMe')
const appSettings = require('electron-settings')
const prettydate = require('pretty-date')
const DataManager = remote.getGlobal('DataManager')

let list = []
let pList = []


function closeWindow() { window.close() }

function prescanBookmarks() {
    list = DataManager.getAllBookmarks()

    let count = 0
    pList = []
    
    for(let i = 0; i < list.length; i++) {
        let d_now = Math.floor((new Date()).getTime() / 1000) - ($('#bm1').val() * 86400)
        let f = (d_now - list[i].newest_replay)
    
        if (f > 0) {
            pList.push(list[i])
            count++
        }
    }

    let confirmBM = remote.dialog.showMessageBox({
        type: 'warning',
        title: 'Confirm Bookmark Purge',
        message: `${count} bookmarks flagged for removal.`,
        detail: 'By continuing the bookmarks that are flagged for removal will\n' +
                'be removed from the bookmark file.',
        buttons: ['Continue', 'Nevermind'],
        calcelId: 1,
        defaultId: 1,
    })

    if (confirmBM === 0) {
        for (let j = 0; j < pList.length; j++) {
            DataManager.removeBookmark(pList[j])
        }
    }    
}

function prescanBookmarksNR() {
    list = DataManager.getAllBookmarks()

    let count = 0
    pList = []
    
    for(let i = 0; i < list.length; i++) {
        if (list[i].counts.replays == 0) {
            pList.push(list[i])
            count++
        }
    }

    let confirmBM = remote.dialog.showMessageBox({
        type: 'warning',
        title: 'Confirm Bookmark Purge',
        message: `${count} bookmarks flagged for removal.`,
        detail: 'By continuing the bookmarks that are flagged for removal will\n' +
                'be removed from the bookmark file.',
        buttons: ['Continue', 'Nevermind'],
        calcelId: 1,
        defaultId: 1,
    })

    if (confirmBM === 0) {
        for (let j = 0; j < pList.length; j++) {
            DataManager.removeBookmark(pList[j])
        }
    }    
}

