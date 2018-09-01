/* global $ */

const { ipcRenderer, remote, clipboard } = require('electron')
const LiveMe = remote.getGlobal('LiveMe')
const appSettings = require('electron-settings')
const DataManager = remote.getGlobal('DataManager')

let winType = 0
let userid = ''
let userinfo
let maxCount = 0
let totalCount = 0
let currentPage = 1
let threads = 0
let scrollBusy = false
let filters = { countryCode: '', seen: true, active: false }
let MAX_PAGE_SIZE = 50

const cclist = [
    [ 'All Countries', '-' ], [ 'Afghanistan', 'AF' ], [ 'Albania', 'AL' ], [ 'Algeria', 'DZ' ], [ 'American Samoa', 'AS' ], [ 'Andorra', 'AD' ],
    [ 'Angola', 'AO' ], [ 'Anguilla', 'AI' ], [ 'Antarctica', 'AQ' ], [ 'Antigua and Barbuda', 'AG' ], [ 'Argentina', 'AR' ], [ 'Armenia', 'AM' ],
    [ 'Aruba', 'AW' ], [ 'Australia', 'AU' ], [ 'Austria', 'AT' ], [ 'Azerbaijan', 'AZ' ], [ 'Bahamas', 'BS' ], [ 'Bahrain', 'BH' ],
    [ 'Bangladesh', 'BD' ], [ 'Barbados', 'BB' ], [ 'Belarus', 'BY' ], [ 'Belgium', 'BE' ], [ 'Belize', 'BZ' ], [ 'Benin', 'BJ' ],
    [ 'Bermuda', 'BM' ], [ 'Bhutan', 'BT' ], [ 'Bolivia', 'BO' ], [ 'Bosnia-Herzegovina', 'BA' ], [ 'Botswana', 'BW' ], [ 'Bouvet Island', 'BV' ],
    [ 'Brazil', 'BR' ], [ 'British Indian Ocean Territory', 'IO' ], [ 'Brunei Darussalam', 'BN' ], [ 'Bulgaria', 'BG' ], [ 'Burkina Faso', 'BF' ], [ 'Burundi', 'BI' ],
    [ 'Cambodia', 'KH' ], [ 'Cameroon', 'CM' ], [ 'Canada', 'CA' ], [ 'Cape Verde', 'CV' ], [ 'Cayman Islands', 'KY' ], [ 'Central African Republic', 'CF' ],
    [ 'Chad', 'TD' ], [ 'Chile', 'CL' ], [ 'China', 'CN' ], [ 'Christmas Island', 'CX' ], [ 'Cocos (Keeling) Islands', 'CC' ], [ 'Colombia', 'CO' ],
    [ 'Comoros', 'KM' ], [ 'Congo', 'CG' ], [ 'Congo, Dem. Republic', 'CD' ], [ 'Cook Islands', 'CK' ], [ 'Costa Rica', 'CR' ], [ 'Croatia', 'HR' ],
    [ 'Cuba', 'CU' ], [ 'Cyprus', 'CY' ], [ 'Czech Rep.', 'CZ' ], [ 'Denmark', 'DK' ], [ 'Djibouti', 'DJ' ], [ 'Dominica', 'DM' ],
    [ 'Dominican Republic', 'DO' ], [ 'Ecuador', 'EC' ], [ 'Egypt', 'EG' ], [ 'El Salvador', 'SV' ], [ 'Equatorial Guinea', 'GQ' ], [ 'Eritrea', 'ER' ],
    [ 'Estonia', 'EE' ], [ 'Ethiopia', 'ET' ], [ 'European Union', 'EU.INT' ], [ 'Falkland Islands (Malvinas)', 'FK' ], [ 'Faroe Islands', 'FO' ], [ 'Fiji', 'FJ' ],
    [ 'Finland', 'FI' ], [ 'France', 'FR' ], [ 'French Guiana', 'GF' ], [ 'French Southern Territories', 'TF' ], [ 'Gabon', 'GA' ], [ 'Gambia', 'GM' ],
    [ 'Georgia', 'GE' ], [ 'Germany', 'DE' ], [ 'Ghana', 'GH' ], [ 'Gibraltar', 'GI' ], [ 'Great Britain', 'GB' ], [ 'Greece', 'GR' ],
    [ 'Greenland', 'GL' ], [ 'Grenada', 'GD' ], [ 'Guadeloupe (French)', 'GP' ], [ 'Guam (USA)', 'GU' ], [ 'Guatemala', 'GT' ], [ 'Guernsey', 'GG' ],
    [ 'Guinea', 'GN' ], [ 'Guinea Bissau', 'GW' ], [ 'Guyana', 'GY' ], [ 'Haiti', 'HT' ], [ 'Heard Island and McDonald Islands', 'HM' ], [ 'Honduras', 'HN' ],
    [ 'Hong Kong', 'HK' ], [ 'Hungary', 'HU' ], [ 'Iceland', 'IS' ], [ 'India', 'IN' ], [ 'Indonesia', 'ID' ], [ 'International', 'INT' ],
    [ 'Iran', 'IR' ], [ 'Iraq', 'IQ' ], [ 'Ireland', 'IE' ], [ 'Isle of Man', 'IM' ], [ 'Israel', 'IL' ], [ 'Italy', 'IT' ],
    [ 'Ivory Coast', 'CI' ], [ 'Jamaica', 'JM' ], [ 'Japan', 'JP' ], [ 'Jersey', 'JE' ], [ 'Jordan', 'JO' ], [ 'Kazakhstan', 'KZ' ],
    [ 'Kenya', 'KE' ], [ 'Kiribati', 'KI' ], [ 'Korea-North', 'KP' ], [ 'Korea-South', 'KR' ], [ 'Kuwait', 'KW' ], [ 'Kyrgyzstan', 'KG' ],
    [ 'Laos', 'LA' ], [ 'Latvia', 'LV' ], [ 'Lebanon', 'LB' ], [ 'Lesotho', 'LS' ], [ 'Liberia', 'LR' ], [ 'Libya', 'LY' ],
    [ 'Liechtenstein', 'LI' ], [ 'Lithuania', 'LT' ], [ 'Luxembourg', 'LU' ], [ 'Macau', 'MO' ], [ 'Macedonia', 'MK' ], [ 'Madagascar', 'MG' ],
    [ 'Malawi', 'MW' ], [ 'Malaysia', 'MY' ], [ 'Maldives', 'MV' ], [ 'Mali', 'ML' ], [ 'Malta', 'MT' ], [ 'Marshall Islands', 'MH' ],
    [ 'Martinique (French)', 'MQ' ], [ 'Mauritania', 'MR' ], [ 'Mauritius', 'MU' ], [ 'Mayotte', 'YT' ], [ 'Mexico', 'MX' ], [ 'Micronesia', 'FM' ],
    [ 'Moldova', 'MD' ], [ 'Monaco', 'MC' ], [ 'Mongolia', 'MN' ], [ 'Montenegro', 'ME' ], [ 'Montserrat', 'MS' ], [ 'Morocco', 'MA' ],
    [ 'Mozambique', 'MZ' ], [ 'Myanmar', 'MM' ], [ 'Namibia', 'NA' ], [ 'Nauru', 'NR' ], [ 'Nepal', 'NP' ], [ 'Netherlands', 'NL' ],
    [ 'Netherlands Antilles', 'AN' ], [ 'New Caledonia (French)', 'NC' ], [ 'New Zealand', 'NZ' ], [ 'Nicaragua', 'NI' ], [ 'Niger', 'NE' ], [ 'Nigeria', 'NG' ],
    [ 'Niue', 'NU' ], [ 'Norfolk Island', 'NF' ], [ 'Northern Mariana Islands', 'MP' ], [ 'Norway', 'NO' ], [ 'Oman', 'OM' ], [ 'Pakistan', 'PK' ],
    [ 'Palau', 'PW' ], [ 'Panama', 'PA' ], [ 'Papua New Guinea', 'PG' ], [ 'Paraguay', 'PY' ], [ 'Peru', 'PE' ], [ 'Philippines', 'PH' ],
    [ 'Pitcairn Island', 'PN' ], [ 'Poland', 'PL' ], [ 'Polynesia (French)', 'PF' ], [ 'Portugal', 'PT' ], [ 'Puerto Rico', 'PR' ], [ 'Qatar', 'QA' ],
    [ 'Reunion (French)', 'RE' ], [ 'Romania', 'RO' ], [ 'Russia', 'RU' ], [ 'Rwanda', 'RW' ], [ 'Saint Helena', 'SH' ], [ 'Saint Kitts and Nevis Anguilla', 'KN' ],
    [ 'Saint Lucia', 'LC' ], [ 'Saint Pierre and Miquelon', 'PM' ], [ 'Saint Vincent and Grenadines', 'VC' ], [ 'Samoa', 'WS' ], [ 'San Marino', 'SM' ], [ 'Sao Tome and Principe', 'ST' ],
    [ 'Saudi Arabia', 'SA' ], [ 'Senegal', 'SN' ], [ 'Serbia', 'RS' ], [ 'Seychelles', 'SC' ], [ 'Sierra Leone', 'SL' ], [ 'Singapore', 'SG' ],
    [ 'Slovakia', 'SK' ], [ 'Slovenia', 'SI' ], [ 'Solomon Islands', 'SB' ], [ 'Somalia', 'SO' ], [ 'South Africa', 'ZA' ], [ 'South Georgia and South Sandwich Islands', 'GS' ],
    [ 'South Sudan', 'SS' ], [ 'Spain', 'ES' ], [ 'Sri Lanka', 'LK' ], [ 'Sudan', 'SD' ], [ 'Suriname', 'SR' ], [ 'Svalbard and Jan Mayen Islands', 'SJ' ],
    [ 'Swaziland', 'SZ' ], [ 'Sweden', 'SE' ], [ 'Switzerland', 'CH' ], [ 'Syria', 'SY' ], [ 'Taiwan', 'TW' ], [ 'Tajikistan', 'TJ' ],
    [ 'Tanzania', 'TZ' ], [ 'Thailand', 'TH' ], [ 'Togo', 'TG' ], [ 'Tokelau', 'TK' ], [ 'Tonga', 'TO' ], [ 'Trinidad and Tobago', 'TT' ],
    [ 'Tunisia', 'TN' ], [ 'Turkey', 'TR' ], [ 'Turkmenistan', 'TM' ], [ 'Turks and Caicos Islands', 'TC' ], [ 'Tuvalu', 'TV' ], [ 'U.K.', 'UK' ],
    [ 'USA', 'US' ], [ 'USA Minor Outlying Islands', 'UM' ], [ 'Uganda', 'UG' ], [ 'Ukraine', 'UA' ], [ 'United Arab Emirates', 'AE' ], [ 'Uruguay', 'UY' ],
    [ 'Uzbekistan', 'UZ' ], [ 'Vanuatu', 'VU' ], [ 'Vatican', 'VA' ], [ 'Venezuela', 'VE' ], [ 'Vietnam', 'VN' ], [ 'Virgin Islands (British)', 'VG' ],
    [ 'Virgin Islands (USA)', 'VI' ], [ 'Wallis and Futuna Islands', 'WF' ], [ 'Western Sahara', 'EH' ], [ 'Yemen', 'YE' ], [ 'Zambia', 'ZM' ], [ 'Zimbabwe', 'ZW' ]
]

$(function () {
    let u = window.location.href
    let q = u.split('?')[1].split('&')

    userid = q[1]
    winType = parseInt(q[0])

    LiveMe.getUserInfo(userid).then(user => {
        maxCount = winType > 0 ? user.count_info.following_count : user.count_info.follower_count

        document.title = user.user_info.uname + (winType === 0 ? ' Fans' : ' Followings')
        $('header h1').html(document.title)
    })

    setTimeout(() => { startLoad() }, 200)

    setImmediate(() => { $('main').show() })

    filters.countryCode = ''
    filters.seen = true

    setImmediate(() => {
        $('#countryCode').empty()
        for (let i = 0; i < cclist.length; i++) {
            $('#countryCode').append(`<option value="${cclist[i][1]}">${cclist[i][0]}</option>`)
        }
    })

    $('main').scroll(function () {
        if (($(this).scrollTop() + $(this).height()) > ($('table').height() - 240)) {
            if (hasMore === false) return
            if (scrollBusy === true) return

            scrollBusy = true
            currentPage++

            if (winType === 1) {
                doFollowings()
            } else {
                doFans()
            }
        }
    })

    $('#list-search').bind('paste cut keydown', function () {
        setTimeout(() => {
            const value = $(this).val().toLowerCase()
            if (value.trim().length === 0) {
                $('table tr').show()
                return
            }
            $('table tr').each(function () {
                const name = $(this).find('h1').first().text().toLowerCase()
                const uids = $(this).find('.cell a[onclick]').text().toLowerCase()
                if (name.indexOf(value) !== -1 || uids.indexOf(value) !== -1) {
                    $(this).show()
                } else {
                    $(this).hide()
                }
            })
        }, 500)
    })
})

function startLoad () {
    $('table.fflist tbody').html('')

    scrollBusy = true
    currentPage = 1
    totalCount = 0

    switch (winType) {
    case 1: // Followers/Fans
        doFollowings()
        break
    case 0: // Followings
        doFans()
        break
    }
}

function loadMore () {
    scrollBusy = true
    threads = 0
    currentPage++

    switch (winType) {
    case 1: // Followers/Fans
        doFollowings()
        break
    case 0: // Followings
        doFans()
        break
    }
}

function filterCountry () {
    filters.active = $('#countryCode').val()
    filters.countryCode = $('#countryCode').val()
    startLoad()
}
function toggleSeen () {
    if (filters.seen === true) {
        filters.seen = false
        $('i.icon-eye').addClass('icon-eye-blocked').removeClass('icon-eye')
    } else {
        filters.seen = true
        $('i.icon-eye-blocked').addClass('icon-eye').removeClass('icon-eye-blocked')
    }
    filters.active = !filters.seen
    startLoad()
}

function copyToClipboard (i) { clipboard.writeText(i) }
function closeWindow () { window.close() }
function minimizeWindow () { remote.BrowserWindow.getFocusedWindow().minimize() }

function doFollowings () {
    $('footer h2').html('<i class="icon icon-arrow-down bright green"></i>')

    LiveMe.getFollowing(userid, currentPage, MAX_PAGE_SIZE).then(results => {
        $('footer h2').html('<i class="icon icon-arrow-down dim"></i>')

        totalCount += results.length

        for (let i = 0; i < results.length; i++) {
            if ((filters.seen === true) && (filters.countryCode.length < 2)) {
                addEntry(results[i])
            } if ((filters.countryCode.length > 1) && (results[i].countryCode === filters.countryCode)) {
                if (filters.seen === true) {
                    addEntry(results[i])
                } else if ((filters.seen === false) && (DataManager.wasProfileViewed(results[i].uid) !== false)) {
                    addEntry(results[i])
                }
            } else if (filters.countryCode.length < 2) {
                if ((filters.seen === false) && (DataManager.wasProfileViewed(results[i].uid) === false)) {
                    addEntry(results[i])
                }
            }
        }

        setTimeout(() => {
            scrollBusy = false
            $('#list-search').trigger('keydown')
        }, 200)

        hasMore = results.length >= MAX_PAGE_SIZE

        let c = $('table.fflist tbody tr').length
        if (filters.seen === false || filters.countryCode.length > 1) {
            $('footer h1').html(`Showing ${c} filtered from ${totalCount} of ${maxCount} accounts.`)
        } else {
            $('footer h1').html(`Showing ${totalCount} of ${maxCount} accounts.`)
        }

        if (hasMore && ($('table.fflist tbody tr').length < (MAX_PAGE_SIZE * 2))) {
            setTimeout(() => {
                loadMore()
            }, 200)
        }
    })
}

function doFans () {
    $('footer h2').html('<i class="icon icon-arrow-down bright green"></i>')

    LiveMe.getFans(userid, currentPage, MAX_PAGE_SIZE).then(results => {
        $('footer h2').html('<i class="icon icon-arrow-down dim"></i>')

        totalCount += results.length

        for (let i = 0; i < results.length; i++) {
            if ((filters.seen === true) && (filters.countryCode.length < 2)) {
                addEntry(results[i])
            } if ((filters.countryCode.length > 1) && (results[i].countryCode === filters.countryCode)) {
                if (filters.seen === true) {
                    addEntry(results[i])
                } else if ((filters.seen === false) && (DataManager.wasProfileViewed(results[i].uid) !== false)) {
                    addEntry(results[i])
                }
            } else if (filters.countryCode.length < 2) {
                if ((filters.seen === false) && (DataManager.wasProfileViewed(results[i].uid) === false)) {
                    addEntry(results[i])
                }
            }
        }

        setTimeout(() => {
            scrollBusy = false
            $('#list-search').trigger('keydown')
        }, 200)

        hasMore = results.length >= MAX_PAGE_SIZE

        let c = $('table.fflist tbody tr').length
        if (filters.seen === false || filters.countryCode.length > 1) {
            $('footer h1').html(`Showing ${c} filtered from ${totalCount} of ${maxCount} accounts.`)
        } else {
            $('footer h1').html(`Showing ${totalCount} of ${maxCount} accounts.`)
        }

        if (hasMore && ($('table.fflist tbody tr').length < (MAX_PAGE_SIZE * 2))) {
            setTimeout(() => {
                loadMore()
            }, 200)
        }
    })
}

function addEntry (entry) {
    let prettydate = require('pretty-date')
    let sex = entry.sex < 0 ? '' : (entry.sex === 0 ? 'is-female' : 'is-male')
    let seenRaw = DataManager.wasProfileViewed(entry.uid)
    let seenDate = seenRaw !== false ? prettydate.format(seenRaw) : ''
    let seen = seenRaw !== false ? 'bright blue' : 'dim'
    let bookmarked = DataManager.isBookmarked(entry) ? 'star-full bright yellow' : 'star-empty dim'

    $('table.fflist tbody').append(`
        <tr id="entry-${entry.uid}" class="entry-${entry.uid} ${sex}">
            <td width="64">
                <img src="${entry.face}" style="height: 64px; width: 64px;" onError="$(this).hide()" align="bottom" class="avatar">
            </td>
            <td width="90%">
                <div class="seen" title="Last seen ${seenDate}"><i class="icon icon-eye ${seen}"></i></div>
                <div class="bookmarked"><i class="icon icon-${bookmarked}"></i></div>
                <h1>${entry.nickname}</h1>
                <div id="user-${entry.uid}" class="countrylevel" data-seen="Last seen ${seenDate}">
                    ${entry.countryCode}&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;<b>Level:</b> ${entry.level}
                    <div class="cell" style="width: 160px; text-align: right;">
                        ${seenDate}
                    </div>
                    <br>
                    <div class="cell" style="width: 125px;">
                        Short ID: <a onClick="copyToClipboard('${entry.short_id}')" title="Click to copy to clipboard.">${entry.short_id}</a>
                    </div>
                    <div class="cell" style="width: 160px; text-align: right;">
                        ID: <a onClick="copyToClipboard('${entry.uid}')" title="Click to copy to clipboard.">${entry.uid}</a>
                    </div>
                </div>
                <div id="user-${entry.uid}-buttons" class="buttons">
                    <a class="button mini view" onClick="showUser('${entry.uid}')">View Account</a>
                    <a class="button mini fans" onClick="showFollowers('${entry.uid}')"></a>
                    <a class="button mini following" onClick="showFollowing('${entry.uid}')">0</a>
                </div>
            </td>
        </tr>
    `)

    LiveMe.getUserInfo(entry.uid).then(user => {
        if ((user.count_info.replay_count < 1) && (appSettings.get('general.hide_zeroreplay_followings') === true) && (winType === 1)) {
            $('#entry-' + user.user_info.uid).remove()
        } else if ((user.count_info.replay_count < 1) && (appSettings.get('general.hide_zeroreplay_fans') === true) && (winType === 0)) {
            $('#entry-' + user.user_info.uid).remove()
        } else {
            $('#entry-' + user.user_info.uid).addClass('entry-' + user.user_info.short_id)
            $('#user-' + user.user_info.uid + '-buttons a.view').html(user.count_info.replay_count + ' Replays')
            $('#user-' + user.user_info.uid + '-buttons a.fans').html(user.count_info.follower_count + ' Fans')
            $('#user-' + user.user_info.uid + '-buttons a.following').html('Following ' + user.count_info.following_count)
        }
    })
}

function showFollowing (u) { ipcRenderer.send('open-followings-window', { userid: u }) }
function showFollowers (u) { ipcRenderer.send('open-followers-window', { userid: u }) }
function showUser (u) {
    $('#entry-' + u).animate({ opacity: 0.3 }, 200); ipcRenderer.send('show-user', { userid: u })
}
