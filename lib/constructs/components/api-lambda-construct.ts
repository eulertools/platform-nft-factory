import { Duration, Stack, StackProps } from "aws-cdk-lib";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
export interface ConstructProps extends StackProps {
  pathLambda: string;
  description: string;
  environment: any;
  layers: lambda.LayerVersion[];
  duration?: Duration;
}

export class ApiLambdaConstruct extends Construct {

  public readonly lambdaFunc: lambda.Function;
  public readonly integration: LambdaIntegration;

  constructor(stack: Stack, id: string, props?: ConstructProps) {
    super(stack, id);

    const { pathLambda, description, environment, layers } = props!;

    let duration = Duration.minutes(1);

    if(props?.duration) duration = props.duration;

    const func = new lambda.Function(
      this, 'ApiLambda',
      {
        handler: "index.handler",
        description: description,
        code: lambda.Code.fromAsset(path.join(
          __dirname,
          `/../../../src/platform-apis/${pathLambda}`
        )),
        runtime: lambda.Runtime.NODEJS_14_X,
        timeout: duration,
        environment
      }
    );

    for(const layer of layers) {
      func.addLayers(layer);
    }

    const integration = new LambdaIntegration(func);

    this.lambdaFunc = func;
    this.integration = integration;
  }
}
