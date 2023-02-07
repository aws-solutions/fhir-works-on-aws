import { makeLogger } from '@aws/fhir-works-on-aws-interface';

const componentLogger = makeLogger({
  component: 'search'
});

export default function getComponentLogger(): any {
  return componentLogger;
}
