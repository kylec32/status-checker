const statushandler = require("./statushandler");
const repository = require("./repository");

(async() => {

    //console.log(await statushandler.currentstatus());
    console.log((await repository.getLastNDays(1)).Count);

})()