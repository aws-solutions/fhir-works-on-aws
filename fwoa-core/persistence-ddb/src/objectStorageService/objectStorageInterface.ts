/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line no-unused-vars
import { GenericResponse } from 'test-e3776dcf-341e-4fc7-bfc6-762082f295fa';

export default interface ObjectStorageInterface {
  uploadObject(base64Data: string, fileName: string, contentType: string): Promise<GenericResponse>;
  readObject(fileName: string): Promise<GenericResponse>;
  deleteObject(fileName: string): Promise<GenericResponse>;
  getPresignedPutUrl(fileName: string): Promise<GenericResponse>;
  deleteBasedOnPrefix(prefix: string): Promise<GenericResponse>;
  getPresignedGetUrl(fileName: string): Promise<GenericResponse>;
}
