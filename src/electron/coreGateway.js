const spawn = require("child_process").spawn;
const fetch = require("node-fetch");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const EventEmitter = require('events');

const PORT = 5000;
const HOST = "http://localhost:" + PORT

const LogEmitter = new EventEmitter();

LogEmitter.on('event', (x) => {
    console.log('FROM Core:' + x);
});


async function healthCheck(){
    try {
        var res = await fetch(HOST + "/index.html");
        apiIsRunning = res.status == 200;
        return apiIsRunning;
    } catch (e) {
        return false;
    }
}

async function shutdown(){
    let res = await DotNet.invokeMethodAsync('LMPT.Core.BlazorApp', 'ShutDown')
    //var res = await fetch(HOST + "/api/command/shutdown", {method:"POST"});
    
}

async function startApi() {
    console.log("Checking LMPT Core");

    var apiIsRunning = await healthCheck()
    if (apiIsRunning) {
        console.log("LMPT Core is running on 5000");
        return "was running already";
    }

    try {
        switch (os.platform()) {
            case "darwin": // macOS
                apipath = path.join(__dirname, "..//core//LMPT.Core.Server//bin//dist//mac//LMPT.Core.Server");
                break;
            case "linux": // linux
                apipath = path.join(__dirname, "..//core//LMPT.Core.Server//bin//dist//linux//LMPT.Core.Server");
                break;
            default: // windows
                var apipath = path.join(__dirname, "..//core//LMPT.Core.Server//bin//dist//win//LMPT.Core.Server.exe"); 
                break;
        }


        //  run server    

  
        apiProcess = spawn(apipath);
        apiProcess.stderr.on("data", data => {
            //console.log(`stderr: ${data}`);
        });

        return new Promise((resolve, reject) => {
            apiProcess.stdout.on("data", data => {
                LogEmitter.emit('event', data);
                const expectedOutput = `Now listening on: http://localhost:${PORT}`      
                // There must be a better way.
                // We check the console output until we get the message it is listening now.
                if (data.toString().includes(expectedOutput)) {
                    resolve("Successfully started background process.");
                }
            });
        });
    } catch (e) {
        return Promise.reject("Failed starting lmpt core");
    }
}

exports.start = startApi;
exports.healthCheck = healthCheck;
exports.shutdown = shutdown;
exports.LogEmitter = LogEmitter;
