"use strict";

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'contracts', 'job.schema.json');

function loadJobSchema() {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
  return JSON.parse(raw);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isValidIsoDate(value) {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && value === date.toISOString();
}

function readType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validateAgainstSchemaObject(schema, value, keyPath, errors) {
  if (!schema) return;

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matches = types.some((type) => {
      if (type === 'array') return Array.isArray(value);
      if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
      if (type === 'string') return typeof value === 'string';
      if (type === 'integer') return Number.isInteger(value);
      if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
      if (type === 'boolean') return typeof value === 'boolean';
      if (type === 'null') return value === null;
      return typeof value === type;
    });
    if (!matches) {
      errors.push(`${keyPath} expected ${JSON.stringify(schema.type)}, received ${readType(value)}`);
      return;
    }
  }

  if (schema.required && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const requiredKey of schema.required) {
      if (!hasOwn(value, requiredKey)) {
        errors.push(`${keyPath} missing required property: ${requiredKey}`);
      }
    }
  }

  if (schema.properties && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (hasOwn(value, propName)) {
        validateAgainstSchemaObject(propSchema, value[propName], `${keyPath}.${propName}`, errors);
      }
    }
  }

  if (schema.items && Array.isArray(value)) {
    value.forEach((entry, index) => validateAgainstSchemaObject(schema.items, entry, `${keyPath}[${index}]`, errors));
  }

  if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) {
    errors.push(`${keyPath} length must be at least ${schema.minLength}`);
  }

  if (schema.minItems && Array.isArray(value) && value.length < schema.minItems) {
    errors.push(`${keyPath} must contain at least ${schema.minItems} item(s)`);
  }

  if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) {
    errors.push(`${keyPath} must be >= ${schema.minimum}`);
  }

  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    const validOneOf = schema.oneOf.some((candidate) => {
      const localErrors = [];
      validateAgainstSchemaObject(candidate, value, keyPath, localErrors);
      return localErrors.length === 0;
    });
    if (!validOneOf) {
      errors.push(`${keyPath} did not match any allowed oneOf schema`);
    }
  }

  if (schema.format === 'date-time' && typeof value === 'string' && !isValidIsoDate(value)) {
    errors.push(`${keyPath} must be a valid ISO-8601 date-time string`);
  }
}

function validateJob(job) {
  if (!job || typeof job !== 'object' || Array.isArray(job)) {
    return { valid: false, errors: ['Job must be an object.'] };
  }

  const schema = loadJobSchema();
  const errors = [];

  validateAgainstSchemaObject(schema, job, 'job', errors);

  if (errors.length > 0) {
    return { valid: false, errors: Array.from(new Set(errors)) };
  }

  return { valid: true, errors: [] };
}

function validateJobOrThrow(job) {
  const result = validateJob(job);
  if (!result.valid) {
    throw new Error(result.errors.join('; '));
  }
  return true;
}

module.exports = {
  loadJobSchema,
  validateJob,
  validateJobOrThrow,
};
