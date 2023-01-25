export class ConditionalCheckFailedExceptionMock extends Error {
  public code: string;

  constructor() {
    super('');
    this.code = 'ConditionalCheckFailedException';

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ConditionalCheckFailedExceptionMock.prototype);
  }
}
