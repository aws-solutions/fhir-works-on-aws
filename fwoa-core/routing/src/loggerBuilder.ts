import { makeLogger, makeEncryptLogger } from 'fhir-works-on-aws-interface';

const componentLogger = makeLogger({
  component: 'routing'
});

export default function getComponentLogger(): any {
  return componentLogger;
}
export function getEncryptLogger(metaData?: any): any {
  const metaDataTotal = metaData ? { component: 'routing', ...metaData } : { component: 'routing' };
  const encryptedComponentLogger = makeEncryptLogger(metaDataTotal);
  return encryptedComponentLogger;
}
