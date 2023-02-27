import { makeLogger } from 'fhir-interface';

const componentLogger = makeLogger({
  component: 'search'
});

export default function getComponentLogger(): any {
  return componentLogger;
}
