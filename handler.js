'use strict';
const chromium = require('chrome-aws-lambda');
const AWS = require('aws-sdk');
const fs = require('fs');
const {getTextFromImage} = require('@shelf/aws-lambda-tesseract');

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }

module.exports.gatherdata = async event => {
  let s3 = new AWS.S3();
  let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
  const page = await browser.newPage();
  console.log("Let's go to the page");
  await page.goto(process.env.STATUS_URL);
  console.log("Let's wait for the UI");
  await delay(15000);
  console.log("And now for the screenshot");
  await page.screenshot({path: '/tmp/example.png'});
  await browser.close();

  var contents = fs.readFileSync('/tmp/example.png');
  var params = {
    Body: contents,
    Bucket: process.env.IMAGE_BUCKET,
    Key: new Date().getTime() + ".jpg"
   };

  await s3.putObject(params).promise();
  console.log("Finished");

  let lines = (await getTextFromImage('/tmp/example.png')).split('\n');
  let result = {word: false, validator: false, visio:false, powerpoint:false, excel:false};
  console.log(lines);
  for(let i = 0; i<lines.length; i++) {
      let cleanedline = lines[i].trim().toLowerCase();
	console.log("Line: " + cleanedline);
      if(cleanedline.indexOf("word")>=0) {
	console.log("Word");
          result.word = cleanedline.split(" ")[1] == 'up';
      } else if(cleanedline.indexOf("powerpoint")>=0) {
	console.log("powerpoint");
         result.powerpoint = cleanedline.split(" ")[1] == 'up';
      }  else if(cleanedline.indexOf("excel")>=0 && (cleanedline.split(" ")[1] == "up" || cleanedline.split(" ")[1] == "down")) {
	console.log("excel");
	console.log(cleanedline.split(" ")[1]);
          result.excel = cleanedline.split(" ")[1] == 'up';
      }
  }

  var expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate()+30);

  var params = {
    TableName: process.env['TABLE_NAME'],
    Item: {
      'date' : {S: 'latest'},
      'time' : {S: 'latest'},
      'word' : {BOOL: result.word},
      'powerpoint' : {BOOL: result.powerpoint},
      'excel' : {BOOL: result.excel},
      'creationdate': {S: new Date().toISOString()},
      'expiration': {S: Math.floor((new Date().getTime() / 1000)).toString()}
    }
  };

  await ddb.putItem(params).promise();

  var params = {
    TableName: process.env['TABLE_NAME'],
    Item: {
      'date' : {S: new Date().toISOString().split('T')[0]},
      'time' : {S: new Date().toISOString().split('T')[1]},
      'word' : {BOOL: result.word},
      'powerpoint' : {BOOL: result.powerpoint},
      'excel' : {BOOL: result.excel},
      'creationdate': {S: new Date().toISOString()},
      'expiration': {S: Math.floor((new Date().getTime() / 1000)).toString()}
    }
  };

  await ddb.putItem(params).promise();
  
  return result;
};
