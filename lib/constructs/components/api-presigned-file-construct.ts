import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AuthorizationType, CognitoUserPoolsAuthorizer, LambdaIntegration, LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { IBucket } from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { DynamoStreamConstruct } from "./dynamodb-stream-construct";
import { ApiLambdaConstruct } from "./api-lambda-construct";

export interface ConstructProps extends StackProps {
  prefixPlatform: string;
  restApi: LambdaRestApi;
  bucket: IBucket;
  authorizer: CognitoUserPoolsAuthorizer;
  layers: lambda.LayerVersion[];
}

export class ApiPresignedFileConstruct extends Construct {

  public readonly table: dynamodb.Table;

  public readonly func: lambda.Function;

  constructor(stack: Stack, id: string, props?: ConstructProps) {
    super(stack, id);

    const { prefixPlatform, restApi, bucket, authorizer, layers } = props!;

    const tablePresigned = new DynamoStreamConstruct(stack, 'PresignedFileDynamoDB', {
      prefixPlatform,
      prefix: 'presigned-file',
      partitionKey: { name: 'user_sub', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'identifier', type: dynamodb.AttributeType.STRING}
    });

    const lambdaApi = new ApiLambdaConstruct(stack, 'PresignedFileLambda', {
      pathLambda: 'extra/api-s3-presigned',
      description: 'Generate presigned url to put file',
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: tablePresigned.table.tableName
      },
      layers
    });
    
    const integration = new LambdaIntegration(lambdaApi.lambdaFunc);

    bucket.grantReadWrite(lambdaApi.lambdaFunc);
    tablePresigned.table.grantReadWriteData(lambdaApi.lambdaFunc);

    const presigned = restApi.root.addResource("presigned-file");

    const optionsCognito = {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    };

    presigned.addMethod("POST", integration, optionsCognito);

    this.table = tablePresigned.table;
    this.func = lambdaApi.lambdaFunc;
  }
}