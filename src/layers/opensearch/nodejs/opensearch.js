const { Client } = require('@opensearch-project/opensearch');
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const createAwsOpensearchConnector = require("aws-opensearch-connector");

const host = 'https://' + (process.env.ES_DOMAIN);

exports.getClient = async () => {
  const awsCredentials = await defaultProvider()();
  const connector = createAwsOpensearchConnector({
      credentials: awsCredentials,
      region: process.env.AWS_REGION,
      getCredentials: function(cb) {
          return cb();
      }
  });
  return new Client({
      ...connector,
      node: host,
  });
}

