// eslint-disable-next-line import/prefer-default-export
export const ElasticSearch = {
  search: jest.fn().mockName('searchMock'),
  msearch: jest.fn().mockName('msearchMock')
};
