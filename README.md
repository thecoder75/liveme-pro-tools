# LiveMe Pro Tools

![linux builds](https://img.shields.io/travis/thecoder75/liveme-pro-tools.svg?label=Linux%20Builds)
![macos builds](https://img.shields.io/travis/thecoder75/liveme-pro-tools.svg?label=macOS%20Builds)
![Windows Build](https://ci.appveyor.com/api/projects/status/jc119jb9vkt7p4qj/branch/master?svg=true)

## What Is LiveMe Pro Tools?
Its an [Electron](https://electronjs.org) based application for Live.me Social Video network for:
- Search and browse user accounts
- View public replays for user accounts
- See and navigate user's followers and followings
- Watch and download replays
- Allows downloading of replays using FFMPEG
- Supports [LAMD](https://thecoderstoolbox.com/lamd)

## Download Prebuilt Releases
![All Downloads](https://img.shields.io/github/downloads/thecoder75/liveme-pro-tools/total.svg?style=flat-square&label=All+Releases+Downloaded)
![Latest Downloads](https://img.shields.io/github/downloads/thecoder75/liveme-pro-tools/latest/total.svg?style=flat-square&label=Latest+Release+Downloaded)

New releases are built automatically when updates are pushed to this repo and can be found on the [release](https://github.com/thecoder75/liveme-pro-tools/releases) page.

#### Supported OS/Platforms
- Ubuntu-based Linux and Debian Distributions (32-bit or 64-bit)
- macOS v10.11 or higher (64-bit only)
- Windows 7 or higher* (32/64-bit)

### Downloader Uses FFMPEG
**Please note you must manually install FFMPEG on your computer for downloading to work.  If its not in the path, the downloader will fail!  Contributors will not offer support for installing FFMPEG, you will need to research install methods on your own!**

#### Windows
[Download](http://www.ffmpeg.org) and install FFMPEG into your `C:\Windows` folder.

#### MacOS 
[Download](http://www.ffmpeg.org) and install FFMPEG into a folder that is accessible in your path on your computer.  

#### Linux
You can either [download](http://www.ffmpeg.org) a static build or install the version maintained by your distribution using either `sudo apt install ffmpeg` or `sudo yum install ffmpeg`.

## Built With
* [Electron](http://electron.atom.io)
* [NodeJS](http://nodejs.org)
* [LiveMe-API](https://thecoder75.github.io/liveme-api)

## Contributing
If you find any bugs or would like to help add features or additional functions, please create a pull request for review.  

## Contributors
* [thecoder75](https://github.com/thecoder75)
* [zp](https://github.com/zp)

## License
This project is licensed under the GPL-3 License - see the [LICENSE](LICENSE) file for details
