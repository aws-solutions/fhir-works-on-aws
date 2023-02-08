// Generated automatically by nearley, version 2.20.0
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any {
  return d[0];
}

interface NearleyToken {
  value: any;
  [key: string]: any;
}

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
}

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
}

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
}

const grammar: Grammar = {
  Lexer: undefined,
  ParserRules: [
    { name: 'Main', symbols: ['unionExpression'], postprocess: id },
    {
      name: 'unionExpression',
      symbols: ['unionExpression', '_', { literal: '|' }, '_', 'expression'],
      postprocess: (d) => [Array.isArray(d[0]) ? d[0].flat() : d[0], d[4]].flat()
    },
    {
      name: 'unionExpression',
      symbols: ['expression'],
      postprocess: (d) => [d[0]]
    },
    { name: 'unionExpression', symbols: ['_id'], postprocess: (d) => [d[0]] },
    {
      name: '_id$string$1',
      symbols: [{ literal: '.' }, { literal: 'i' }, { literal: 'd' }],
      postprocess: (d) => d.join('')
    },
    {
      name: '_id',
      symbols: ['IDENTIFIER', '_id$string$1'],
      postprocess: (d) => ({ resourceType: d[0], path: 'id' })
    },
    { name: 'expression', symbols: ['path'], postprocess: id },
    {
      name: 'expression$ebnf$1$string$1',
      symbols: [
        { literal: '/' },
        { literal: '@' },
        { literal: 'v' },
        { literal: 'a' },
        { literal: 'l' },
        { literal: 'u' },
        { literal: 'e' }
      ],
      postprocess: (d) => d.join('')
    },
    {
      name: 'expression$ebnf$1',
      symbols: ['expression$ebnf$1$string$1'],
      postprocess: id
    },
    { name: 'expression$ebnf$1', symbols: [], postprocess: () => null },
    {
      name: 'expression',
      symbols: ['path', 'simpleWhere', 'pathContinuation', 'expression$ebnf$1'],
      postprocess: (d) => ({
        ...d[0],
        path: `${d[0].path}${d[2] ? '.' + d[2] : ''}`,
        condition: [`${d[0].path}.${d[1][0]}`, d[1][1], d[1][2]]
      })
    },
    {
      name: 'path$string$1',
      symbols: [{ literal: 'f' }, { literal: ':' }],
      postprocess: (d) => d.join('')
    },
    {
      name: 'path',
      symbols: ['path$string$1', 'IDENTIFIER', 'pathContinuation'],
      postprocess: (d) => ({ resourceType: d[1], path: d[2] })
    },
    { name: 'pathContinuation$ebnf$1', symbols: [] },
    {
      name: 'pathContinuation$ebnf$1$subexpression$1$string$1',
      symbols: [{ literal: '/' }, { literal: 'f' }, { literal: ':' }],
      postprocess: (d) => d.join('')
    },
    {
      name: 'pathContinuation$ebnf$1$subexpression$1',
      symbols: ['pathContinuation$ebnf$1$subexpression$1$string$1', 'IDENTIFIER']
    },
    {
      name: 'pathContinuation$ebnf$1',
      symbols: ['pathContinuation$ebnf$1', 'pathContinuation$ebnf$1$subexpression$1'],
      postprocess: (d) => d[0].concat([d[1]])
    },
    {
      name: 'pathContinuation',
      symbols: ['pathContinuation$ebnf$1'],
      postprocess: (d) => d[0].map((x: any) => x[1]).join('.')
    },
    {
      name: 'simpleWhere',
      symbols: [{ literal: '[' }, 'simpleWhereExp', { literal: ']' }],
      postprocess: (d) => d[1]
    },
    {
      name: 'simpleWhereExp$ebnf$1',
      symbols: ['wherePrefix'],
      postprocess: id
    },
    { name: 'simpleWhereExp$ebnf$1', symbols: [], postprocess: () => null },
    {
      name: 'simpleWhereExp$ebnf$2$string$1',
      symbols: [
        { literal: '/' },
        { literal: '@' },
        { literal: 'v' },
        { literal: 'a' },
        { literal: 'l' },
        { literal: 'u' },
        { literal: 'e' }
      ],
      postprocess: (d) => d.join('')
    },
    {
      name: 'simpleWhereExp$ebnf$2',
      symbols: ['simpleWhereExp$ebnf$2$string$1'],
      postprocess: id
    },
    { name: 'simpleWhereExp$ebnf$2', symbols: [], postprocess: () => null },
    {
      name: 'simpleWhereExp',
      symbols: [
        'simpleWhereExp$ebnf$1',
        'IDENTIFIER',
        'simpleWhereExp$ebnf$2',
        '_',
        { literal: '=' },
        '_',
        { literal: "'" },
        'STRING_VALUE',
        { literal: "'" }
      ],
      postprocess: (d) => [d[1], d[4], d[7]]
    },
    {
      name: 'wherePrefix$string$1',
      symbols: [{ literal: 'f' }, { literal: ':' }],
      postprocess: (d) => d.join('')
    },
    { name: 'wherePrefix', symbols: ['wherePrefix$string$1'] },
    { name: 'wherePrefix', symbols: [{ literal: '@' }], postprocess: id },
    { name: 'IDENTIFIER$ebnf$1', symbols: [/[a-zA-Z-]/] },
    {
      name: 'IDENTIFIER$ebnf$1',
      symbols: ['IDENTIFIER$ebnf$1', /[a-zA-Z-]/],
      postprocess: (d) => d[0].concat([d[1]])
    },
    {
      name: 'IDENTIFIER',
      symbols: ['IDENTIFIER$ebnf$1'],
      postprocess: (d) => d[0].join('')
    },
    { name: 'STRING_VALUE$ebnf$1', symbols: [/[a-zA-Z0-9-:/.]/] },
    {
      name: 'STRING_VALUE$ebnf$1',
      symbols: ['STRING_VALUE$ebnf$1', /[a-zA-Z0-9-:/.]/],
      postprocess: (d) => d[0].concat([d[1]])
    },
    {
      name: 'STRING_VALUE',
      symbols: ['STRING_VALUE$ebnf$1'],
      postprocess: (d) => d[0].join('')
    },
    { name: '_$ebnf$1', symbols: [] },
    {
      name: '_$ebnf$1',
      symbols: ['_$ebnf$1', /[\s]/],
      postprocess: (d) => d[0].concat([d[1]])
    },
    { name: '_', symbols: ['_$ebnf$1'], postprocess: () => null }
  ],
  ParserStart: 'Main'
};

export default grammar;
