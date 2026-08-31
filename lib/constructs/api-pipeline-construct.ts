import { Construct } from "constructs";
import { CodeBuildAction, GitHubSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { ApisDeployStage } from "../stages/apis-deploy-stage";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { BuildSpec, PipelineProject } from "aws-cdk-lib/aws-codebuild";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import * as iam from "aws-cdk-lib/aws-iam";

interface ConstructProps extends StackProps {
  prefixPlatform:string;
  hostedZone:string;
  domain:string;
  branch: string;
  cognitoUserPoolId:string;
}

export class ApiPipelineConstruct extends Construct {

  constructor(scope: Stack, id: string, props?: ConstructProps) {
    super(scope, id);

    const { prefixPlatform, hostedZone, domain, branch, cognitoUserPoolId } = props!;

    // const bucketName = ssm.StringParameter.fromStringParameterName(this, 'BucketName', `SharedArtifactsBucket`).stringValue
    // const artifactBucket = s3.Bucket.fromBucketName(this, 'ArtifactsBucket', bucketName);

    const githubToken = SecretValue.secretsManager("githubToken");

    // const codePipeline = new Pipeline(
    //   this, "Pipeline",
    //   {
    //     pipelineName: `cicd-${prefixPlatform}-pipeline`,
    //     artifactBucket,
    //     crossAccountKeys: true,
    //   }
    // );

    const pipeline = new CodePipeline(this, `CICDPipeline`, {
      // codePipeline,
      dockerEnabledForSynth: true,
      crossAccountKeys: true,
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.gitHub("eulertools/platform-nft-factory", branch, {
          authentication: githubToken,
        }),
        installCommands: ["npm install -g aws-cdk"],
        commands: [
          'echo "Platform API"',
          'git config --global url."https://".insteadOf ssh://git@',
          "npm ci",
          "npm i typescript",
          "cd src/layers",
          "find . -maxdepth 2 -type d \\( ! -name . \\) -exec bash -c 'cd '{}' && npm install' \\;",
          "cd ../platform-apis/",
          "find . -maxdepth 2 -type d \\( ! -name . \\) -exec bash -c 'cd '{}' && npm install' \\;",
          "cd ../../",
          "npx cdk synth",
        ],
        primaryOutputDirectory: "cdk.out",
      }),
    });

    const deployStage = new ApisDeployStage(this, "Deploy", {
      prefixPlatform,
      hostedZone,
      domain,
      cognitoUserPoolId,
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });

    pipeline.addStage(deployStage);
    // artifactBucket.grantReadWrite(codePipeline.role);
  }
}
