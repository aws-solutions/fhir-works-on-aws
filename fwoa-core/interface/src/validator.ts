import { TypeOperation } from './constants';

export interface Validator {
  /**
   * returns a resolved Promise if the resource is valid. Otherwise throws an error
   * @throws InvalidResourceError
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resource: any,
    { tenantId, typeOperation }: { tenantId?: string; typeOperation?: TypeOperation }
  ): Promise<void>;
}
