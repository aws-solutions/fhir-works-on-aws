import { TokenSearchValue } from '../../FhirQueryParser';
import { tokenMatch } from './tokenMatch';

describe('tokenMatch', () => {
  test('system and code', () => {
    const tokenParam: TokenSearchValue = {
      code: 'code',
      explicitNoSystemProperty: false,
      system: 'system'
    };

    expect(
      tokenMatch(tokenParam, {
        code: 'code',
        system: 'system'
      })
    ).toBe(true);

    expect(
      tokenMatch(tokenParam, {
        value: 'code',
        system: 'system'
      })
    ).toBe(true);

    expect(
      tokenMatch(tokenParam, {
        coding: [
          {
            system: 'xxxx',
            code: 'xxxx'
          },
          {
            system: 'system',
            code: 'code'
          }
        ]
      })
    ).toBe(true);

    expect(
      tokenMatch(tokenParam, {
        code: 'code',
        system: 'xxxx'
      })
    ).toBe(false);

    expect(
      tokenMatch(tokenParam, {
        code: 'xxxx',
        system: 'system'
      })
    ).toBe(false);
  });

  describe('only code', () => {
    test('explicitNoSystemProperty is true', () => {
      const tokenParam = {
        code: 'code',
        explicitNoSystemProperty: true,
        system: undefined
      };

      expect(
        tokenMatch(tokenParam, {
          code: 'code'
        })
      ).toBe(true);

      expect(
        tokenMatch(tokenParam, {
          code: 'code',
          system: 'system'
        })
      ).toBe(false);
    });

    describe('explicitNoSystemProperty is false', () => {
      test('coding-like type', () => {
        const tokenParam = {
          code: 'code',
          explicitNoSystemProperty: false,
          system: undefined
        };

        expect(
          tokenMatch(tokenParam, {
            code: 'code',
            system: 'system'
          })
        ).toBe(true);

        expect(
          tokenMatch(tokenParam, {
            code: 'code'
          })
        ).toBe(true);

        expect(tokenMatch(tokenParam, 'code')).toBe(true);

        expect(
          tokenMatch(tokenParam, {
            code: 'xxxx'
          })
        ).toBe(false);
      });

      test('boolean type', () => {
        expect(
          tokenMatch(
            {
              code: 'true',
              explicitNoSystemProperty: false,
              system: undefined
            },
            true
          )
        ).toBe(true);

        expect(
          tokenMatch(
            {
              code: 'false',
              explicitNoSystemProperty: false,
              system: undefined
            },
            false
          )
        ).toBe(true);
      });

      test('code type', () => {
        expect(
          tokenMatch(
            {
              code: 'female',
              explicitNoSystemProperty: false
            },
            'female'
          )
        ).toBe(true);

        expect(
          tokenMatch(
            {
              code: 'female',
              explicitNoSystemProperty: false
            },
            'male'
          )
        ).toBe(false);
      });
    });
  });

  describe('only system', () => {
    const tokenParam = {
      code: undefined,
      explicitNoSystemProperty: false,
      system: 'system'
    };

    expect(
      tokenMatch(tokenParam, {
        code: 'xxxx',
        system: 'system'
      })
    ).toBe(true);

    expect(
      tokenMatch(tokenParam, {
        system: 'system'
      })
    ).toBe(true);

    expect(
      tokenMatch(tokenParam, {
        system: 'xxxx'
      })
    ).toBe(false);
  });
});
