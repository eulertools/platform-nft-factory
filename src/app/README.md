# React SSR example with Razzle and Redux.

## How to use

<!-- START install generated instructions please keep comment here to allow auto update -->


- Clone and install dependencies first:

<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN yarn update-examples TO UPDATE -->

```bash

git clone https://github.com/eulertools/poxme-ssr-prototype.git

yarn install

```

- Create an .env file. There is an example at .env.example.

- Ask for the npm token to use the ui-kit:

```bash

echo "<token>" > .npmrc

```

- Then just run the project:

```bash

yarn start

```

- How to deploy to AWS:

```bash

aws configure

echo '{"NODE_ENV": "development" }' | jq '.' > mycreds.json

aws secretsmanager create-secret --name MyRazzleAppEnvironmentSecretDevelopment \
    --description "My Development secrets created with the CLI" \
    --secret-string file://mycreds.json > arn.json
    
arn=($(cat arn.json | jq --raw-output '.ARN'))

echo $arn

aws ssm put-parameter --name=MyRazzleAppSecretsArnDevelopment --value=$arn

yarn cdk bootstrap

yarn cdk deploy

```



<!-- END install generated instructions please keep comment here to allow auto update -->




