import { CfnOutput, Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApiStack } from "../stacks/apis-stack";

interface AppStackProps extends StageProps {
  prefixPlatform: string;
  hostedZone: string;
  domain:string;
  cognitoUserPoolId:string;
}

export class ApisDeployStage extends Stage {

  public readonly apiEndpoint: CfnOutput;

  constructor(scope: Construct, id: string, props?: AppStackProps) {
    super(scope, id, props);

    const { prefixPlatform, hostedZone, domain, cognitoUserPoolId } = props!;

    const service = new ApiStack(this, "ApiPlatformNft",
      {  prefixPlatform, hostedZone, domain, cognitoUserPoolId }
    );

    this.apiEndpoint = service.apiEndpoint;
  }
}
