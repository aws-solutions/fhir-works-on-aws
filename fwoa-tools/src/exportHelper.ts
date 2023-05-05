/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import { S3 } from 'aws-sdk';
import { AxiosInstance } from 'axios';
import { getFhirClient, getFhirClientSMART } from './migrationUtils';

const MAX_EXPORT_RUNTIME: number = 48 * 60 * 60 * 1000;
const MAX_ITEMS_PER_FOLDER: number = 10000;
const POLLING_TIME: number = 5000;

export interface ExportStatusOutput {
  url: string;
  type: string;
}

export interface StartExportJobParam {
  since?: string;
}

export default class ExportHelper {
  // The max runtime of an export glue job is by default 48 hours

  private fhirUserAxios: AxiosInstance;
  private smartOnFhir: boolean;

  public constructor(fhirUserAxios: AxiosInstance, smartOnFhir: boolean = false) {
    this.fhirUserAxios = fhirUserAxios;
    this.smartOnFhir = smartOnFhir;
  }

  public async startExportJob(startExportJobParam: StartExportJobParam): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        _outputFormat: 'ndjson'
      };
      if (startExportJobParam.since) {
        params._since = startExportJobParam.since;
      }

      const url = '/$export';

      const response = await this.fhirUserAxios.get(url, { params });
      const statusPollUrl = response.headers['content-location'];
      console.log('Beginning export, check status with: ', statusPollUrl);
      return statusPollUrl;
    } catch (e) {
      console.error('Failed to start export job', e);
      throw e;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getExportStatus(statusPollUrl: string): Promise<any> {
    const cutOffTime = new Date(new Date().getTime() + MAX_EXPORT_RUNTIME);
    while (new Date().getTime() < cutOffTime.getTime()) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await this.fhirUserAxios.get(statusPollUrl);
        if (response.status === 200) {
          return response.data;
        }
        // eslint-disable-next-line no-await-in-loop
        await this.sleep(POLLING_TIME);
      } catch (e) {
        if (e.response.status === 401) {
          this.fhirUserAxios = await (this.smartOnFhir ? getFhirClientSMART() : getFhirClient());
          continue;
        }
        console.error('Failed to getExport status', e);
        throw e;
      }
    }
    throw new Error(
      `Expected export status did not occur during polling time frame of ${MAX_EXPORT_RUNTIME / 1000} seconds`
    );
  }

  public async sleep(milliseconds: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  public async copyAll(
    s3Client: S3,
    sourceBucket: string,
    targetBucket: string = sourceBucket,
    sourcePrefix: string,
    concurrency: number = 100
  ): Promise<void> {
    let ContinuationToken;

    const copyFile = async (sourceKey: string | undefined, targetKey: string): Promise<void> => {
      if (!sourceKey) {
        return;
      }

      await s3Client
        .copyObject({
          Bucket: targetBucket,
          Key: targetKey,
          CopySource: `${sourceBucket}/${sourceKey}`
        })
        .promise();

      await s3Client
        .deleteObject({
          Bucket: sourceBucket,
          Key: sourceKey
        })
        .promise();
    };

    let numItemsInFolder = 0;
    let folderName = 0;
    do {
      const resources: S3.ListObjectsV2Output = await s3Client
        .listObjectsV2({
          Bucket: sourceBucket,
          Prefix: sourcePrefix,
          ContinuationToken
        })
        .promise();
      const Contents: S3.ObjectList | undefined = resources.Contents;
      const NextContinuationToken: string | undefined = resources.NextContinuationToken;
      const sourceKeys = Contents?.map(({ Key }) => Key);

      await Promise.all(
        new Array(concurrency).fill(null).map(async () => {
          while (sourceKeys?.length) {
            const sourceKey = sourceKeys.pop();
            const targetKey: string = sourceKey!.replace(sourcePrefix, `${sourcePrefix}${folderName}/`);
            await copyFile(sourceKey, targetKey);
          }
        })
      );
      numItemsInFolder += Contents?.length || 0;
      if (numItemsInFolder >= MAX_ITEMS_PER_FOLDER) {
        numItemsInFolder = 0;
        folderName += 1;
      }
      ContinuationToken = NextContinuationToken;
    } while (ContinuationToken);
  }
}
