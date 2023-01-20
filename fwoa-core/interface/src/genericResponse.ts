/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export interface GenericResponse {
  readonly message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly resource?: any;
}
