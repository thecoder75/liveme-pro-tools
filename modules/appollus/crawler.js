
const liveme = require('liveme-api');
const fs = require('fs');
const path = require('path');




function getFanUserIds(userid, page) {
    return liveme.getFans(userid, page, 100)
        .then(res =>
            res.map(user => user.uid))
}
function getFollowingUserIds(userid, page) {
    return liveme.getFollowing(userid, page, 100)
        .then(res => res.map(user => user.uid))
}

async function getMultiplePages(fromPage, maxPage, action) {
    var again = true
    var all = []
    var currentPage = fromPage
    try {
        while (again) {
            var ids = await action(currentPage)
            if (ids.length == 0 || currentPage >= maxPage)
                again = false
            all.push(ids)
            currentPage++
        }
    } catch (error) {

    }

    return all
}

async function writeFile(filename, content) {
    await fs.writeFile(filename, content, (error) => {
        if (error)
            console.log(`Error: ${error}`)
    });
}


function flatten(arr2Dim) {
    return arr2Dim.reduce(function (a, b) { return a.concat(b); });
}

async function getFollowingsMulitplePages(userId, fanUserId, fromPage, toPage, folder) {
    const following = await getMultiplePages(fromPage, toPage,
        async (page) => await getFollowingUserIds(fanUserId, page));
    return flatten(following)
    // const jsonFile = `${folder}/${fanUserId}_${(fromPage - 1) * 100}-${toPage * 100}.json`
    // await writeFile(jsonFile, JSON.stringify(flattened));
}



function maxCountToPageCount(maxCount) {
    return Math.max(1, maxCount / 100)
}



class Crawler {
    constructor() {
        this.wasCancelled = false
    }

    cancel() {
        this.wasCancelled = true
    }

    /**
     * Performs a list of callable actions (promise factories) so that only a limited
     * number of promises are pending at any given time.
     *
     * @param listOfCallableActions An array of callable functions, which should
     *     return promises.
     * @param limit The maximum number of promises to have pending at once.
     * @returns A Promise that resolves to the full list of values when everything is done.
    */
    throttleActions(listOfCallableActions, limit) {
        // We'll need to store which is the next promise in the list.
        let i = 0;
        let resultArray = new Array(listOfCallableActions.length);
        // Now define what happens when any of the actions completes. Javascript is
        // (mostly) single-threaded, so only one completion handler will call at a
        // given time. Because we return doNextAction, the Promise chain continues as
        // long as there's an action left in the list.
        var doNextAction = () => {
            if (this.wasCancelled)
                throw "Canceled Crawler"
            if (i < listOfCallableActions.length) {
                // Save the current value of i, so we can put the result in the right place
                let actionIndex = i++;
                let nextAction = listOfCallableActions[actionIndex];
                return Promise.resolve(nextAction())
                    .then(result => {  // Save results to the correct array index.
                        resultArray[actionIndex] = result;
                        return;
                    }).then(doNextAction);
            }
        }

        // Now start up the original <limit> number of promises.
        // i advances in calls to doNextAction.
        let listOfPromises = [];
        while (i < limit && i < listOfCallableActions.length) {
            listOfPromises.push(doNextAction());
        }
        return Promise.all(listOfPromises).then(() => resultArray);
    }

    async asyncForEachParallel(array, onEach) {
        var ps = [];
        for (let i = 0; i < array.length; i++) {
            ps.push(() => onEach(array[i], i, array));
        }
        await this.throttleActions(ps, 10)
    }

    async getFansAndFollowingToDisk(userId, param, onLog) {
        var toPage = maxCountToPageCount(param.maxFanCount)

        var fans = await getMultiplePages(1, toPage,
            async (page) => await getFanUserIds(userId, page));
        fans = flatten(fans)

        var jsonFile = `${param.rootFolder}/Fans_0-${toPage * 100}.json`
        // writeFile(jsonFile, JSON.stringify(fans))

        var totalCount = fans.length
        var finished = 0
        var maxFollowersPage = maxCountToPageCount(param.maxFollowersCount)
        var fanFollowings = []
        await this.asyncForEachParallel(fans, async (fan) => {
            try {
                var follwings = await getFollowingsMulitplePages(userId, fan, 1, maxFollowersPage, param.fansFollowingFolder)
                fanFollowings.push(follwings)
                finished++
                if(!this.wasCancelled)
                    onLog(`[${finished}|${totalCount}] Got Followings of ${fan}`);
            } catch (error) {
                finished++
                if(!this.wasCancelled)
                    onLog(`[${finished}|${totalCount}] Failed to get Followings of ${fan}`);
            }
        })
        return fanFollowings
    }

    async crawl(userId, param, onLog) {

        onLog("Started crawling. This can take a while...")
        var res = await this.getFansAndFollowingToDisk(userId, param, onLog);
        onLog('Done crawling.')
        return res
    }
}












module.exports.Crawler = Crawler





