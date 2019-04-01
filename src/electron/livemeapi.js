const request = require('request-promise-native')

const API = 'https://live.ksmobile.net'
const IAG = 'https://iag.ksmobile.net'
const URL = {
    login: `${IAG}/1/cgi/login`,
    appLogin: `${API}/sns/appLoginCM`,

    accessToken: `${API}/channel/signin`,
    channelLogin: `${API}/channel/login`,

    userInfo: `${API}/user/getinfo`,
    videoInfo: `${API}/live/queryinfo`,
    replayVideos: `${API}/live/getreplayvideos`,
    keywordSearch: `${API}/search/searchkeyword`,
    liveUsers: `${API}/live/newmaininfo`,
    fans: `${API}/follow/getfollowerlistship`,
    following: `${API}/follow/getfollowinglistship`,
    trendingHashtags: `${API}/search/getTags`,
    liveBoys: `${API}/live/boys`,
    liveGirls: `${API}/live/girls`,
}

class LiveMe {

    constructor(params = {}) {

        // Login details
        this.email = params.email || null
        this.password = params.password || null
        // Userdata
        this.user = null
        // Tokens
        this.tuid = null
        this.token = null
        this.accessToken = null
        this.sid = null
        this.ssoToken = null
        this.androidid = createUUID()
        this.thirdchannel = 6

        if (this.email && this.password) {
            this.getAccessTokens()
                .then(() => {
                    console.log('Authenticated with Live.me servers.')
                })
                .catch(err => {
                    console.log('Authentication failed.')
                })
        }

    }

    setAuthDetails(email, password) {
        if ( ! email || ! password) {
            return Promise.reject('You need to provide your Live.me email and password.')
        }
        this.email = email
        this.password = password

        return this.getAccessTokens()
    }

    fetch(method, params = {}, qs = {}) {
        const url = URL[method] || method
        return request(Object.assign({
            method: 'POST',
            url,
            headers: {
                d: Math.round(new Date().getTime() / 1000)
            },
            qs: Object.assign({
                vercode: 38551987,
                api: 23,
                ver: '3.8.55'
            }, qs),
            json: true,
            transform: function (body) {
                if (typeof body === 'string') body = JSON.parse(body)
                if (body.status === undefined) body.status = 200
                if (body.ret === undefined) body.ret = 1
                if (body.status != 200 || body.ret != 1) {
                    throw new Error('Request failed.')
                }
                return body.data
            }
        }, params))
    }

    getAccessTokens() {
        if ( ! this.email || ! this.password) {
            return Promise.reject('You need to provide your Live.me email and password.')
        }

        return request({
            method: 'POST',
            url: URL.login,
            headers: {
                d: Math.round(new Date().getTime() / 1000),
                sig: 'fp1bO-aJwHKoRB0jnsW4hQ6nor8',
                sid: '9469C0239535A9E579F8D20E5A4D5C3C',
                appid: '135301',
                ver: '3.8.55',
                'content-type': 'multipart/form-data; boundary=3i2ndDfv2rTHiSisAbouNdArYfORhtTPEefj3q2f',
                'user-agent': 'FBAndroidSDK.0.0.1'
            },
            body: `--3i2ndDfv2rTHiSisAbouNdArYfORhtTPEefj3q2f\r\nContent-Disposition: form-data; name="cmversion"\r\n\r\n38551987\r\n--3i2ndDfv2rTHiSisAbouNdArYfORhtTPEefj3q2f\r\nContent-Disposition: form-data; name="code"\r\n\r\n\r\n--3i2ndDfv2rTHiSisAbouNdArYfORhtTPEefj3q2f\r\nContent-Disposition: form-data; name="name"\r\n\r\n${this.email}\r\n--3i2ndDfv2rTHiSisAbouNdArYfORhtTPEefj3q2f\r\nContent-Disposition: form-data; name="extra"\r\n\r\nuserinfo\r\n--3i2ndDfv2rTHiSisAbouNdArYfORhtTPEefj3q2f\r\nContent-Disposition: form-data; name="password"\r\n\r\n${this.password}\r\n--3i2ndDfv2rTHiSisAbouNdArYfORhtTPEefj3q2f`,
            transform:  (rawBody) => {
                if (typeof rawBody === 'string') 
                {

                    let body = {}
                    try {
                        body = JSON.parse(rawBody)
                    } catch (error) {
                        throw new Error(`Either LiveMe banned the login account or your IP address, login failed.`)
                    }

                    if (body.status === undefined) body.status = 200
                    if (body.ret === undefined) body.ret = 1
                    if (body.status != 200 || body.ret != 1) {
                        throw new Error(`Request failed with PW:${this.password} and ${this.email}. Got: ${rawBody}`   )
                    }
                    return body.data
                }
                throw new Error(`Request failed with PW:${this.password} and ${this.email}. Got: ${rawBody}`   )


            }
        })
        .then(json => {
            this.sid = json.sid
            // Set SSO token
            this.ssoToken = json.sso_token
            // Pass token to login
            return json.sso_token
        })
        .then(ssoToken => {
            // Login
            return this.fetch('appLogin', {
                form: {
                    'data[email]': this.email,
                    'data[sso_token]': ssoToken,
                    sso_token: ssoToken
                }
            })
        })
        .then(json => {
            this.user = json.user
            this.tuid = json.user.user_info.uid
            this.token = json.token
            return json
        })
    }

    getUserInfo(userid) {
        if ( ! userid) {
            return Promise.reject('Invalid userid.')
        }

        return this.fetch('userInfo', {
            formData: {
                userid
            }
        })
        .then(json => {
            return json.user
        })
    }

    getVideoInfo(videoid) {
        if ( ! videoid) {
            return Promise.reject('Invalid videoid.')
        }

        if ( ! this.user) {
            return Promise.reject('Not authenticated with Live.me!')
        }

        return this.fetch('videoInfo', {
            formData: {
                videoid,
                userid: 0,
                tuid: this.tuid,
                token: this.token
            }
        })
        .then(json => {
            return json.video_info
        })
    }

    getUserReplays(userid, page_index = 1, page_size = 10) {
        if ( ! userid) {
            return Promise.reject('Invalid userid.')
        }

        if ( ! this.user) {
            return Promise.reject('Not authenticated with Live.me!')
        }

        return this.fetch('replayVideos', {
            formData: {
                userid,
                page_index,
                page_size,
                tuid: this.tuid,
                token: this.token,
                sso_token: this.ssoToken
            }
        })
        .then(json => {
            return json.video_info
        })
    }

    getChatHistoryForVideo(url) {
        return request(url)
    }

    getCommentHistoryForReplay(url) {
        return request(url)
    }

    performSearch(query = '', page = 1, pagesize = 10, type, countryCode = 'DE') {
        if ([1, 2].indexOf(type) === -1) {
            return Promise.reject('Type must be 1 or 2.')
        }
        return this.fetch('keywordSearch', {
            formData: {
               keyword: encodeURIComponent(query),
               type,
               pagesize,
               page,
               countryCode
            }
        })
        .then(json => {
            return json.data_info
        })
    }

    getLive(page_index = 1, page_size = 10, countryCode = '') {
        return this.fetch('liveUsers', {
            formData: {
                page_index,
                page_size,
                countryCode
            }
        })
            .then(json => {
                return json.video_info
            })
    }

    getFans(access_token, page_index = 1, page_size = 10) {
        if ( ! access_token) {
            return Promise.reject('Invalid access_token (userid).')
        }

        return this.fetch('fans', {
            formData: {
                access_token,
                page_index,
                page_size
            }
        })
    }

    getFollowing(access_token, page_index = 1, page_size = 10) {
        if ( ! access_token) {
            return Promise.reject('Invalid access_token (userid).')
        }

        return this.fetch('following', {
            formData: {
                access_token,
                page_index,
                page_size
            }
        })
    }

    getTrendingHashtags() {
        return this.fetch('trendingHashtags')
    }

    getLiveGirls(page_size = 10, page = 1, countryCode = '') {
        return this.fetch('liveGirls', {
            formData: {
                page,
                page_size,
                countryCode
            }
        })
    }

    getLiveBoys(page_size = 10, page = 1, countryCode = '') {
        return this.fetch('liveBoys', {
            formData: {
                page,
                page_size,
                countryCode
            }
        })
    }

    // Helper function to get the date of when a live video ended.
    //
    // @returns int: Returns an UNIX timestamp in ms OR
    //               -1 if the video is still live
    getVideoEndDate(videoInfo) {
        if (videoInfo.status == 0) {
            // Video is still live
            return -1
        }
        let endedAt = +videoInfo.vtime + (+videoInfo.videolength)

        return endedAt * 1000
    }

    // Helper function used to pick the correct video source.
    //
    // @returns string: M3U8 URL of the replay/live video OR
    //                  an empty string if the replay is being generated / was deleted
    //
    pickProperVideoSource(videoInfo) {
        let properSource

        // We should use `hlsvideosource` if it's a live video.
        // We should use `videosource` if it's a replay.
        //
        // This ensures we're always getting the URL of a M3U8 file and never of a FLV stream.
        //
        // However, `videosource` will be empty if the replay is 30+ days older.
        // That's because replays older than 30 days are marked as "Expired" in the official app
        // and can't be watched (through the app).
        //
        // Since we're not the official app, we can ignore that, because the replay URL
        // will still be available through `hlsvideosource`.
        switch (+videoInfo.status) {
            case 0:
                properSource = videoInfo.hlsvideosource
                break
            default:
                properSource = (videoInfo.videosource === '') ? '' : videoInfo.videosource
                break
        }
        return properSource
    }

}

module.exports = LiveMe

// Jibberish.
function createUUID(t) {
    var e, n, o = [], a = "0123456789abcdef";
    for (e = 0; e < 36; e++)
        o[e] = a.substr(Math.floor(16 * Math.random()), 1);
    return o[14] = "4",
    o[19] = a.substr(3 & o[19] | 8, 1),
    t ? n = o.join("").substr(0, 32) : (o[8] = o[13] = o[18] = o[23] = "-",
    n = o.join("")),
    n
}
