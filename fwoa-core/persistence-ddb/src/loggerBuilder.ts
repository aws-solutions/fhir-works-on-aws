import { makeLogger } from 'fhir-interface-core';

const componentLogger = makeLogger({
  component: 'persistence'
});

export default function getComponentLogger(): any {
  return componentLogger;
}
