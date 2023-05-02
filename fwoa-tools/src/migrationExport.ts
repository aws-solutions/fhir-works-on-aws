/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { AWSError, S3 } from 'aws-sdk';
import ExportHelper from './exportHelper';
import { getFhirClient, getFhirClientSMART } from './migrationUtils';

const MAX_ITEMS_PER_FOLDER: number = 10000;

if (process.argv.length < 3) {
  throw new Error('Invalid arguments. Usage: ts-node migrationExport.ts <boolean> <opt: ISO timestamp>');
}
// collect optional arguments
const smartClient: boolean = Boolean(process.argv[3]);
let since: string;
if (process.argv.length >= 4) {
  since = process.argv[3];
  try {
    since = new Date(since).toISOString();
  } catch (error) {
    throw new Error('Provided `since` parameter is not in correct format (ISO 8601)');
  }
}

async function startExport(): Promise<{
  jobId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportResponse: any;
}> {
  const fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
  const exportHelper = new ExportHelper(fhirClient);

  const exportJobUrl: string = await exportHelper.startExportJob({ since });
  const response = await exportHelper.getExportStatus(exportJobUrl);

  // return the last element of the split array, which is the jobId portion of the url
  const jobId = exportJobUrl.split('/').pop();

  return { jobId: jobId!, exportResponse: response };
}

async function sortExportIntoFolders(bucket: string, prefix: string): Promise<void> {
  const s3Client = new S3({
    region: process.env.API_AWS_REGION
  });
  let isTruncated = true;
  let marker;
  let numElementsInFolder = 0;
  let folderName = 0;
  while (isTruncated) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {};
    params.Bucket = bucket;
    if (prefix) params.Prefix = prefix;
    if (marker) params.Marker = marker;
    const response = await s3Client.listObjectsV2(params).promise();
    response.Contents?.forEach((item) => {
      // Sort into folders
      s3Client.copyObject(
        {
          Bucket: bucket,
          CopySource: item.Key!,
          Key: `${prefix}/${folderName}/${item.Key}`
        },
        function (error: AWSError, data: S3.CopyObjectOutput): void {
          if (error) {
            throw new Error('Error: resource failed to copy into folder, aborting...');
          }
          s3Client.deleteObject({
            Bucket: bucket,
            Key: item.Key!
          });
        }
      );
    });
    numElementsInFolder += response.Contents?.length || 0;
    if (numElementsInFolder >= MAX_ITEMS_PER_FOLDER) {
      numElementsInFolder = 0;
      folderName++;
    }

    isTruncated = response.IsTruncated!;
    if (isTruncated) {
      marker = response.Contents?.slice(-1)[0].Key;
    }
  }
}

startExport()
  .then(async (response) => {
    console.log('successfully completed export.');
    if (response.exportResponse.output.length === 0) {
      return;
    }
    const url: string = response.exportResponse.output[0].url;
    // url always starts with the following:
    // https://(smart-)fhir-service-dev-<bucketName>.s3.<region>.amazonaws.com/
    //                                              ^ split here first
    //           then here ^           ^ take last split
    const bucketName = url.split('.')[0].split('-').pop()!;
    await sortExportIntoFolders(bucketName, `${response.jobId}/`);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
