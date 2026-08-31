const OSClient = require("/opt/nodejs/opensearch");
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

    const client = await OSClient.getClient();

    const size = event.queryStringParameters?.size || 16;
    const from = event.queryStringParameters?.from || 0;
    const sort = event.queryStringParameter?.sort;

    const query = {
      query: {
        match_phrase: {
          collection: identifier
        }
      }
    };

    const params = {
      index: 'poxme_nft_v1',
      body: {
        ...query,
        size,
        from,
        _source: ['blockchain', 'address', 'token_id', 'metadata', 'kind', 'token_uri, identifier'],
      },
    }

    if(sort) params.body.sort = sort;

    const { hits } = (await client.search(params)).body;

    body = {
      total: hits.total.value,
      results: hits.hits.map((hit) => {
        delete hit._source.user_sub;
        return hit._source;
      })
    }

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