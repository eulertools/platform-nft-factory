import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";

export interface ConstructProps extends StackProps {
  prefixPlatform: string;
  domain: string;
  hostedZone: string;
  certificate: certificatemanager.Certificate
}

export class CdnConstruct extends Construct {

  constructor(stack: Stack, id: string, props?: ConstructProps) {
    super(stack, id);

    const { hostedZone, prefixPlatform, domain, certificate } = props!;

    const assetsBucket = new s3.Bucket(this, "AssetsBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    assetsBucket.addCorsRule({
      allowedMethods: [
        s3.HttpMethods.GET,
        s3.HttpMethods.POST,
        s3.HttpMethods.PUT,
      ],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
    })

    new ssm.StringParameter(this, "SSMAssetsBucket", {
      stringValue: assetsBucket.bucketName,
      parameterName: `/platform/${prefixPlatform}/assets-bucket`,
    });

    const publicZone = route53.HostedZone.fromLookup(this, 'PublicZone', {
      privateZone: false,
      domainName: hostedZone,
    });

    const cf = new cloudfront.Distribution(this, "CdnDistribution", {
      defaultBehavior: { 
        origin: new origins.S3Origin(assetsBucket),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT
      },
      domainNames: [ `assets.${domain}` ],
      certificate: certificate,
    });

    const zone = route53.HostedZone.fromHostedZoneAttributes(
      this, 'HostedZone',
      {
        zoneName: `assets.${domain}`,
        hostedZoneId: publicZone.hostedZoneId,
      }
    );

    new route53.ARecord(this, "CdnARecord", {
      zone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cf)),
    });

    new route53.AaaaRecord(this, "CdnAliasRecord", {
      zone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cf)),
    });
  }
}
