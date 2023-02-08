/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidResourceError } from '@aws/fhir-works-on-aws-interface';
import AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import HapiFhirLambdaValidator from './hapiFhirLambdaValidator';

AWSMock.setSDKInstance(AWS);
const SOME_RESOURCE = 'my value does not matter because validation lambda is always mocked';
const VALIDATOR_LAMBDA_ARN = 'my value does not matter because validation lambda is always mocked';

describe('HapiFhirLambdaValidator', () => {
  beforeEach(() => {
    AWSMock.restore();
  });

  test('valid resource', async () => {
    AWSMock.mock('Lambda', 'invoke', (params: any, callback: Function) => {
      callback(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          successful: true
        })
      });
    });

    const hapiFhirLambdaValidator = new HapiFhirLambdaValidator(VALIDATOR_LAMBDA_ARN);
    await expect(hapiFhirLambdaValidator.validate(SOME_RESOURCE)).resolves.toBeUndefined();
  });

  test('invalid resource', async () => {
    AWSMock.mock('Lambda', 'invoke', (params: any, callback: Function) => {
      callback(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          errorMessages: [
            {
              severity: 'error',
              msg: 'error1'
            },
            {
              severity: 'error',
              msg: 'error2'
            },
            {
              severity: 'warning',
              msg: 'warning1'
            }
          ],
          successful: false
        })
      });
    });

    const hapiFhirLambdaValidator = new HapiFhirLambdaValidator(VALIDATOR_LAMBDA_ARN);
    await expect(hapiFhirLambdaValidator.validate(SOME_RESOURCE)).rejects.toThrowError(
      new InvalidResourceError('error1\nerror2')
    );
  });

  test('lambda execution fails', async () => {
    AWSMock.mock('Lambda', 'invoke', (params: any, callback: Function) => {
      callback(null, {
        StatusCode: 200,
        FunctionError: 'unhandled',
        Payload: 'some error msg'
      });
    });

    const hapiFhirLambdaValidator = new HapiFhirLambdaValidator(VALIDATOR_LAMBDA_ARN);
    await expect(hapiFhirLambdaValidator.validate(SOME_RESOURCE)).rejects.toThrow('lambda function failed');
  });
});
