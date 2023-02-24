import { makeLogger } from 'test-e3776dcf-341e-4fc7-bfc6-762082f295fa';

const componentLogger = makeLogger({
  component: 'persistence'
});

export default function getComponentLogger(): any {
  return componentLogger;
}
