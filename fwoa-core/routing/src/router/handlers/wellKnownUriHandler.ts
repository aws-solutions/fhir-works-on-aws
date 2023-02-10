import { SmartStrategy } from '@aws/fhir-works-on-aws-interface';
import { mapKeys } from 'lodash';

export function camelToSnakeCase(str: string) {
  const camelCaseStr = str.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
  // Handle mis-capitalized first letter, example Red => red
  if (camelCaseStr.substring(0, 1) === '_') {
    return camelCaseStr.substring(1, camelCaseStr.length);
  }
  return camelCaseStr;
}

export function getWellKnownUriResponse(smartStrategy: SmartStrategy) {
  return mapKeys(smartStrategy, (value, key) => {
    return camelToSnakeCase(key);
  });
}
