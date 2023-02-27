import { makeLogger } from 'fhir-interface';

const componentLogger = makeLogger({
  component: 'auth-smart'
});

export default function getComponentLogger(): any {
  return componentLogger;
}
