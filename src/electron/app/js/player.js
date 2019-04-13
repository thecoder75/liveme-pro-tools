const { ipcRenderer, remote } = require('electron'),
    LiveMe = remote.getGlobal('LiveMe')
    isDev = require('electron-is-dev')
    prettydate = require('pretty-date')

// Globals
var hlsPlayer, flvPlayer, videoInfo, playerOptions, currentStream, title,
    video, plyr, isSeeking, lastSeek

title = $('#title')[0]
video = $('#video')[0]

// Plyr options are available here:
// https://github.com/sampotts/plyr/tree/v3.5.3#options
plyr = new Plyr(video, {
    // Warning: Too noisy
    // debug: isDev,
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
    controls: [
        'restart',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'settings',
        'fullscreen'
    ],
    tooltips: {
        controls: true,
        seek: true
    },
    seekTime: 1
})

// Display player controls whenever the user is seeking the video, so that
// they can see the video timestamps
plyr.on('seeking', () => {
    isSeeking = true
    plyr.config.hideControls = false
    plyr.toggleControls(true)
    lastSeek = Date.now()
})
// Check each half second if user has manually seeked the video, then
// hides the player controls after 2 to 2.5 seconds
setInterval(() => {
    if (isSeeking && (Date.now() - lastSeek) >= 2000) {
        plyr.config.hideControls = true
        plyr.toggleControls(false)
        isSeeking = false
    }
}, 500)

flvjs.LoggingControl.enableDebug = isDev

setupShortcuts()

// --- Only functions and IPC listeners below ---

ipcRenderer.on('play-video', (event, info, options) => {
    // Store some information in globals
    videoInfo = info
    playerOptions = options

    document.title = videoInfo.vid
    title.textContent = videoInfo.vid

    if (!plyr.source) {
        // Restore player's previous state and apply it to the current player
        plyr.volume = playerOptions.volume
        plyr.muted = playerOptions.muted
        plyr.on('volumechange', () => {
            playerOptions.volume = plyr.volume
            playerOptions.muted = plyr.muted
            ipcRenderer.send('save-player-options', playerOptions)
        })
    } else {
        // Destroy current player
        switch (currentStream) {
            case 'hls':
                hlsPlayer.destroy()
                break
            case 'flv':
                flvPlayer.pause()
                flvPlayer.unload()
                flvPlayer.detachMediaElement()
                flvPlayer.destroy()
                break
            default:
                break
        }
    }
    let properSource = LiveMe.pickProperVideoSource(videoInfo, true)

    if (!properSource) {
        let endedAt = new Date(LiveMe.getVideoEndDate(videoInfo))

        $('.plyr').hide()
        $('.player-msg').html('<h3>Video not found!</h3>' +
                                '<br><br>' +
                                `This live stream ended <strong>${prettydate.format(endedAt)}</strong>.<br>` +
                                'The replay might still being generated or was deleted.' +
                                '<br><br>' +
                                'Try again later, maybe?')
        $('.mid-container').show()

        return
    }
    $('.plyr').show()
    $('.mid-container').hide()

    // Set the player poster using user's cover picture
    plyr.poster = videoInfo.videocapture

    // If it's a live stream, we use the FLV source, because playback is
    // much smoother than HLS
    if (properSource.endsWith('.flv')) {
        currentStream = 'flv'
        setupFlv(properSource)
        flvPlayer.attachMediaElement(video)
        flvPlayer.load()
        // Hack to disable plyr's seek bar instead of completely hiding it
        $('.plyr__progress input[type=range]').attr('disabled', true)
    } else {
        currentStream = 'hls'
        setupHls()
        hlsPlayer.loadSource(properSource)
        hlsPlayer.attachMedia(video)
        // Re-enable seek bar
        $('.plyr__progress input[type=range]').attr('disabled', false)
    }
})

function setupHls() {
    hlsPlayer = new Hls({
        // Warning: Can be quite noisy
        // debug: isDev
    })
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        plyr.play()
        console.log('Hls.Events.MANIFEST_PARSED', data)
    })
    hlsPlayer.on(Hls.Events.MEDIA_DETACHED, (event, data) => {
        console.log('Hls.Events.MEDIA_DETACHED', data)
    })
    hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
        console.log('Hls.Events.ERROR', data)
    })
}

function setupFlv(source) {
    flvPlayer = flvjs.createPlayer({
        type: 'flv',
        isLive: true,
        url: source
    })
    flvPlayer.on(flvjs.Events.METADATA_ARRIVED, (data) => {
        plyr.play()
        console.log('flvjs.Events.METADATA_ARRIVED', data)
    })
    flvPlayer.on(flvjs.Events.ERROR, (data) => {
        console.log('flvjs.Events.ERROR', data)
    })
}

function setupShortcuts() {
    document.addEventListener('keydown', event => {
        switch (event.code) {
            case 'Comma':
                if (video.paused) video.currentTime -= 0.05
                break
            case 'Period':
                if (video.paused) video.currentTime += 0.05
                break
            case 'KeyA':
                video.currentTime -= 10
                break
            case 'KeyD':
                video.currentTime += 10
                break
            case 'ArrowRight':
                if (event.altKey) videoRotate('right')
                break
            case 'ArrowLeft':
                if (event.altKey) videoRotate('left')
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
        window.resizeTo(newHeight, newWidth + 24) // 24px is from the header
        $(video).addClass('landscape')

        if (maxRotation === -270 || maxRotation === 90) {
            $(video).addClass('landscape-right')
        } else {
            $(video).addClass('landscape-left')
        }
    } else {
        // Resize player window to perfectly match video dimensions
        // Don't need to worry about screen bounds, the browser will handle that
        // for us
        window.resizeTo(newWidth, newHeight + 24) // 24px is from the header
        $(video).removeClass('landscape landscape-left landscape-right')
    }
    video.style.transform = `rotate(${newRotation}deg)`
}

function closeWindow() {
    window.close()
}

function showUser() {
    ipcRenderer.send('show-user', {
        userid: videoInfo.userid
    })
}

function downloadReplay() {
    ipcRenderer.send('download-replay', {
        videoid: videoInfo.vid
    })
}
