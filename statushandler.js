const o365repository = require('./repository');

module.exports.currentstatus = async event => {
    return {
        statusCode: 200,
        body: JSON.stringify(await repository.getData('latest', 'latest'))
      };
}

module.exports.latestdays = async event => {
  console.log(event);
  return {
      statusCode: 200,
      body: JSON.stringify(await repository.getLastNDays(event.pathParameters.days))
    };
}