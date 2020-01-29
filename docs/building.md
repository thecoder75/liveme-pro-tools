## Building/Compiling LiveMe Pro Tools

## Building on Linux
First of all, you will need to install Node.js and make sure it works.
- [Follow the instructions provided here to install it](https://nodejs.org/en/download/package-manager/)
- [Then follow these instructions to test if it works correctly](https://www.electronjs.org/docs/tutorial/development-environment#setting-up-linux)  
If both commands return a version number, you should be good to go.

If you've been using LMPT for a while, you probably want to back up your settings, bookmarks, etc. before you build a new version. Copy the following files from `/home/your_username/.config/Electron` to some safe location:  
- Preferences
- Settings
- bookmarks.json
- downloaded.json
- errored.json
- follows.json
- ignored.json
- profiles.json
- queued.json
- watched.json

1. Clone the repository to some directory:  
`git clone https://github.com/thecoder75/liveme-pro-tools.git`

2. `cd` into that directory:  
`cd liveme-pro-tools`

3. Issue the command `npm install` to download the dependencies

4. Issue `npm start` to start the app

That's it!  
If you want to work on the code, you'll need to close all running instances of the app, issue the command `npm rebuild` and restart the app to see your changes.

## Building on Windows
TODO
