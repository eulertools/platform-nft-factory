import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { DynamoStreamConstruct } from "./components/dynamodb-stream-construct";
import { ILayerVersion } from "aws-cdk-lib/aws-lambda";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import { DynamoDBStreamOpenSearchConstruct } from "./components/dynamodb-stream-opensearch-construct";

export interface ConstructProps extends StackProps {
  prefixPlatform: string;
  domain:string;
  hostedZone: string;
  opensearchLayer: ILayerVersion;
}

export class StorageConstruct extends Construct {

  constructor(stack: Stack, id: string, props?: ConstructProps) {
    super(stack, id);

    const { prefixPlatform, opensearchLayer } = props!;

    const domain:opensearch.IDomain = opensearch.Domain.fromDomainEndpoint(
      this, 'OSDomain', 'https://opensearch2.dev.euler.tools');

    const tableCollectionNFT = new DynamoStreamConstruct(stack, 'CollectionDynamoDB', {
      prefixPlatform,
      prefix: 'collection',
      partitionKey: { name: 'user_sub', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'identifier', type: dynamodb.AttributeType.STRING }
    })

    tableCollectionNFT.table.addGlobalSecondaryIndex({
      indexName: 'blockchainIndex',
      partitionKey: {name: 'blockchain', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'address', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    tableCollectionNFT.table.addGlobalSecondaryIndex({
      indexName: 'identifierIndex',
      partitionKey: { name: 'identifier', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    new DynamoDBStreamOpenSearchConstruct(this, 'CollectionOpenSearchStream', {
      stream: tableCollectionNFT.stream,
      domain,
      index: 'poxme_collection_v1',
      pk: 'identifier',
      opensearchLayer
    })

    const tableNFT = new DynamoStreamConstruct(stack, 'NftDynamoDB', {
      prefixPlatform,
      prefix: 'nft',
      partitionKey: { name: 'user_sub', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'identifier', type: dynamodb.AttributeType.STRING }
    })

    tableNFT.table.addGlobalSecondaryIndex({
      indexName: 'blockchainIndex',
      partitionKey: {name: 'contract', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'token_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    tableNFT.table.addGlobalSecondaryIndex({
      indexName: 'identifierIndex',
      partitionKey: { name: 'identifier', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    new DynamoDBStreamOpenSearchConstruct(this, 'NftOpenSearchStream', {
      stream: tableNFT.stream,
      domain,
      index: 'poxme_nft_v1',
      pk: 'identifier',
      opensearchLayer
    })

    const whitelistTable= new DynamoStreamConstruct(stack, 'WhitelistDynamoDB', {
      prefixPlatform,
      prefix: 'whitelist',
      partitionKey: { name: 'token_identifier', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'identifier', type: dynamodb.AttributeType.STRING }
    })

    whitelistTable.table.addLocalSecondaryIndex({
      indexName: 'ticketHashIndex',
      sortKey: { name: 'ticket_hash', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    })
  }
}
