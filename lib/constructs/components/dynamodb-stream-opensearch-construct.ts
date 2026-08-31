import { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Duration } from 'aws-cdk-lib';
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Effect } from 'aws-cdk-lib/aws-iam';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';

export interface ConstructProps {
  stream: kinesis.IStream;
  domain: opensearch.IDomain;
  index: string;
  pk: string;
  opensearchLayer: ILayerVersion;
}

export class DynamoDBStreamOpenSearchConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ConstructProps) {
    super(scope, id);

    const {stream, domain, index, pk, opensearchLayer } = props!

    const syncLambda = new lambda.Function(this, `Lambda`, {
      description: 'Kinesis streaming from Dynamo to OpenSearch',
      memorySize: 512,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(1),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(
        __dirname,
        '/../../../src/lambdas/opensearch-sync'
      )),
      allowPublicSubnet: true,
      environment: { 
        ES_DOMAIN: `${domain.domainEndpoint}`,
        ES_INDEX: index,
        PK: pk
      },
      layers: [ opensearchLayer ]
    });

    domain.grantReadWrite(syncLambda);
    syncLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: Effect.ALLOW,
      resources: [domain.domainArn],
      actions: ['es:ESHttp*']
    }));
    stream.grantRead(syncLambda);
  
    const eventSource = new lambdaEventSources.KinesisEventSource(stream, {
      batchSize: 200,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    syncLambda.addEventSource(eventSource);
  }
}