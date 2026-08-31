const DynamoDB = require("/opt/nodejs/dynamodb");
const S3Utils = require("/opt/nodejs/s3-utils");
const HttpUtils = require("/opt/nodejs/http-utils");

const AWS = require('aws-sdk');

/**
 * @param { any } event
 */
exports.handler = async (event) => {

  console.log("Events: ", event);
  let body;
  let statusCode = 200;
  const headers = HttpUtils.getHeaders(event);

   try {

    const parseBody = JSON.parse(event.body);

    const { contentType } = parseBody;

    if (!contentType) {
      return {
        statusCode: 400,
        body: "Bad request"
      };
    }

    const extension = S3Utils.mimeDB[contentType]?.extensions[0];

    const user_sub = event.requestContext.authorizer.claims.sub;

    const identifier = AWS.util.uuid.v4();

    const startPath = process.env.START_PATH ? process.env.START_PATH : "tmp";

    const path = `${startPath}/${user_sub}/${AWS.util.uuid.v4()}.${extension}`;

    const signedUrl = await S3Utils.getPresignedUrl(path, contentType, user_sub);
    
    const key = {
      user_sub,
      identifier
    }

    const value = {
      bucket: {
        name: process.env.BUCKET_NAME,
        path
      },
      content_type: contentType,
      extension,
      create_date: new Date().toISOString()
    }

    await DynamoDB.updateItem(process.env.TABLE_NAME, key, value );

    body = new HttpUtils.Response(statusCode, "Successful request", 
      {
          identifier,
          presigned_url: signedUrl
      }
    );

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
