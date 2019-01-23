# LiveMe Pro Tools

**A big thank you to all those who are now contributing to help make this tool even better!**

### Support/Assistance/Reporting Issues
I've re-enabled the Issue Tracker here.  Please use it **ONLY** to report bugs or feature requests.

For help in general use and general questions, please use the [Discord chat room](https://discord.gg/A5p2aF4).  There are now many on there who provide help and also work on this now.

**I DO NOT RESPOND TO EMAILS EITHER ASKING FOR ASSISTANCE!**  This is my spare-time project so use the Discord chat room as others will assist as they can.

### What Is LiveMe Pro Tools?
Its an [Electron](https://electronjs.org) based application for Live.me Social Video network for:
- Search and browse user accounts
- View public replays for user accounts
- See and navigate user's followers and followings
- Watch and download replays
- Allows downloading of replays using FFMPEG
- Supports [LAMD](https://notabug.org/thecoder75/lamd)

### Building LiveMe Pro Tools

**Instructions can be found in the DOCS folder on building the various branches of this project.**

### Prebuilt Releases (64-bit only!)

To download the latest prebuilt versions, [click here](https://github.com/thecoder75/liveme-pro-tools/releases/latest).

**Current Supported Platforms:**
- Ubuntu-based Linux and Debian Distributions (64-bit)
- macOS v10.11 or higher (64-bit only!)
- Windows 7 or higher (64-bit!)

### 32-bit versions???
**Since we've moved to using newer technologies, keeping support for 32-bit versions has been harder to maintain now so we dropped building them January 1st, 2019.**

You are more than welcome to download the source and build your own 32-bit version, but support for issues will be limited.

### FFMPEG No Longer Required?
Dependancy on FFMPEG has been removed.  You can choose to use a basic built-in concat system now to join the chunks downloaded without needing to have FFMPEG installed on your computer.  

If you wish to transcode the downloads, then you will need to have FFMPEG installed.

~~FFMPEG is required to combined the downloaded playlist chunks and if transcoding of the downloaded replays are preferred.  There is no way at this time to download replays without having FFMPEG installed.~~

We are looking into building/rewriting the chunk downloader and removing the dependancy on FFMPEG in future versions.

### Current Releases Built With
* [Electron](http://electronjs.org)
* [NodeJS](http://nodejs.org)
* LiveMe-API - *now integrated into the project*

### Contributing
If you find any bugs or would like to help add features or additional functions, please create a pull request for review and the current contributors will review it.  No guarantees are provided on if your pull request will be integrated or not. 

### Project Contributors
#### In no special order:
* [thecoder75](https://notabug.com/thecoder75)
* [zp](https://github.com/zp)
* [polydragon](https://github.com/polydragon)
* [lewdninja](https://github.com/lewdninja)
* [Tashiketh](https://notabug.org/Tashiketh)
* [monstergarden](https://notabug.org/monstergarden)
* [mustang-sally](https://github.com/mustang-sally)

### License
This project is licensed under the GPL-3 License - see the [LICENSE](LICENSE) file for details

### Donations
**Please help keep this project alive!**
We appreciate those who wish to donate, but at this time we're not requiring or accepting them.  In the future, who knows.
