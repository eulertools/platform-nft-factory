const AWS = require('aws-sdk');

const ddbClient = new AWS.DynamoDB();

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
  convertClassInstanceToMap: true,
};

/**
 * @param { any } table
 * @param { any } key
 */
 const deleteItem = async (table, key) => {

  const params = {
    TableName: table,
    Key: AWS.DynamoDB.Converter.marshall(key),
  };

  await ddbClient.deleteItem(params).promise();
}

/**
 * @param { any } search
 */
const getItems = async (search) => {

  if(search.ExclusiveStartKey) {
    search.ExclusiveStartKey = AWS.DynamoDB.Converter.marshall(search.ExclusiveStartKey);
  }

  const response = await ddbClient.query(search).promise();

  if(response.Count && response.Items && response.Count > 0) {

      return response.Items.map((item) => AWS.DynamoDB.Converter.unmarshall(item, marshallOptions));
  }

  return [];
}

/**
 * @param { any } search
 */
const getItem = async (search) => {

    const response = await getItems(search);

    if(response.length > 0) return response[0];

    return undefined;
}

/**
 * @param { any } table
 * @param { any } key
 * @param { any } value
 */
const updateItem = async (table, key, value) => {

    let updateExpression = "SET ";
    
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
  
    const valueMarshal = AWS.DynamoDB.Converter.marshall(value, marshallOptions);
  
    const keys = Object.keys(key);
  
    Object.keys(value).forEach((entry) => {
      if (!keys.includes(entry)) {
        updateExpression = `${updateExpression} #${entry} = :${entry}, `;
        expressionAttributeNames[`#${entry}`] = entry;
        expressionAttributeValues[`:${entry}`] = valueMarshal[entry];
      }
    })
  
    updateExpression = updateExpression.substring(0, updateExpression.lastIndexOf(','));
  
    const params = {
      TableName: table,
      Key: AWS.DynamoDB.Converter.marshall(key),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    };
  
    // @ts-ignore
    await ddbClient.updateItem(params).promise();
}

exports.getItem = getItem;
exports.getItems = getItems;
exports.updateItem = updateItem;
exports.deleteItem = deleteItem;