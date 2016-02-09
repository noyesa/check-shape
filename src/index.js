import map from 'lodash.map';
import toPairs from 'lodash.topairs';
import every from 'lodash.every';
import forEach from 'lodash.foreach';
import isString from 'lodash.isstring';
import isPlainObject from 'lodash.isplainobject';
import isFunction from 'lodash.isfunction';
import hasIn from 'lodash.hasin';
import fromPairs from 'lodash.frompairs';

export class PrimitiveTypeChecker {
  /**
   * Creates a type checker that validates primitive types by checking their
   * typeof value.
   * @param {string} typeName The expected value of typeof for a valid object
   */
  constructor(typeName) {
    this.typeName = typeName;
  }

  /**
   * Compares the typeof value of the passed object with the expected value
   * passed to the constructor.
   * @param {string} o Object to validate
   * @returns {boolean} Does the object's typeof value match the expected value?
   */
  check(o) {
    return arguments.length > 0 && typeof o === this.typeName;
  }
}

const primitiveTypeCheckers = fromPairs(map([
  'number',
  'string',
  'boolean',
  'undefined',
  'function',
], typeName => [typeName, new PrimitiveTypeChecker(typeName)]));

export class ObjectTypeChecker {
  /**
   * Checks the shape of a JavaScript object by validating all its properties
   * against a list of expected properties and their type-checkers.
   */
  constructor() {
    this._propCheckers = {};
  }

  /**
   * Adds a type checker for a named property to this type-checker.
   * @param {string} propName Name of the property expected on the object
   * @param {object} typeChecker Type-checker that validates the value of the named property
   */
  addPropChecker(propName, typeChecker) {
    this._propCheckers[propName] = typeChecker;
  }

  /**
   * Validates the object passed against the shape expected by this type-checker.
   * @param {object} o Object to validate
   */
  check(o) {
    return every(toPairs(this._propCheckers), ([name, checker]) =>
      hasIn(o, name) && checker.check(o[name])
    );
  }
}

/**
 * @typedef {object} TypeChecker
 * @property {function} check Function that checks if an object matches the expected type
 */

/**
 * Builds a type checker from a shape descriptor. The shape descriptor is an object that describes
 * how the object should look. Its values can either be type strings, other shape descriptors, or
 * predicate functions that validate the property's value.
 * @param {object} shape The expected shape of objects passed to the type-checker
 * @returns {TypeChecker} Type-checker that validates objects passed to its `check` method
 */
export function makeTypeChecker(shape) {
  if (isString(shape)) {
    return primitiveTypeCheckers[shape];
  } else if (isPlainObject(shape)) {
    const checker = new ObjectTypeChecker();
    forEach(toPairs(shape), ([propName, propShape]) =>
      checker.addPropChecker(propName, makeTypeChecker(propShape))
    );
    return checker;
  } else if (isFunction(shape)) {
    return { check: shape };
  }
}

/**
 * Determines if the argument object matches the type described by the shape descriptor.
 * @param {object} o Object to validate against shape
 * @param {object} shape Object that describes the expected shape of o
 * @returns {boolean} Does the object o match the expected shape?
 */
export function isType(o, shape) {
  return makeTypeChecker(shape).check(o);
}
