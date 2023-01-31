/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

const { IS_OFFLINE } = process.env;
// Set environment variables that are convenient when testing locally with "serverless offline"
if (IS_OFFLINE === 'true') {
  // https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-configuration.html#xray-sdk-nodejs-configuration-envvars
  process.env.AWS_XRAY_CONTEXT_MISSING = 'LOG_ERROR';
  process.env.AWS_XRAY_LOG_LEVEL = 'silent';
}
