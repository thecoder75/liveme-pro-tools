/* global $ */

const MAX_PER_PAGE = 10

const { electron, BrowserWindow, remote, ipcRenderer, shell, dialog, clipboard } = require('electron')
const fs = require('fs')
const path = require('path')
const appSettings = remote.require('electron-settings')
const CoreGateway = remote.getGlobal('CoreGateway')
const request =  remote.require('request')



CoreGateway.LogEmitter.on("event", (info) => {
    console.log({info})
    document.getElementById("content").innerHTML += ("<br>" + info);
})




async function triggerCoreStart(){
    CoreGateway.start();
}

async function shutdownCore(){
    let res = await DotNet.invokeMethodAsync('LMPT.Core.BlazorApp', 'ShutDown')
}


function closeWindow () { window.close() }
function minimizeWindow () { remote.BrowserWindow.getFocusedWindow().minimize() }

