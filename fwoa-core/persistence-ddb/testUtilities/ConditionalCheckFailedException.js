'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ConditionalCheckFailedExceptionMock = void 0;
class ConditionalCheckFailedExceptionMock extends Error {
  constructor() {
    super('');
    this.code = 'ConditionalCheckFailedException';
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ConditionalCheckFailedExceptionMock.prototype);
  }
}
exports.ConditionalCheckFailedExceptionMock = ConditionalCheckFailedExceptionMock;
//# sourceMappingURL=ConditionalCheckFailedException.js.map
