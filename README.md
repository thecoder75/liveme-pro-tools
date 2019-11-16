# LiveMe Pro Tools
[![GNU AGPLv3](https://img.shields.io/github/license/thecoder75/liveme-pro-tools.svg)](LICENSE)
[![Current Release](https://img.shields.io/github/release/thecoder75/liveme-pro-tools.svg)](https://github.com/thecoder75/liveme-pro-tools/releases/latest)
[![Current Release Date](https://img.shields.io/github/release-date/thecoder75/liveme-pro-tools.svg)](https://github.com/thecoder75/liveme-pro-tools/releases/latest)
[![Last Commit Date](https://img.shields.io/github/last-commit/thecoder75/liveme-pro-tools.svg)](https://github.com/thecoder75/liveme-pro-tools/commits/master)
[![Active Issues](https://img.shields.io/github/issues/thecoder75/liveme-pro-tools.svg)](https://github.com/thecoder75/liveme-pro-tools/issues)
[![Gitter](https://badges.gitter.im/thecoderstoolbox/liveme-pro-tools.svg)](https://gitter.im/thecoderstoolbox/liveme-pro-tools?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

**A big thank you to all those who are now contributing to help make this tool even better!**

* * *

## Getting Support or Assistance

For general bugs or feature requests, chat on [Gitter](https://gitter.im/thecoderstoolbox/liveme-pro-tools).  I will try and answer issues and questions as I have time now.

***FYI: I DO NOT RESPOND TO EMAILS ASKING FOR ASSISTANCE OR ANYTHING ELSE RELATED TO THIS OR ANY OTHER OF MY PROJECTS, SO DON'T WASTE YOUR TIME SENDING THEM!***

* * *

## What Is LiveMe Pro Tools?
Its an [Electron](https://electronjs.org) based application for Live.me Social Video network for:
- Search and browse user accounts
- View public replays for user accounts
- See and navigate user's followers and followings
- Watch and download replays (requires an external video player)
- Allows downloading of replays using internal downloader or FFMPEG
- FFMPEG Hardware-Accelerated video transcoding supported on Linux only!  
  - Fully supports VAAPI on AMD and Intel cards for now.

* * *

## Building LiveMe Pro Tools

If you currently do not have NodeJS installed on your computer, download it from [here](https://www.nodejs.org).  You will also need to have **git** installed.

Once you have those requisites installed, clone the repository using the following command:
```
git clone https://github.com/thecoder75/liveme-pro-tools.git
```

Once the repository has been cloned, open a command prompt and navigate to the folder where its installed.  You will need to issue the following command to prepare the working folder:
```
npm install
```

After this completes, you can build the project by issuing one of the following commands:

#### Windows 64-bit
```
npm run release-win
```

#### Linux 64-bit
```
npm run release-win
```

#### macOS 64-bit
```
npm run release-win
```

#### All Platforms (Only execute on Linux or it will fail!)
```
npm run release
```


## Prebuilt Releases (64-bit only!)

To download the latest prebuilt versions, [click here](https://github.com/thecoder75/liveme-pro-tools/releases/latest).

**Current Supported Platforms (64-bit only):**
- Ubuntu-based Linux and Debian Distributions (64-bit)
- macOS v10.11 or higher (64-bit only!)
- Windows 7 or higher (64-bit!)

## 32-bit versions???
**Since we've moved to using newer technologies, keeping support for 32-bit versions has been harder to maintain now so we dropped building them January 1st, 2019.**

You are more than welcome to download the source and build your own 32-bit version, but support for issues will be limited.

* * *

## Current Releases Built With
* [Electron](http://electronjs.org)
* [NodeJS](http://nodejs.org)

## Contributing
If you find any bugs or would like to help add features or additional functions, please create a pull request for review and the current contributors will review it.  No guarantees are provided on if your pull request will be integrated or not.

## Project Contributors
***In no special order:***
* [thecoder75](https://github.com/thecoder75)
* [zp](https://github.com/zp)
* [polydragon](https://github.com/polydragon)
* [lewdninja](https://github.com/lewdninja)
* [Tashiketh](https://notabug.org/Tashiketh)
* [monstergarden](https://github.org/monstergarden)
* [mustang-sally](https://github.com/mustang-sally)
* [marcell](https://github.com/bem13)

## License
This project is now licensed under the [GNU AGPLv3](LICENSE) License.

## Donations
**Please help keep this project alive!**
We appreciate those who wish to donate, but at this time we're not requiring or accepting them.  If someone is asking for donations or a subscription to get access to releases of this project, then they are not truly contributing to the open source community.
