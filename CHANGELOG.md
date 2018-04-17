## Change Log

### v1.103.20180417
Added:
- Added new filename template tags for adding the date of the replay to the filename.

### v1.102.20180410
Added:
- When you click on the download button for a replay, it changes state to indicate it was clicked.
- Clicking on the background when the download queue is visible will now close it.

### v1.101.20180409
Added:
- Changed downloader to use FFMPEG instead of stream downloading to help reduce chances of download errors.

Fixed:
- Changed downloader to be a single file at a time now, no more concurrent downloading since its now using FFMPEG.

### v1.99.20180323
Fixed:
- Fixed a couple typos in `index.js` which caused some error messages to appear.

### v1.98.20180323
Added:
- Added queued and errored list writers and readers for logging and resuming of downloads.

Fixed:
- Updated error handling in `miniget.js`.

### v1.97.20180316
Fixed:
- Adjusted maximum history age for viewed profiles to avoid the possibility of a corrupt history file when the record counts gets too high.

### v1.96.20180313
Fixed:
- Changed Video URL to now be `https://www.liveme.com/live.html?videoid=` so jDownloader will pick up naming better.

### v1.95.20180310
**Only bug fixes will be addressed from this point forward as the project will be moving away from using NodeJS and Electron to a more solid desktop application framework.**

### v1.95.20180305
Fixed:
- Changed downloader to now do a single file at a time using the Chunk Count in Settings.
- Fixed new replay detection bug causing all accounts to be flagged as having new replays.

**This is the last version supporting Windows OS, future versions will be built only for Linux and macOS users.***

### v1.92.20180305
Added:
- Added status text to feed view on home screen.
- Added ability to clear viewed profiles from history based on age in Settings.

Fixed:
- Fixed home view not showing new replays detected.
- Fixed illegal/invalid characters in download filenames.
- Fixed downloader ignoring concurrency setting.
- Fixed variables table getting wiped/disappearing in the Settings view.
- Fixed null issue when shutting down with active downloads.
- Fixed startup crash experienced by users.
- Fixed Linux version not being built by Travis-CI.

### v1.91.20180305
Fixed:
- Updated downloader code to try and reduce or avoid timeout issues by reducing chunk count down to 1

### v1.90.20180302
Added:
- Timed out downloads are now added back into the queue for retry.
- Added remembering last window positions for Fans and Followings lists.

Fixed:
- Fixed invalid filename character bug for downloaded replays.
- Adjusted number of chunks in downloader to try to reduce the timeout issue.
- Moved new replay check to a background style thread so it will continue checking while user does other things.


### v1.80.20180226
Fixed:
- Minor code cleanups and preparing for future features.

### v1.80.20180225
Added:
- Added ability to save the avatar/face of an account.
- Added ability to use LAMD for handling downloads in the background.
- LAMD button now only shows if LAMD is running when profile is viewed.
- LAMD commands now provide feedback.

### v1.61.20180224
Fixed:
- Fixed default settings for LAMD url, should now set defaults to `http://localhost:8280`

### v1.60.20180223
Added:
- Added support for LAMD.

Fixed:
- Fixed issues with previously watch replays logging not getting updated with new times.
- Fixed issues with previously downloaded replays logging not getting updated with new times.
- Fixed issues with previously viewed profiles logging not getting updated with new times.

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

