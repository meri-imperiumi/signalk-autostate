const assert = require('assert');
const StateMachine = require('../StateMachine');
const stateUpdate = require('./utils/stateUpdate');

describe('repeated null anchor position', () => {
  const stateMachine = new StateMachine();
  const point = {
    lat: 42.242222,
    lon: -8.723889,
  };
  after(() => {
    stateUpdate.reset();
  });
  it('should return that we are moored when position is not changing', () => {
    stateUpdate.position(stateMachine, 'moored', point.lat, point.lon, 0);
    stateUpdate.position(stateMachine, 'moored', point.lat, point.lon, 5);
    stateUpdate.position(stateMachine, 'moored', point.lat, point.lon, 11);
  });
  it('should stay moored when a source keeps publishing a null anchor position', () => {
    for (let i = 0; i < 5; i += 1) {
      stateUpdate.anchor(stateMachine, 'moored', null, 0);
    }
  });
  it('should still be moored after another unchanged position', () => {
    stateUpdate.position(stateMachine, 'moored', point.lat, point.lon, 11);
  });
});

describe('anchor hoisted after being deployed', () => {
  const stateMachine = new StateMachine();
  const point = {
    lat: 42.242222,
    lon: -8.723889,
  };
  after(() => {
    stateUpdate.reset();
  });
  it('should return that we are moored when position is not changing', () => {
    stateUpdate.position(stateMachine, 'moored', point.lat, point.lon, 0);
    stateUpdate.position(stateMachine, 'moored', point.lat, point.lon, 11);
  });
  it('should ignore a null anchor position while no anchor is deployed', () => {
    stateUpdate.anchor(stateMachine, 'moored', null, 0);
  });
  it('should set state as anchored when given an anchor position', () => {
    stateUpdate.anchor(stateMachine, 'anchored', point, 1);
  });
  it('should go under way when the anchor position becomes null', () => {
    stateUpdate.anchor(stateMachine, 'sailing', null, 1);
  });
  it('should not restart the observation window on further null positions', () => {
    // #235: the nulls went through setState, whose sailing branch moves
    // stateChangeTime, so the ten minute window never completed.
    const changedAt = stateMachine.stateChangeTime.getTime();
    stateUpdate.anchor(stateMachine, 'sailing', null, 1);
    stateUpdate.anchor(stateMachine, 'sailing', null, 1);
    assert.equal(stateMachine.stateChangeTime.getTime(), changedAt);
  });
});

describe('anchor hoisted after a restart', () => {
  const stateMachine = new StateMachine();
  after(() => {
    stateUpdate.reset();
  });
  it('should go under way when the anchor is hoisted', () => {
    // index.js restores a persisted state directly: anchored with no delta seen.
    stateMachine.lastState = 'anchored';
    stateMachine.stateChangeTime = new Date();
    stateUpdate.anchor(stateMachine, 'sailing', null, 1);
  });
});

describe('anchor hoisted under engine', () => {
  const stateMachine = new StateMachine();
  const point = {
    lat: 42.242222,
    lon: -8.723889,
  };
  after(() => {
    stateUpdate.reset();
  });
  it('should set state as anchored when given an anchor position', () => {
    stateUpdate.anchor(stateMachine, 'anchored', point, 0);
  });
  it('should go motoring, not sailing, when the engine is running', () => {
    stateUpdate.engine(stateMachine, 'anchored', 'main', 'started');
    stateUpdate.anchor(stateMachine, 'motoring', null, 1);
  });
});
