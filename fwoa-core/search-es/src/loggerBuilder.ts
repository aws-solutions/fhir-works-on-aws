import { makeLogger } from 'fhir-interface-core';

const componentLogger = makeLogger({
  component: 'search'
});

export default function getComponentLogger(): any {
  return componentLogger;
}
