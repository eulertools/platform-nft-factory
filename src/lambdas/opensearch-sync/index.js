const AWS = require('aws-sdk');
const OSClient = require("/opt/nodejs/opensearch");

const chunk = process.env.SIZE_CHUNK ? parseInt(process.env.SIZE_CHUNK) : 10;

const index = process.env.ES_INDEX;
const pk = process.env.PK;

exports.handler = async (event) => {
  console.log({message: 'Retrieving records from the Kinesis stream'});

  const records = event.Records.map((record) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf8');
    return JSON.parse(payload);
  }).filter((item) => item.dynamodb);

  const client = await OSClient.getClient();

  try {

    for (let i = 0, j = records.length; i < j; i += chunk) {

      const recordChunk = records.slice(i, i + chunk);

      const bodyBulk = (await Promise.all(recordChunk.map(async (record) => {

      const image = record.dynamodb.NewImage || record.dynamodb.OldImage;

      console.log(JSON.stringify(record));

      const id = image?.[pk].S;

      if (!id) {
        console.log(
          `Can not detect the ID of the document to index. Make sure the DynamoDB document has a field called '${process.env.PK}'`,
        );
        return undefined
      }

      if (record.eventName === 'REMOVE') {

        console.log(`Deleting document: ${id}`);

        return JSON.stringify({ "delete" : { "_index" : index, "_id" : id } }) + "\n";

      } else {

        const value = AWS.DynamoDB.Converter.output({ M: image });

        console.log(`Indexing document: ${id}`);

        return JSON.stringify({ "index" : { "_index" : index, "_id" : id } }) + "\n" + 
              JSON.stringify(value) + "\n";
          
      }
      }))).filter((element) => element).join('');

      if(bodyBulk) console.log(await client.bulk({body: bodyBulk}));
    }

  } catch (error) {
    console.log(error);
    throw error;
  }

  return {
    body: JSON.stringify({
      message: 'Executed Lambda Successful',
    }),
    statusCode: 200,
  };
};
