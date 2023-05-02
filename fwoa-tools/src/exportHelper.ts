/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import { AxiosInstance } from 'axios';

const MAX_EXPORT_RUNTIME: number = 48 * 60 * 60 * 1000;

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

  public constructor(fhirUserAxios: AxiosInstance) {
    this.fhirUserAxios = fhirUserAxios;
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
        await this.sleep(5000);
      } catch (e) {
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
}
