import { Construct } from "constructs";
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { App, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Code } from 'aws-cdk-lib/aws-lambda';
import * as iam from "aws-cdk-lib/aws-iam";
import { Effect } from 'aws-cdk-lib/aws-iam';
import * as route53 from "aws-cdk-lib/aws-route53";
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as path from "path";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";

const getParam = (scope: Construct, name: string) => {
  return ssm.StringParameter.valueForStringParameter(scope, name);
};
interface ConfigProps extends StackProps {
  name: string;
}

interface AppStackProps extends ConfigProps {
  prefixPlatform:string;
  hostedZone: string;
  domain:string;
}

export class RazzleCdkStack extends Stack {

  constructor(app: App, id: string, props: AppStackProps) {

    super(app, id, props);

    const { prefixPlatform, hostedZone, domain } = props!;

    /**
     * S3 bucket to the /public folder
     */
    const publicBucketName = `poxme-reactssr-prototype`;
    const bucketPublicFiles = new s3.Bucket(this, publicBucketName, {
      publicReadAccess: true,
      bucketName: publicBucketName.toLowerCase(),
    });
    /**
     * Store S3 bucket name
     */
    new ssm.StringParameter(this, `MyRazzleAppBucketAssetsName`, {
      description: `My Razzle App S3 Bucket Name for Assets on `,
      parameterName: `/${props.name}/S3/Assets/Name`,
      stringValue: bucketPublicFiles.bucketName,
    });
    /**
     * Store S3 domainName name
     */
    new ssm.StringParameter(this, `MyRazzleAppBucketAssetsDomainName`, {
      description: `My Razzle App S3 Bucket DomainName for Assets on `,
      parameterName: `/${props.name}/S3/Assets/DomainName`,
      stringValue: bucketPublicFiles.bucketDomainName,
    });
    /**
     * Deploy public folder of build to `poxme-reactssr-prototype-` bucket
     */
    new s3Deployment.BucketDeployment(this, `${publicBucketName}-deploy`, {
      sources: [s3Deployment.Source.asset(path.join(
        __dirname,
        '../../src/app/build/public'
      ))],
      destinationBucket: bucketPublicFiles,
    });

    let environment: { [key: string]: string } = {
      RAZZLE_CONTRACT: 'bsc~0xb4d03843ea821cb1892c5163c37f196073df5288',
      RAZZLE_API_NFT:'https://nft.api.prod.euler.tools',
      RAZZLE_API_PREMIOS_EFICACIA: 'https://api.prod.premioseficacianft.com',
      RAZZLE_URL_SEARCH: 'https://premioseficacianft.com'
    };
    // for (const key of environmentKeys) {
    //   environment[key] = environmentSecret.secretValueFromJson(key).unsafeUnwrap().toString();
    // }
    environment['PUBLIC_BUCKET_DOMAIN'] = bucketPublicFiles.bucketRegionalDomainName;
    /**
     * Razzle SSR Function
     */
    const myRazzleAppSsrFunction = new lambda.Function(this, `MyRazzleAppSSRFunction`, {
      description: `Lambda Function that runs My Razzle App SSR on `,
      code: lambda.Code.fromAsset(path.join(
        __dirname,
        '../../src/app/build/'
      ), 
      {
        exclude: ['public', 'static', '*.json'],
      }),
      handler: 'server.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 512,
      timeout: Duration.seconds(5),
      environment,
      tracing: lambda.Tracing.ACTIVE,
    });
    /**
     * Razzle ApiGateway
     */
 
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

    const api = new LambdaRestApi(this, `RestApi`, {
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

    const domainName = `app.${domain}`;

    console.log(domainName);

    api.addDomainName("platform-api", {
      domainName,
      certificate: certificate,
    });

    const zone = route53.HostedZone.fromHostedZoneAttributes(
      this, 'HostedZone',
      {
        zoneName: `app.${domain}`,
        hostedZoneId: publicZone.hostedZoneId,
      }
    );

    new route53.ARecord(this, "ApiARecord", {
      zone,
      target: route53.RecordTarget.fromAlias(
        new route53targets.ApiGateway(api)
      ),
    });

    const integration = new apigateway.LambdaIntegration(myRazzleAppSsrFunction);
    const root = api.root;
    const pathApi = api.root.addResource('{proxy+}');
    root.addMethod('GET', integration);
    pathApi.addMethod('ANY', integration);
    /**
     * Razzle ApiGateway ID
     */
    new ssm.StringParameter(this, `MyRazzleAppAPIGatewayRestId`, {
      description: `My Razzle App ApiGateway ID`,
      parameterName: `/${props.name}/APIGateway/ApiId`,
      stringValue: api.restApiId,
    });
  }
}