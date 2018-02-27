
const { ipcRenderer, remote } = require('electron')
const appollus = require('electron').remote.require('./modules/appollus')   

var currentAppollus = new appollus.Appollus()
var list = [], index, max;

$(function () {
    $('main').show();
});

function closeWindow() { currentAppollus.cancel(); window.close(); }
function showUser(u) { ipcRenderer.send('show-user', { userid: u }); }
function enterOnSearch(e) { if (e.keyCode == 13) discoverPressed(); } 
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setFooterText(text) {
    $('footer h1').html(text);
}

function loadPressed(q) { 
    currentAppollus.loadJsonFileOpenDialog(json =>{
        currentAppollus.cancel()
        // await sleep(1000)
        setFooterText("Got Json")
        if(json.version == undefined){
            setFooterText("ERROR: Invalid json - not AppollusDiscovery-v1 output file!")
            return
            
        }
        if (json.version === "AppollusDiscovery-v1") {
            list = json.data
            $('#search-query').val(json.rootUserId)
        }   
        redraw();
    })
}
async function discoverPressed(q) {
    var rootUid = $('#search-query').val()
    
    setFooterText(`Discovering ${rootUid} ...`)
    currentAppollus.cancel()
    await sleep(1000)
    currentAppollus = new appollus.Appollus()


    $('#crawler-list').html('')

    var resultJson = await currentAppollus.startAppollus(rootUid, (info) => {
        setFooterText(info)
    })
    list = resultJson.data

    redraw();
}

function redraw() {
    $('#list thead').html(`
    <tr>
        <th width="50">Order</th>
        <th>User</th>
        <th width="50" align="right">Count</th>
    </tr>
`); 
    
    index = 0;
    max = list.length;
    setFooterText("Loading into window ...");
    setImmediate(() => {
        drawEntry();
    });
}

function drawEntry() {

    if (index == max) {
        setFooterText("")
        return;
    }
    console.log("Draw crawled entries");

    // var d1 = prettydate.format(new Date(list[index].newest_replay * 1000));
    // var d2 = prettydate.format(new Date(list[index].last_viewed * 1000));
    // var isNew = list[index].newest_replay > list[index].last_viewed ? 'new' : 'not-new';

    $('#crawler-list').append(`
                <tr id="entry-${list[index].key}" >
                <td >${index+1}</td>
                    <td >
                     <a class="button mini view" onClick="showUser('${list[index].key}')"> ${list[index].key} </a>
                    </td>
                    <td  class="main">
                    ${list[index].value}
                 
                    </td>

                </tr>
    `);
    index++;

    setImmediate(() => { drawEntry(); });
}

