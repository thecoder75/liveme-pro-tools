## Change Log

### v1.52.20180218
**Moved to using automated build process using Travis-CI and AppVeyor.  Also adds macOS version now!**

### v1.52.20180217
Fixed:
- #7 - Removed download speed selector
- #7 - Changed maximum concurrent downloads from 5 to 3
- #7 - Added a timeout catch to downloads in case there is a stall it will automatically end them instead of leaving them hanging

### v1.51.20180216
Fixed:
- #7 - Added better error trapping for the sparse download error bug

### v1.50.20180215
Added:
- Added new built-in downloader with up to 5 concurrent downloads capability
- Added database stats to the Settings view
- Added `Master Reset` button to the Settings view

Fixed:
- Improved UI rendering in Booksmark window

### v1.31.20180213
Fixed:
- Minor detection bug in First Run Wizard causing old LiveMe Tools installation to not be detected

### v1.30.20180212
Added:
- Ability to filter bookmarks (show/hide non-updated accounts)
- Updated bookmarks window to render faster without performing additional unnecessary account checks

Fixed:
- Reverted back to scroll load on the followings and fans lists to fix performance issue
- Fixed broken filter button on the fans and followings window

### v1.28.20180212
Added:
- Ability to select between using jDownloader2 or YouTube-DL for downloads now
- Updated Followings/Fans windows to now do a continuous data load with handlers to avoid poor responsiveness

### v1.25.20180211
Added:
- Ability to show/hide already seen accounts in the Followings/Fans windows

Fixed:
- Fixed grammer in the Following/Fans windows to indicate scroll for more.

### v1.22.20180211
Fixed:
- The imfamous hangup issue during importing in the wizard

### v1.21.20180211
Fixed:
- Sometimes Following/Fans windows would only show or list a few accounts even though there was a lot available.

### v1.20.20180210
Added:
- Added Country filter to Following/Fan list view
- Added ability to reset the app back to fresh install state.

Fixed:
- Unable to get Followings or Fans to work when looking at username search results
- Fixed hangup issue when importing large amounts of bookmarks during first run
- Fixed restore file selector
- Fixed backup and restore subfunctions

### v1.14.20180210
Added:
- Added Comment History (Chat History/Message History) to replays
- Added news feed to home screen

Fixed:
- Fixed upgrade notice bug.

### v1.8.20180210
Fixed:
- Correct window positions not being remembered properly
- Addressed several minor bugs related to the listing of replays
- Correct a couple typos

### v1.5.20180210
Fixed:
- Corrected issue with Video URL being copied to clipboard as `undefined`.

### v1.4.20180210
**Initial release**

