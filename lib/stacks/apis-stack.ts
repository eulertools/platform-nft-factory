import { CfnOutput, Duration, Fn, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AuthorizationType, CognitoUserPoolsAuthorizer, LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Code } from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ApiPresignedFileConstruct } from "../constructs/components/api-presigned-file-construct";
import { LayerConstruct } from "../constructs/components/layer-constructs";
import { ApiLambdaConstruct } from "../constructs/components/api-lambda-construct";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";

interface AppStackProps extends StackProps {
  prefixPlatform:string;
  hostedZone: string;
  domain:string;
  cognitoUserPoolId:string;
}

export class ApiStack extends Stack {

  public readonly apiEndpoint: CfnOutput;

  constructor(scope: Construct, id: string, props?: AppStackProps) {
    super(scope, id, props);

    const { prefixPlatform, hostedZone, domain, cognitoUserPoolId } = props!;

    const certificateArn = ssm.StringParameter.fromStringParameterName(
      this, "SSMPublicCert",
      `/platform/${prefixPlatform}/public-cert`
    ).stringValue;

    const certificate = Certificate.fromCertificateArn(
      this,
      "PublicCertificate",
      certificateArn
    );

    const publicZone = route53.HostedZone.fromLookup(this, "PublicZone", {
      domainName: hostedZone,
      privateZone: false,
    });

    const apiResourcePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["execute-api:Invoke"],
          principals: [new iam.AnyPrincipal()],
          resources: ["execute-api:/*"],
        }),
      ],
    });

    const dynamodbLayer = new LayerConstruct(this, 'DynamoDBLayer', {
      layerName: 'dynamodb',
      description: 'Layer utility for dynamodb'
    });

    const opensearchLayer = new LayerConstruct(this, 'OpenSearchLayer', {
      layerName: 'opensearch',
      description: 'Layer utility for opensearch'
    });

    const s3UtilsLayer = new LayerConstruct(this, 'S3UtilsLayer', {
      layerName: 's3-utils',
      description: 'Layer utility for s3'
    });

    const httpUtilsLayer = new LayerConstruct(this, 'HttpUtilsLayer', {
      layerName: 'http-utils',
      description: 'Layer utility for http'
    });

    const handler = new lambda.Function(this, `LogsFunction`, {
      handler: "handler",
      description: "Create lambda that logs events",
      code: Code.fromInline(`
        exports.handler = async (event) => {
          console.log('event: ', event)
        };
      `),
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: Duration.minutes(1),
    });

    const restApi = new LambdaRestApi(this, `RestApi`, {
      handler: handler,
      description: "Platform API NFT",
      deployOptions: {
        stageName: process.env.ENV,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"]
      },
      restApiName: "platform-nft",
      proxy: false,
      policy: apiResourcePolicy,
    });

    const domainName = `api.${domain}`;

    restApi.addDomainName("platform-api", {
      domainName,
      certificate: certificate,
    });

    const zone = route53.HostedZone.fromHostedZoneAttributes(
      this, 'HostedZone',
      {
        zoneName: `api.${domain}`,
        hostedZoneId: publicZone.hostedZoneId,
      }
    );

    new route53.ARecord(this, "ApiARecord", {
      zone,
      target: route53.RecordTarget.fromAlias(
        new route53targets.ApiGateway(restApi)
      ),
    });

    const userPool = cognito.UserPool.fromUserPoolId(
      this,
      "CognitoUserPoolId",
      cognitoUserPoolId
    );

    // const authorizer = new CognitoUserPoolsAuthorizer(
    //   this,
    //   "ApiGatewayCognitoAuthorizer",
    //   {
    //     cognitoUserPools: [userPool],
    //     identitySource: "method.request.header.Authorization",
    //   }
    // );

    // const optionsCognito = {
    //   authorizer: authorizer,
    //   authorizationType: AuthorizationType.COGNITO,
    // };

    // const bucketName = ssm.StringParameter.fromStringParameterName(
    //   this,
    //   "SSMAssetsBucket",
    //   `/platform/${prefixPlatform}/assets-bucket`
    // ).stringValue;

    // const assetsBucket = s3.Bucket.fromBucketName(
    //   this, 'AssetsBucket', bucketName
    // );

    const collectionTableArn = ssm.StringParameter.fromStringParameterName(
      this,
      "SSMCollectionTable",
      `/platform/${prefixPlatform}/table/collection`
    );
    const collectionTable = dynamodb.Table.fromTableArn(
      this,'CollectionDynamoDB', collectionTableArn.stringValue);

    const nftTableArn = ssm.StringParameter.fromStringParameterName(
      this,
      "SSMNftTable",
      `/platform/${prefixPlatform}/table/nft`
    );
    const nftTable = dynamodb.Table.fromTableArn(
      this,'NftDynamoDB', nftTableArn.stringValue);

    const osdomain:opensearch.IDomain = opensearch.Domain.fromDomainEndpoint(
        this, 'OSDomain', 'https://opensearch2.dev.euler.tools');

    // const apiPresigned = new ApiPresignedFileConstruct(this, "PresignedFileApi", {
    //   prefixPlatform,
    //   restApi,
    //   bucket: assetsBucket,
    //   authorizer,
    //   layers: [ httpUtilsLayer.layer, dynamodbLayer.layer, s3UtilsLayer.layer]
    // })

    const lambdaGetCollection = new ApiLambdaConstruct(this, 'GetCollectionLambda', {
      pathLambda: 'collection/get',
      description: 'Get collection by id',
      environment: {
        TABLE_COLLECTION: collectionTable.tableName
      },
      layers: [ httpUtilsLayer.layer, dynamodbLayer.layer ]
    });

    collectionTable.grantReadData(lambdaGetCollection.lambdaFunc);
    
    lambdaGetCollection.lambdaFunc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query', 'dynamodb:Scan'],
        resources: [collectionTable.tableArn + '/index/*'],
      })
    );

    const lambdaGetNftsByCollection = new ApiLambdaConstruct(this, 'GetNftsByCollectionLambda', {
      pathLambda: 'collection/get-nfts',
      description: 'Get nfts by collection',
      environment: {
        ES_DOMAIN: `${osdomain.domainEndpoint}`,
      },
      layers: [ httpUtilsLayer.layer, opensearchLayer.layer ]
    });

    osdomain.grantRead(lambdaGetNftsByCollection.lambdaFunc);

    const lambdaGetNft = new ApiLambdaConstruct(this, 'GetNftLambda', {
      pathLambda: 'nft/get',
      description: 'Get nft by id',
      environment: {
        TABLE_NFT: nftTable.tableName
      },
      layers: [ httpUtilsLayer.layer, dynamodbLayer.layer ]
    });

    nftTable.grantReadData(lambdaGetNft.lambdaFunc);
    
    lambdaGetNft.lambdaFunc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query', 'dynamodb:Scan'],
        resources: [nftTable.tableArn + '/index/*'],
      })
    );

    const lambdaGetByAddressNft = new ApiLambdaConstruct(this, 'GetNftByAddressLambda', {
      pathLambda: 'nft/get-by-address',
      description: 'Get nft by address',
      environment: {
        TABLE_NFT: nftTable.tableName
      },
      layers: [ httpUtilsLayer.layer, dynamodbLayer.layer ]
    });

    nftTable.grantReadData(lambdaGetByAddressNft.lambdaFunc);

    lambdaGetByAddressNft.lambdaFunc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query', 'dynamodb:Scan'],
        resources: [nftTable.tableArn + '/index/*'],
      })
    );

    const collection = restApi.root.addResource("collection");

    const collectionIdentifier = collection.addResource("{identifier}");

    collectionIdentifier.addMethod("GET", lambdaGetCollection.integration);

    collectionIdentifier.addResource("nfts")
      .addMethod("GET", lambdaGetNftsByCollection.integration);

    const nft = restApi.root.addResource("nft");

    const nftIdentifier = nft.addResource("{identifier}");

    nftIdentifier.addMethod("GET", lambdaGetNft.integration);

    const blockchain = restApi.root.addResource("{blockchain}");

    blockchain
      .addResource("nft")
      .addResource("{address}")
      .addResource("{token_id}")
      .addMethod("GET", lambdaGetByAddressNft.integration);

    this.apiEndpoint = new CfnOutput(this, "Url", {
      value: restApi.url,
    });
  }
}
