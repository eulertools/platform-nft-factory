const DynamoDB = require("/opt/nodejs/dynamodb");
const HttpUtils = require("/opt/nodejs/http-utils");

/**
 * @param { any } event
 */
 exports.handler = async (event) => {

  console.log("Events: ", event);
  let body;
  let statusCode = 200;
  const headers = HttpUtils.getHeaders(event);

  try {

    if(!event.pathParameters.identifier) {
      throw new HttpUtils.ValidationError(400, 'INVALID_PARAMS', 'Invalid Params');
    }

    const { identifier} = event.pathParameters;

    const result = await DynamoDB.getItem({
      TableName: process.env.TABLE_COLLECTION,
      IndexName : 'identifierIndex',
      KeyConditionExpression: '#identifier = :identifier',
      ExpressionAttributeNames:{
          '#identifier': 'identifier',
          '#blockchain': 'blockchain',
          '#address': 'address',
          '#name': 'name',
          '#image': 'image',
      },
      ExpressionAttributeValues: {
        ':identifier': { S: identifier }
      },
      ProjectionExpression: '#identifier, #blockchain, #address, #name, #image'
    });

    if(!result) {
      throw new HttpUtils.ValidationError(204, 'NO_CONTENT', 'No Content');
    }

    body = result;

  } catch (err) {
    const response = HttpUtils.handleError(err);
    body = response.body;
    statusCode = response.statusCode
  } finally {
    console.log({ data: body });
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers
  };
 }