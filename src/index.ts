import FastestValidator, { CheckFunctionOptions, ValidatorConstructorOptions, ValidationSchema } from 'fastest-validator';
import Extend from 'extend';
import Logger from '@novice1/logger';
import { ErrorRequestHandler, RequestHandler, Request } from '@novice1/routing';
import { ParsedQs } from 'qs';
import { ParamsDictionary } from 'express-serve-static-core';
import { IncomingHttpHeaders } from 'http';

const Log = Logger.debugger('@novice1/validator-fastest-validator');

const PARAMETERS_PROPS = ['params', 'body', 'query', 'headers', 'cookies', 'files'];

interface ValidationObject {
  params?: ParamsDictionary;
  body?: unknown;
  query?: ParsedQs;
  headers?: IncomingHttpHeaders;
  cookies?: unknown;
  files?: unknown;
}

function createSchema(value: Record<string, unknown> | ValidationSchema): ValidationSchema | null {
  let schema: ValidationSchema | null = null;
  let tempValue = value;

  // check if schema is a valid schema
  if (tempValue) {
    // if it is not a ValidationSchema from the root
    if (!tempValue.$$root) {
      const tmpSchema: Record<string, ValidationSchema> = {};
      const currentSchema: Record<string, ValidationSchema> = tempValue as Record<string, ValidationSchema>;
      PARAMETERS_PROPS.forEach((p) => {
        if (currentSchema[p]) {
          if (typeof currentSchema[p] === 'object') {
            if (currentSchema[p].$$type || currentSchema[p].type) {
              tmpSchema[p] = currentSchema[p];
            } else {
              tmpSchema[p] = {
                type: 'object',
                props: currentSchema[p]
              };
            }
          } else {
            // only do this because schema of props could 
            // be strings and/or other type than object
            tmpSchema[p] = currentSchema[p];
          }
        }
      });
      if (Object.keys(tmpSchema).length) {
        tempValue = {
          $$root: true,
          type: 'object',
          props: tmpSchema
        };
      } else {
        tempValue = tmpSchema;
      }
    } else {
    }

    // if it is a ValidationSchema from the root
    if (tempValue?.$$root) {
      schema = tempValue;
    }
  }

  return schema;
}

function retrieveParametersValue(parameters?: Record<string, unknown>, property?: string): ValidationSchema | Record<string, unknown> | null {
  let schemaFromParameters: Record<string, unknown> | null = null;

  if (
    parameters &&
    typeof parameters === 'object'
  ) {

    schemaFromParameters = parameters;

    if (property && typeof property === 'string') {
      const subParameters = schemaFromParameters?.[property];
      if (
        subParameters &&
        typeof subParameters === 'object' &&
        !Array.isArray(subParameters)
      ) {
        schemaFromParameters = subParameters as Record<string, unknown>;
      } else {
        schemaFromParameters = null;
      }
    }
  }
  return schemaFromParameters;
}

function retrieveSchema(parameters?: Record<string, unknown>, property?: string): ValidationSchema | null {
  const v = retrieveParametersValue(parameters, property);
  if (v) {
    return createSchema(v);
  } else {
    return v;
  }
}

function buildValueToValidate(schema: ValidationSchema, req: Request): ValidationObject {
  const r: ValidationObject = {};

  //'params', 'body', 'query', 'headers', 'cookies', 'files'
  if (schema?.props?.params) {
    r.params = req.params;
  }
  if (schema?.props?.body) {
    r.body = req.body;
  }
  if (schema?.props?.query) {
    r.query = req.query;
  }
  if (schema?.props?.headers) {
    r.headers = req.headers;
  }
  if (schema?.props?.cookies) {
    r.cookies = req.cookies;
  }
  if (schema?.props?.files) {
    r.files = req.files;
  }

  return r;
}


/**
 * 
 * @param options 
 * @param checkOptions 
 * @param onerror 
 * @param validationProperty 
 * @returns 
 */
function validatorFV(
  options?: ValidatorConstructorOptions,
  checkOptions?: CheckFunctionOptions,
  onerror?: ErrorRequestHandler,
  validationProperty?: string): RequestHandler {

  return async function validatorFVRequestHandler(req, res, next) {
    // retrieve schema
    const schema = retrieveSchema(req.meta?.parameters, validationProperty);

    // no schema to validate
    if (!schema) {
      Log.silly('no schema to validate');
      return next();
    } else {

      // object that we will validate
      const value = buildValueToValidate(schema, req);

      Log.info('validating %O', value);
      Log.log('schema %O', schema);

      const errorHandler = (err: unknown) => {
        Log.error('Invalid request for %s', req.originalUrl);
        if (typeof req.meta.parameters?.onerror === 'function') {
          Log.error(
            'Custom function onerror => %s',
            req.meta.parameters.onerror.name
          );
          return req.meta.parameters.onerror(err, req, res, next);
        }
        if (onerror) {
          if (typeof onerror === 'function') {
            Log.error('Custom function onerror => %s', onerror.name);
            return onerror(err, req, res, next);
          } else {
            Log.warn(
              'Expected arg 2 ("onerror") to be a function (ErrorRequestHandler). Instead got type "%s"',
              typeof onerror
            );
          }
        }
        return res.status(400).json(err);
      };

      // validate schema
      try {
        const v = new FastestValidator(options);
        const check = v.compile(schema);
        const result = await check(value, checkOptions);
        if (result === true) {
          Log.info('Valid request for %s', req.originalUrl);
          Extend(req, value);
          next();
        } else {
          errorHandler(result);
        }
      } catch (err) {
        errorHandler(err);
      }
    }
  };
}

export = validatorFV;
