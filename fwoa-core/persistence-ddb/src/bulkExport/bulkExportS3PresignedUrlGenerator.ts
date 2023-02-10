/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { STS } from 'aws-sdk';
import AWS from '../AWS';
import { BulkExportResultsUrlGenerator } from './bulkExportResultsUrlGenerator';

const EXPIRATION_TIME_SECONDS = 1800;
const EXPORT_CONTENT_TYPE = 'application/fhir+ndjson';
const EXPORT_RESULTS_SIGNER_ROLE_ARN = process.env.EXPORT_RESULTS_SIGNER_ROLE_ARN || '';

export class BulkExportS3PresignedUrlGenerator implements BulkExportResultsUrlGenerator {
  private readonly stsClient: STS;

  constructor() {
    this.stsClient = new AWS.STS();
  }

  async getUrls({ s3Keys, exportBucket }: { exportBucket: string; s3Keys: string[] }) {
    const assumeRoleResponse = await this.stsClient
      .assumeRole({
        RoleArn: EXPORT_RESULTS_SIGNER_ROLE_ARN,
        RoleSessionName: 'signBulkExportResults',
        DurationSeconds: EXPIRATION_TIME_SECONDS
      })
      .promise();

    const s3 = new AWS.S3({
      credentials: {
        accessKeyId: assumeRoleResponse.Credentials!.AccessKeyId,
        secretAccessKey: assumeRoleResponse.Credentials!.SecretAccessKey,
        sessionToken: assumeRoleResponse.Credentials!.SessionToken
      }
    });

    const urls: string[] = await Promise.all(
      s3Keys.map(async (key) =>
        s3.getSignedUrlPromise('getObject', {
          Bucket: exportBucket,
          Key: key,
          Expires: EXPIRATION_TIME_SECONDS,
          ResponseContentType: EXPORT_CONTENT_TYPE
        })
      )
    );

    return {
      requiresAccessToken: false,
      urls
    };
  }
}
