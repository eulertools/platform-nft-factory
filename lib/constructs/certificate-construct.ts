import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface ConstructProps extends StackProps {
  prefixPlatform: string;
  domain:string;
  hostedZone: string;
}

export class CertificateConstruct extends Construct {

  public readonly publicZone: route53.IHostedZone;
  public readonly certificate: certificatemanager.Certificate;
  public readonly crossRegionCertificate: certificatemanager.Certificate;

  constructor(stack: Stack, id: string, props?: ConstructProps) {
    super(stack, id);

    const { hostedZone, prefixPlatform, domain } = props!;

    const region = Stack.of(this).region;

    const publicZone = route53.HostedZone.fromLookup(this, 'PublicZone', {
      privateZone: false,
      domainName: hostedZone,
    });

    this.publicZone = publicZone;

    const certificate = new certificatemanager.Certificate(this, 'PublicCertificate', {
      domainName: domain,
      subjectAlternativeNames: [ "*." + domain ],
      validation: certificatemanager.CertificateValidation.fromDns(publicZone),
    });

    let crossCertificate = certificate;

    if(region !== 'us-east-1') {
      crossCertificate = new certificatemanager.DnsValidatedCertificate(this, 'CrossRegionCertificate', {
        domainName: domain,
        hostedZone: publicZone,
        subjectAlternativeNames: [ "*." + domain ],
        region: 'us-east-1',
      });
    }

    this.certificate = certificate;
    this.crossRegionCertificate = crossCertificate;

    new ssm.StringParameter(this, `SSMPublicCertificate`, {
      stringValue: certificate.certificateArn,
      parameterName: `/platform/${prefixPlatform}/public-cert`,
    });

    new ssm.StringParameter(this, `SSMCrossRegionCertificate`, {
      stringValue: crossCertificate.certificateArn,
      parameterName: `/platform/${prefixPlatform}/cross-region-public-cert`,
    });
  }
}
