/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
const SEARCH_PARAMETER_TO_DOCUMENT_FIELD = {
  _id: 'id',
  id: 'id'
};

const hasMapping = (
  searchParameter: string
): searchParameter is keyof typeof SEARCH_PARAMETER_TO_DOCUMENT_FIELD => {
  return searchParameter in SEARCH_PARAMETER_TO_DOCUMENT_FIELD;
};

// eslint-disable-next-line import/prefer-default-export
export const getDocumentField = (searchParameter: string) => {
  if (hasMapping(searchParameter)) {
    return SEARCH_PARAMETER_TO_DOCUMENT_FIELD[searchParameter];
  }
  return `${searchParameter}.*`;
};
