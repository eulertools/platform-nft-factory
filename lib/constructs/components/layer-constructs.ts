import { Stack, StackProps } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface ConstructProps extends StackProps {
  layerName: string;
  description: string;
}

export class LayerConstruct extends Construct {

  public readonly layer: lambda.LayerVersion;

  constructor(stack: Stack, id: string, props?: ConstructProps) {
    super(stack, id);

    const { layerName, description } = props!;

    const layer = new lambda.LayerVersion(this, `Layer`, {
        compatibleRuntimes: [
          lambda.Runtime.NODEJS_14_X,
        ],
        code: lambda.Code.fromAsset(`src/layers/${layerName}`),
        description,
    });
  
    this.layer = layer;
  }
}
