const assert = require('assert');
const StateMachine = require('../StateMachine');

// A corrupt future timestamp on the very first position sample poisons
// stateChangeTime, which gates how soon state changes may follow. The buffer
// reset alone does not recover from this: every subsequent real sample fails
// the stateChangeTime guard with a negative difference, forever.
describe('first position sample with a corrupt future timestamp', () => {
  const START = new Date('2026-01-01T12:00:00Z').getTime();
  const LAT = 60.254558;
  const LON = 25.042828;

  function position(stateMachine, secondsFromStart, lat, lon) {
    return stateMachine.update({
      path: 'navigation.position',
      value: { latitude: lat, longitude: lon },
      time: new Date(START + secondsFromStart * 1000),
    });
  }

  it('recovers when the first sample is corrupt', () => {
    const stateMachine = new StateMachine(5, 100, 'sailing', 0, true);
    let state = null;

    // The very first fix the machine ever sees has a corrupt time field
    state = position(stateMachine, 60 * 60 * 24 * 365, LAT, LON);
    assert.equal(state, 'moored');

    // Real fixes: vessel moves away, roughly 300 m per minute
    stateMachine.update({
      path: 'navigation.speedOverGround',
      value: 5,
      time: new Date(START),
    });
    for (let i = 1; i <= 30 && state !== 'sailing'; i += 1) {
      state = position(stateMachine, i * 60, LAT + i * 0.0027, LON);
    }
    assert.equal(state, 'sailing', `still ${state} after 30 minutes under way`);

    // And it can come back to moored
    stateMachine.update({
      path: 'navigation.speedOverGround',
      value: 0.05,
      time: new Date(START + 30 * 60 * 1000),
    });
    for (let i = 1; i <= 60 && state !== 'moored'; i += 1) {
      state = position(stateMachine, (30 + i) * 60, LAT, LON);
    }
    assert.equal(state, 'moored', `still ${state} after 60 stationary samples`);
  });
});
