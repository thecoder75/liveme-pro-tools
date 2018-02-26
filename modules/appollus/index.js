'use strict';
var shell = require('shelljs');
var path = require('path');
var fs = require('fs');
const { dialog, app } = require('electron')

var crawlerParameters = {
    maxFanCount: 500,
    maxFollowersCount: 500
}


const evaluater = require('./evaluater');
const crawler = require('./crawler');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}





function logCyan(text) {
    console.log("\x1b[36m%s\x1b[0m", text)
}
function logSuccess(text) {
    console.log("\x1b[32m%s\x1b[0m", text)
}

async function makeDirPath(filename) {
    await shell.mkdir('-p', path.dirname(filename));
}

class Appollus {
    constructor() {
        this.crawler = new crawler.Crawler()
    }

    cancel() {
        this.crawler.cancel()
    }

    loadJsonFileOpenDialog(onJson) {
        var outputfiledir = path.join(
            app.getPath('appData'),
            app.getName(), 'Data')
        let d = dialog.showOpenDialog(
            {
                properties: [
                    'openFile',
                ],
                defaultPath: outputfiledir,
                buttonLabel: 'Load Output File from Discovery',
                filters: [
                    { name: 'JSON files', extensions: ['json'] }
                ]
            },
            (filePath) => {
                if (filePath == null) return
                console.log(filePath[0]);
                
                var filecontent = fs.readFileSync(filePath[0])
                var json = JSON.parse(filecontent)
                onJson(json)
            }
        );
    }

    async startAppollus(rootUserId, onLog) {
        try {



            console.log("Started Appollus")

            var outputfilepath = path.join(
                app.getPath('appData'),
                app.getName(), 'Data',
                `similiarTo${rootUserId}.json`)
            await makeDirPath(outputfilepath)   

            onLog("STEP 1 - Executing crawler ...")
            var crawlerResult = await this.crawler.crawl(rootUserId, crawlerParameters, onLog)
            await sleep(1000)

            onLog("STEP 2 - Evaluate crawled data ...")
            var evalData = evaluater.evaluate(crawlerResult)
   
            onLog("STEP 3 - Write output file ...")
            var outputJson = {
                version: "AppollusDiscovery-v1",
                rootUserId: rootUserId,
                data: evalData
            }
            fs.writeFileSync(outputfilepath, JSON.stringify(outputJson))
            // console.log("find high LPS - Not implemented yet")
            
            onLog(`Finished`);
            return outputJson
        } catch (error) {
            onLog(error);
        }

    }
}



module.exports.Appollus = Appollus

