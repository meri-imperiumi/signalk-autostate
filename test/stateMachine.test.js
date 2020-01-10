var assert = require('assert');
var stateMachine = require('../stateMachine');
describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});

describe('InHarbour', function() {
    it('should return that we are in harbour', function(){
          assert.equal('inHarbour', stateMachine())
        });
    });
