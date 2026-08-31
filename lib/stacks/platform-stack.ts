import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CertificateConstruct } from '../constructs/certificate-construct';
import { CdnConstruct } from '../constructs/cdn-construct';
import { StorageConstruct } from '../constructs/storage-construct';
import { ApiPipelineConstruct } from '../constructs/api-pipeline-construct';
import { LayerConstruct } from '../constructs/components/layer-constructs';

export interface PlatformStackProps extends cdk.StackProps {
  prefixPlatform: string;
  domain: string;
  hostedZone: string;
  branch:string;
  cognitoUserPoolId:string;
}

export class PlatformNftFactoryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: PlatformStackProps) {

    super(scope, id, props);

    const { hostedZone, prefixPlatform, domain, branch, cognitoUserPoolId } = props!;

    const certificate = new CertificateConstruct(this, 'PlatformCertificate', 
      { prefixPlatform, hostedZone, domain }
    );

    new CdnConstruct(this, 'PlatformCdn', 
      { 
        prefixPlatform, 
        hostedZone, 
        domain, 
        certificate: certificate.crossRegionCertificate
      }
    );

    const opensearchLayer = new LayerConstruct(this, 'OpenSearchLayer', {
      layerName: 'opensearch',
      description: 'Layer utility for opensearch'
    });

    new StorageConstruct(this, 'PlatformStorage', 
      { prefixPlatform, hostedZone, domain, opensearchLayer: opensearchLayer.layer }
    );

    new ApiPipelineConstruct(this,"ApiPipeline",
      { prefixPlatform, hostedZone, domain, branch, cognitoUserPoolId }
    );
  }
}
