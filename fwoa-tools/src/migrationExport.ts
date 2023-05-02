/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { getFhirClient, getFhirClientSMART } from './migrationUtils';
import ExportHelper from './exportHelper';
import { writeFileSync } from 'fs';
import { S3 } from 'aws-sdk';

const ISOStringRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/g;
const MAX_ITEMS_PER_FOLDER = 10000;

if (process.argv.length < 3) {
  throw new Error('Invalid arguments. Usage: ts-node migrationExport.ts <boolean> <opt: ISO timestamp>');
}
// collect optional arguments
let smartClient = Boolean(process.argv[3]);
let since: string;
if (process.argv.length >= 4) {
  since = process.argv[3];
  if (!ISOStringRegex.test(since)) {
    throw new Error('Provided `since` parameter is not in correct format');
  }
}

async function startExport() {
  const fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
  const exportHelper = new ExportHelper(fhirClient);

  const exportJobUrl: string = await exportHelper.startExportJob({ since });
  const response = await exportHelper.getExportStatus(exportJobUrl);

  // return the last element of the split array, which is the jobId portion of the url
  const jobId = exportJobUrl.split('/').pop();

  return { jobId: jobId, exportResponse: response };
}

async function sortExportIntoFolders(bucket: string, prefix: string) {
  const s3Client = new S3({
    region: process.env.API_AWS_REGION
  });
  let isTruncated = true;
  let marker;
  let numElementsInFolder = 0;
  let folderName = 0;
  while (isTruncated) {
    let params: any = {};
    params.Bucket = bucket;
    if (prefix) params.Prefix = prefix;
    if (marker) params.Marker = marker;
    try {
      const response = await s3Client.listObjectsV2(params).promise();
      response.Contents?.forEach((item) => {
        // Sort into folders
        s3Client.copyObject(
          {
            Bucket: bucket,
            CopySource: item.Key!,
            Key: `${prefix}/${folderName}/${item.Key}`
          },
          function (error, data) {
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
    } catch (error) {
      throw error;
    }
  }
}

startExport()
  .then((response) => {
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
    sortExportIntoFolders(bucketName, `${response.jobId}/`);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
