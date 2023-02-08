import { isEmpty } from 'lodash';
import { QuantitySearchValue } from '../../FhirQueryParser';
import { applyPrefixRulesToRange, compareNumberToRange } from './common/numericComparison';

// eslint-disable-next-line import/prefer-default-export
export const quantityMatch = (value: QuantitySearchValue, resourceValue: any): boolean => {
  const { prefix, implicitRange, number, system, code } = value;

  if (typeof resourceValue?.value !== 'number') {
    return false;
  }

  if (
    !compareNumberToRange(prefix, applyPrefixRulesToRange(prefix, number, implicitRange), resourceValue.value)
  ) {
    return false;
  }

  if (isEmpty(system) && isEmpty(code)) {
    return true;
  }

  if (!isEmpty(system) && !isEmpty(code)) {
    return resourceValue?.code === code && resourceValue?.system === system;
  }
  if (!isEmpty(code)) {
    // when there is no system, search either the code (code) or the stated human unit (unit)
    // https://www.hl7.org/fhir/search.html#quantity
    return resourceValue?.code === code || resourceValue?.unit === code;
  }

  return false;
};
