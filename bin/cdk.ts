#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PlatformNftFactoryStack } from '../lib/stacks/platform-stack';
import { RazzleCdkStack } from '../lib/stacks/razzle-cdk-stack';

const app = new cdk.App();

const hostedZone =
  process.env.CDK_DEFAULT_ACCOUNT == process.env.CDK_DEV_ACCOUNT
    ? "dev.euler.tools"
    : "prod.euler.tools";

const domain = `poxme.${hostedZone}`

// const branch = process.env.CDK_DEFAULT_ACCOUNT == process.env.CDK_DEV_ACCOUNT ? "development" : "main";
const branch = "main";

new PlatformNftFactoryStack(app, 'PlatformNftFactory', {
  prefixPlatform: 'nft-factory',
  domain,
  hostedZone,
  branch,
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || 'COGNITO_USER_POOL_ID',
  description: "Platform to create and edit nft",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  tags: {app: "platform-nft-factory", domain: "euler.tools", owner: "euler.tools"}
});

new RazzleCdkStack(app, "RazzleCdkStack", {
  name: "basic",
  prefixPlatform: 'nft-factory',
  domain,
  hostedZone,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});