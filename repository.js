const AWS = require('aws-sdk');

module.exports.getData = async function (date, time) {
    let ddb = new AWS.DynamoDB({region: "us-east-1"});

    let item = await ddb.getItem({Key: { "date": {S: date}, "time": {S: time} },
                                TableName: process.env.TableName}).promise();
    return {
        excel: item.Item.excel.BOOL,
        date: item.Item.date.S,
        time: item.Item.time.S,
        word: item.Item.word.BOOL,
        powerpoint: item.Item.powerpoint.BOOL
    }
}

module.exports.getLastNDays = async function (numDays) {
    let ddb = new AWS.DynamoDB({region: "us-east-1"});

    let allEntries = [];

    for(let i = 0; i<= numDays; i++) {
        var dayToCheck = new Date();
        dayToCheck.setDate(dayToCheck.getDate()-i);

        let query = {
            ExpressionAttributeNames: {
                '#d': "date"
            },
            ExpressionAttributeValues: {
                ':queryDate' : {S: dayToCheck.toISOString().split('T')[0]}
              },
            KeyConditionExpression: '#d = :queryDate',
            TableName: process.env.TableName
        };

        let queryResult = await ddb.query(query).promise();

        queryResult.Items.forEach(item => allEntries.push(item));
    }

    let upOccurences = {
        "powerpoint": (allEntries.filter(item => item.powerpoint.BOOL).length * 100.0) / allEntries.length,
        "excel": (allEntries.filter(item => item.excel.BOOL).length * 100.0) / allEntries.length,
        "word": (allEntries.filter(item => item.word.BOOL).length * 100.0) / allEntries.length
    };

    return upOccurences;
}