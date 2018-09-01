/* global $ */
const { ipcRenderer, remote, clipboard } = require('electron')
const LiveMe = remote.getGlobal('LiveMe')
const appSettings = require('electron-settings')
const formatDuration = require('format-duration')
const DataManager = remote.getGlobal('DataManager')

$(function () {
    $('main').show()
    setTimeout(() => {
        redrawList()
    }, 400)
})

function minimizeWindow () { remote.BrowserWindow.getFocusedWindow().minimize() }
function closeWindow () { window.close() }
function showUser (u) { ipcRenderer.send('show-user', { userid: u }) }

function redrawList () {
    let videoid = window.location.href.split('?')[1]

    LiveMe.getVideoInfo(videoid)
        .then(video => {
            let username = video.uname
            let startTime = video.vtime * 1000

            $('main').show()

            LiveMe.getChatHistoryForVideo(video.msgfile)
                .then(raw => {
                    let t = raw.split('\n')
                    let messages = []
                    for (let i = 0; i < t.length - 1; i++) {
                        try {
                            let j = JSON.parse(t[i])
                            let timeStamp = formatDuration(parseInt(j.timestamp) - startTime)

                            if (j.objectName === 'app:joinchatroommsgcontent') {
                            } else if (j.objectName === 'app:leavechatrrommsgcontent') {
                            } else if (j.objectName === 'app:praisemsgcontent') {
                            } else if (j.objectName === 'RC:TxtMsg') {
                                $('main').append(`
                                    <div class="entry">
                                        <div class="time">${timeStamp}</div>
                                        <div class="user"><a onClick="showUser('${j.content.user.id}')">${j.content.user.name}</a></div>
                                        <div class="content">
                                            ${j.content.content}
                                        </div>
                                    </div>
                                `)
                            }
                        } catch (err) {
                            // Caught
                            console.log(err)
                        }
                    }
                })
        })
}
