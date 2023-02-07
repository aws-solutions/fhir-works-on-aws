/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { getSearchMappings } from './index';

describe('getSearchMappings', () => {
  test('R4 snapshot', () => {
    expect(getSearchMappings('4.0.1')).toMatchSnapshot();
  });
});
