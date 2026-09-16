import type { GhiiEngine } from '@ghii/ghii-v2';
import type { Static, TSchema } from 'typebox';
import Value from 'typebox/value';

/**
 * Adapt a TypeBox schema to the ghii validation engine contract.
 *
 * Input goes through `Value.Convert` (lenient coercion, so `"3000"` becomes
 * `3000` and `"false"` becomes `false`) and `Value.Default` (fills declared
 * defaults) before being checked. An optional `preprocess` hook runs first,
 * for coercions TypeBox cannot infer (e.g. the string "false" for a `string | false` union).
 */
export function typeboxEngine<T extends TSchema>(
  schema: T,
  preprocess: (input: unknown) => unknown = (input) => input,
): GhiiEngine<Static<T>> {
  return {
    validate(input) {
      const candidate = Value.Default(schema, Value.Convert(schema, preprocess(Value.Clone(input))));
      if (Value.Check(schema, candidate)) {
        return {
          success: true,
          value: candidate as Static<T>,
        };
      }
      return {
        success: false,
        errors: [
          ...Value.Errors(schema, candidate),
        ].map((error) => ({
          path: error.instancePath,
          input: Value.Pointer.Get(candidate, error.instancePath),
          details: error.keyword,
          message: error.message,
          _raw: error,
        })),
      };
    },
    toJsonSchema(pretty = false) {
      return JSON.stringify(schema, null, pretty ? 2 : undefined);
    },
  };
}
