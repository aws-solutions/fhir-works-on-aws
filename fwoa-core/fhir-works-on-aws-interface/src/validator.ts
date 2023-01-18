import { TypeOperation } from './constants';

export interface Validator {
  /**
   * returns a resolved Promise if the resource is valid. Otherwise throws an error
   * @throws InvalidResourceError
   */
  validate(
    resource: any,
    { tenantId, typeOperation }: { tenantId?: string; typeOperation?: TypeOperation }
  ): Promise<void>;
}
