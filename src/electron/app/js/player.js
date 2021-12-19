const { ipcRenderer, remote } = require('electron'),
    LiveMe = remote.getGlobal('LiveMe')
    isDev = require('electron-is-dev')
    prettydate = require('pretty-date')

// Globals
var hlsPlayer, flvPlayer, videoInfo, playerOptions, currentStream, title,
    video, plyr, isSeeking, lastSeek, messageHistory = []

title = $('#title')[0]
video = $('#video')[0]


// --- Only functions and IPC listeners below ---

// This listener will initialize everything (if necessary)
ipcRenderer.on('play-video', (event, info, options) => {
    // Store some information in globals
    let properSource = info.source
    videoInfo = info
    playerOptions = options

    LiveMe.getVideoInfo(info.videoid).then(vdata => {

        if (!video.src) {
            // Initialize player and setup shortcuts
            setupPlyr()
            setupShortcuts()
        } else {
            hlsPlayer.destroy()
        }

        if (!properSource) {

            $('.plyr').hide()
            $('.player-msg').html('<h4>Video not found or load error!</h4>' +
                                    '<br><br>' +
                                    'Try again later, maybe?')
            $('.mid-container').show()

        } else {

            $('.plyr').show()
            $('.mid-container').hide()
            plyr.poster = vdata.videocapture

            console.log(vdata)

            document.title = videoInfo.vid
            title.textContent = videoInfo.vid


            hlsPlayer = new Hls({
                // Warning: Can be quite noisy
                // debug: isDev
            })
            hlsPlayer.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                plyr.play()
            })
            hlsPlayer.on(Hls.Events.MEDIA_DETACHED, (event, data) => {

            })
            hlsPlayer.on(Hls.Events.ERROR, (event, data) => {

            })
            hlsPlayer.loadSource(properSource)
            hlsPlayer.attachMedia(video)
            // Re-enable seek bar
            $('.plyr__progress input[type=range]').attr('disabled', false)
        }
    })

})

function setupPlyr() {
    // Controls' order does matter.
    let defaultControls = []

    if (!!playerOptions.hide_restart_button === false) {
        defaultControls.push('restart')
    }
    defaultControls.push('play', 'progress', 'current-time', 'duration', 'mute', 'volume')

    if (!!playerOptions.hide_settings_button === false) {
        defaultControls.push('settings')
    }
    if (!!playerOptions.hide_fullscreen_button === false) {
        defaultControls.push('fullscreen')
    }
    // Plyr options are available here:
    // https://github.com/sampotts/plyr/tree/v3.5.3#options
    plyr = new Plyr(video, {
        // Warning: Too noisy
        debug: false,
        iconUrl: 'images/plyr.svg',
        blankVideo: 'images/blank.mp4',
        settings: [
            'speed',
            'loop'
        ],
        clickToPlay: false,
        keyboard: {
            focused: true,
            global: true
        },
        controls: defaultControls,
        tooltips: {
            controls: true,
            seek: true
        },
        seekTime: 1
    })

    // Restore previous player state
    plyr.volume = playerOptions.volume
    plyr.muted = playerOptions.muted

    plyr.on('volumechange', () => {
        playerOptions.volume = plyr.volume
        playerOptions.muted = plyr.muted
        ipcRenderer.send('save-player-options', playerOptions)
        // Lose focus of the volume slider
        $('input[data-plyr="volume"]').blur()
    })

    plyr.on('seeking', () => {
        isSeeking = true
        plyr.config.hideControls = false
        plyr.toggleControls(true)
        lastSeek = Date.now()
    })
    plyr.on('seeked', () => {
        // Lose focus of the progress bar
        $('input[data-plyr="seek"]').blur()
    })


    setInterval(() => {
        if (isSeeking && (Date.now() - lastSeek) >= 1500) {
            plyr.config.hideControls = true
            //plyr.toggleControls(false)
            isSeeking = false
        }

    }, 500)
}


function setupShortcuts() {
    document.addEventListener('keydown', event => {

        switch (event.code) {
            case 'Comma':
                if (!event.altKey && !event.ctrlKey) {
                    if (video.paused) video.currentTime -= 0.05
                }
                break
            case 'Period':
                if (!event.altKey && !event.ctrlKey) {
                    if (video.paused) video.currentTime += 0.05
                }
                break
            case 'KeyA':
                if (!event.altKey && !event.ctrlKey) {
                    video.currentTime -= 10
                }
                break
            case 'KeyD':
                if (!event.altKey && !event.ctrlKey) {
                    video.currentTime += 10
                }
                break
            case 'ArrowRight':
                if (event.altKey && !event.ctrlKey) {
                    videoRotate('right')
                }
                break
            case 'ArrowLeft':
                if (event.altKey && !event.ctrlKey) {
                    videoRotate('left')
                }
                break
        }
    })
}

function videoRotate(direction) {
    let newHeight, newWidth

    // Some glitched(?) live streams don't actually have a video track
    if (video.videoHeight === 0 || video.videoWidth === 0) {
        newHeight = window.innerHeight
        newWidth = window.innerWidth
    } else {
        newHeight = video.videoHeight
        newWidth = video.videoWidth
    }
    let transformCSS = video.style.transform
    let currentRotation = 0

    if (transformCSS) {
        currentRotation = transformCSS.match(/(-?\d+)deg/)
        currentRotation = (currentRotation === null) ? 0 : +currentRotation[1]
    }

    let degrees = 0
    switch (direction) {
        case 'left':
            degrees = -90
            break
        case 'right':
            degrees = 90
            break
        default:
            break
    }
    let newRotation = currentRotation + degrees
    let isLandscape = ([90, 270].indexOf(Math.abs(newRotation) % 360) !== -1)
    let maxRotation = newRotation % (newRotation < 0 ? -360 : 360)

    if (isLandscape) {
        if (!!playerOptions.resize_on_rotate) {
            window.resizeTo(newHeight, newWidth + 24) // 24px is from the header
        }
        $(video).addClass('landscape')

        if (maxRotation === -270 || maxRotation === 90) {
            $(video).addClass('landscape-right')
        } else {
            $(video).addClass('landscape-left')
        }
    } else {
        if (!!playerOptions.resize_on_rotate) {
            // Resize player window to perfectly match video dimensions
            // Don't need to worry about screen bounds, the browser will handle that
            // for us
            window.resizeTo(newWidth, newHeight + 24) // 24px is from the header
        }
        $(video).removeClass('landscape landscape-left landscape-right')
    }
    video.style.transform = `rotate(${newRotation}deg)`
}

function closeWindow() {
    window.close()
}

function formatDuration(i) {
    var sec = Math.floor((i / 1000) % 60),
        min = Math.floor((i / 1000) / 60),
        hour = Math.floor((i / 1000) / 3600)

    return  ((hour < 10 ? '0' : '') + hour + ':' +
            (min < 10 ? '0' : '') + min + ':' +
            (sec < 10 ? '0' : '') + sec)
}
