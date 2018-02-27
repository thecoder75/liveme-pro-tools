var fs = require('fs');
var path = require('path');


function loadData(folder) {
    var crawledfiles = fs.readdirSync(folder)
    return crawledfiles.map(file => {
        var content = fs.readFileSync(`${folder}/${file}`, "utf8")
        var asJsonArray = JSON.parse(content)
        return asJsonArray
    });
}






function reduceAndCount(inputArr2Dim) {
    return inputArr2Dim.reduce((acc, subarr) => {
        subarr.reduce((acc, k) => {
            acc[k] = acc[k] == undefined ? 1 : acc[k] + 1
            return acc
        }, acc)
        return acc
    }, {})
}

function sortDictByCount(dict) {
    var arr = []
    for (const [k, v] of Object.entries(dict)) {
        arr.push({ key: k, value: v });
    }
    return arr.sort((a, b) => b.value - a.value)
}

function evaluate(loadedData) {
    console.log("Reduce data and count")
    var reduced = reduceAndCount(loadedData)
    var sorted = sortDictByCount(reduced)
    return sorted.slice(0, 1000)
}

module.exports = { evaluate }
