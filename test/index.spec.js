import { expect } from 'chai';
import sinon from 'sinon';
import noop from 'lodash.noop';
import {
  PrimitiveTypeChecker,
  ObjectTypeChecker,
  makeTypeChecker
} from '../src/index';

describe('PrimitiveTypeChecker', () => {
  it('exists', () => expect(PrimitiveTypeChecker).to.be.a('function'));

  describe('check', () => {
    it('compares the type of passed object with expected type', () => {
      const checker = new PrimitiveTypeChecker('number');
      expect(checker.check(1)).to.be.true;
      expect(checker.check(Math.random())).to.be.true;
      expect(checker.check('one')).to.be.false;
    });

    it('does not validate a nullary call to check for undefined type', () => {
      const checker = new PrimitiveTypeChecker('undefined');
      expect(checker.check()).to.be.false;
    });
  });
});

describe('ObjectTypeChecker', () => {
  it('exists', () => expect(ObjectTypeChecker).to.be.a('function'));

  describe('check', () => {
    it('succeeds every object when no properties are added', () => {
      const checker = new ObjectTypeChecker();
      expect(checker.check({})).to.be.true;
    });

    it('accepts PrimitiveTypeChecker as a property validator', () => {
      const numberChecker = new PrimitiveTypeChecker('number');
      const objectChecker = new ObjectTypeChecker();
      objectChecker.addPropChecker('foo', numberChecker);

      expect(objectChecker.check({ foo: Math.random() })).to.be.true;
      expect(objectChecker.check({ foo: 'one' })).to.be.false;
      expect(objectChecker.check({ bar: Math.random() })).to.be.false;
    });

    it('accepts an object with a check function as a property validator', () => {
      const numberChecker = {
        check(o) {
          return typeof o === 'number';
        }
      };
      const objectChecker = new ObjectTypeChecker();
      objectChecker.addPropChecker('foo', numberChecker);

      expect(objectChecker.check({ foo: Math.random() })).to.be.true;
      expect(objectChecker.check({ foo: 'one' })).to.be.false;
      expect(objectChecker.check({ bar: Math.random() })).to.be.false;
    });

    it('accepts other ObjectTypeChecker instances as a property validator', () => {
      const nestedChecker = new ObjectTypeChecker();
      nestedChecker.addPropChecker('bar', new PrimitiveTypeChecker('number'));
      const objectChecker = new ObjectTypeChecker();
      objectChecker.addPropChecker('foo', nestedChecker);

      expect(objectChecker.check({ bar: Math.random() })).to.be.false;
      expect(objectChecker.check({ foo: {} })).to.be.false;
      expect(objectChecker.check({ foo: {
        bar: {}
      }})).to.be.false;
      expect(objectChecker.check({ foo: {
        bar: 1
      }})).to.be.true;
    });

    it('validates against inherited properties', () => {
      const parent = {
        foo: Math.random()
      };
      const child = Object.create(parent);

      const checker = new ObjectTypeChecker();
      checker.addPropChecker('foo', new PrimitiveTypeChecker('number'));

      expect(checker.check(parent)).to.be.true;
      expect(checker.check(child)).to.be.true;
    });

    it('passes objects with more properties than required', () => {
      const checker = new ObjectTypeChecker();
      checker.addPropChecker('foo', new PrimitiveTypeChecker('number'));
      expect(checker.check({
        foo: Math.random(),
        bar: Math.random()
      })).to.be.true;
    });

    it('fails objects that are missing some required properties', () => {
      const checker = new ObjectTypeChecker();
      checker.addPropChecker('foo', new PrimitiveTypeChecker('number'));
      checker.addPropChecker('bar', new PrimitiveTypeChecker('string'));

      expect(checker.check({
        foo: Math.random()
      })).to.be.false;

      expect(checker.check({
        foo: Math.random(),
        bar: 'biz'
      })).to.be.true;
    });
  });
});

describe('makeTypeChecker', () => {
  it('exists', () => expect(makeTypeChecker).to.be.a('function'));

  it('returns a type checker for number', () => {
    const checker = makeTypeChecker('number');
    expect(checker.check(Math.random())).to.be.true;
    expect(checker.check('one')).to.be.false;
    expect(checker.check(true)).to.be.false;
    expect(checker.check(undefined)).to.be.false;
    expect(checker.check(noop)).to.be.false;
    expect(checker.check({})).to.be.false;
  });

  it('returns a type checker for string', () => {
    const checker = makeTypeChecker('string');
    expect(checker.check(Math.random())).to.be.false;
    expect(checker.check('one')).to.be.true;
    expect(checker.check(true)).to.be.false;
    expect(checker.check(undefined)).to.be.false;
    expect(checker.check(noop)).to.be.false;
    expect(checker.check({})).to.be.false;
  });

  it('returns a type checker for boolean', () => {
    const checker = makeTypeChecker('boolean');
    expect(checker.check(Math.random())).to.be.false;
    expect(checker.check('one')).to.be.false;
    expect(checker.check(true)).to.be.true;
    expect(checker.check(undefined)).to.be.false;
    expect(checker.check(noop)).to.be.false;
    expect(checker.check({})).to.be.false;
  });

  it('returns a type checker for undefined', () => {
    const checker = makeTypeChecker('undefined');
    expect(checker.check(Math.random())).to.be.false;
    expect(checker.check('one')).to.be.false;
    expect(checker.check(true)).to.be.false;
    expect(checker.check(undefined)).to.be.true;
    expect(checker.check(noop)).to.be.false;
    expect(checker.check({})).to.be.false;
  });

  it('returns a type checker for function', () => {
    const checker = makeTypeChecker('function');
    expect(checker.check(Math.random())).to.be.false;
    expect(checker.check('one')).to.be.false;
    expect(checker.check(true)).to.be.false;
    expect(checker.check(undefined)).to.be.false;
    expect(checker.check(noop)).to.be.true;
    expect(checker.check({})).to.be.false;
  });

  it('returns an object type checker for an object descriptor', () => {
    expect(makeTypeChecker({})).to.be.instanceof(ObjectTypeChecker);
  });

  it('creates type checkers for each property in the shape object', () => {
    let checker = makeTypeChecker({
      foo: 'number',
    });

    expect(checker.check({ foo: Math.random() })).to.be.true;
    expect(checker.check({ foo: 'one' })).to.be.false;
    expect(checker.check({ foo: noop })).to.be.false;
    expect(checker.check({ foo: true })).to.be.false;

    checker = makeTypeChecker({
      bar: 'string'
    });

    expect(checker.check({ bar: Math.random() })).to.be.false;
    expect(checker.check({ bar: 'foo' })).to.be.true;
    expect(checker.check({ bar: noop })).to.be.false;
    expect(checker.check({ bar: true })).to.be.false;

    checker = makeTypeChecker({
      biz: 'function'
    });

    expect(checker.check({ biz: Math.random() })).to.be.false;
    expect(checker.check({ biz: 'foo' })).to.be.false;
    expect(checker.check({ biz: noop })).to.be.true;
    expect(checker.check({ biz: true })).to.be.false;

    checker = makeTypeChecker({
      buzz: 'boolean'
    });

    expect(checker.check({ buzz: Math.random() })).to.be.false;
    expect(checker.check({ buzz: 'foo' })).to.be.false;
    expect(checker.check({ buzz: noop })).to.be.false;
    expect(checker.check({ buzz: true })).to.be.true;
  });

  it('creates type checkers when a function is passed, used as a predicate', () => {
    const stub = sinon.stub();

    stub.returns(false);
    stub.withArgs(1).returns(true);

    const checker = makeTypeChecker(stub);
    expect(checker.check(1)).to.be.true;
    sinon.assert.calledWith(stub, 1);

    expect(checker.check(2)).to.be.false;
    sinon.assert.calledWith(stub, 2);
  });

  it('creates function type checkers when a function is provided as a property in shape', () => {
    const isOne = sinon.stub();
    isOne.returns(false);
    isOne.withArgs(1).returns(true);

    const checker = makeTypeChecker({
      foo: isOne
    });

    expect(checker.check({ foo: 2 })).to.be.false;
    expect(checker.check({ foo: 1 })).to.be.true;
  });
});
