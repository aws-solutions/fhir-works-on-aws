/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

// Imports
const fs = require('fs');
const _regex = /[\w]*AssetParameters/g; //this regular express also takes into account lambda functions defined in nested stacks

// Paths
const global_s3_assets = '../global-s3-assets';

const getAllAssetParameterKeys = (parameters) =>
  Object.keys(parameters).filter((key) => key.search(_regex) > -1);

// For each template in global_s3_assets ...
fs.readdirSync(global_s3_assets).forEach((file) => {
  // Import and parse template file
  const raw_template = fs.readFileSync(`${global_s3_assets}/${file}`);
  let template = JSON.parse(raw_template);

  // Clean-up Lambda function code dependencies
  const resources = template.Resources ? template.Resources : {};
  const lambdaFunctions = Object.keys(resources).filter(function (key) {
    return resources[key].Type === 'AWS::Lambda::Function';
  });
  lambdaFunctions.forEach(function (f) {
    const fn = template.Resources[f];
    if (fn.Properties.Code.hasOwnProperty('S3Bucket')) {
      // Set the S3 key reference
      let artifactHash = Object.assign(fn.Properties.Code.S3Key);
      artifactHash = artifactHash.replace(_regex, '');
      artifactHash = artifactHash.substring(0, artifactHash.indexOf('.zip'));
      const assetPath = `asset${artifactHash}`;
      fn.Properties.Code.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${assetPath}.zip`;
      // Set the S3 bucket reference
      fn.Properties.Code.S3Bucket = {
        'Fn::Sub': '%%BUCKET_NAME%%-${AWS::Region}'
      };
      // Set the handler
      const handler = fn.Properties.Handler;
      fn.Properties.Handler = `${assetPath}/${handler}`;
    }
  });

  const AppSyncSchemas = Object.keys(resources).filter(function (key) {
    return resources[key].Type === 'AWS::AppSync::GraphQLSchema';
  });

  AppSyncSchemas.forEach(function (f) {
    const appSyncfn = template.Resources[f];

    if (appSyncfn.Properties.hasOwnProperty('DefinitionS3Location')) {
      // Set the S3 key reference

      let artifactgql = Object.assign(appSyncfn.Properties.DefinitionS3Location);
      let gqlKey = '';

      for (const [key, value] of Object.entries(artifactgql)) {
        const artifactgqlArray = value.split('/');
        gqlKey = artifactgqlArray[artifactgqlArray.length - 1];
      }

      appSyncfn.Properties.DefinitionS3Location = {
        'Fn::Sub': 's3://%%BUCKET_NAME%%-${AWS::Region}/' + gqlKey
      };
    }
  });

  // Clean-up Lambda Layer code dependencies
  const lambdaLayers = Object.keys(resources).filter(function (key) {
    return resources[key].Type === 'AWS::Lambda::LayerVersion';
  });
  lambdaLayers.forEach(function (l) {
    const layer = template.Resources[l];
    if (layer.Properties.Content.hasOwnProperty('S3Bucket')) {
      // Set the S3 key reference
      let artifactHash = Object.assign(layer.Properties.Content.S3Key);
      artifactHash = artifactHash.replace(_regex, '');
      artifactHash = artifactHash.substring(0, artifactHash.indexOf('.zip'));
      const assetPath = `asset${artifactHash}`;
      layer.Properties.Content.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${assetPath}.zip`;
      // Set the S3 bucket reference
      layer.Properties.Content.S3Bucket = {
        'Fn::Sub': '%%BUCKET_NAME%%-${AWS::Region}'
      };
    }
  });

  // Clean-up parameters section
  const parameters = template.Parameters ? template.Parameters : {};
  const assetParameters = getAllAssetParameterKeys(parameters);
  assetParameters.forEach(function (a) {
    template.Parameters[a] = undefined;
  });

  // Output modified template file
  const output_template = JSON.stringify(template, null, 2);
  fs.writeFileSync(`${global_s3_assets}/${file}`, output_template);
});
