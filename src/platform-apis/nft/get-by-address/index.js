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

    if(!event.pathParameters.blockchain || 
       !event.pathParameters.address || 
       !event.pathParameters.token_id) {

      throw new HttpUtils.ValidationError(400, 'INVALID_PARAMS', 'Invalid Params');
    }

    const { blockchain, token_id } = event.pathParameters;

    const address = event.pathParameters.address.toLowerCase();

    const result = await DynamoDB.getItem({
      TableName: process.env.TABLE_PLATFORM_NFT,
      IndexName : 'blockchainIndex',
      KeyConditionExpression: '#contract = :contract AND #token_id = :token_id',
      ExpressionAttributeNames:{
          '#contract': 'contract',
          '#token_id': 'token_id',
          '#blockchain': 'blockchain',
          '#address': 'address',
          '#metadata': 'metadata',
          '#kind': 'kind',
          '#token_uri': 'token_uri'
      },
      ExpressionAttributeValues: {
        ':contract': { S: `${blockchain}~${address}` },
        ':token_id': { S: token_id } 
      },
      ProjectionExpression: '#blockchain, #address, #token_id, #metadata, #kind, #token_uri'
    });

    if(!result) throw new HttpUtils.ValidationError(204, 'NO_CONTENT', 'No Content');

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