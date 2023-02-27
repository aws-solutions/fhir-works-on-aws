import { makeLogger } from 'fhir-interface';

const componentLogger = makeLogger({
  component: 'persistence'
});

export default function getComponentLogger(): any {
  return componentLogger;
}
