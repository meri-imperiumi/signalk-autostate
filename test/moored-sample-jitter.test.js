const assert = require('assert');
const StateMachine = require('../StateMachine');

// Regression test for the case where position updates do not land exactly on
// the sampling period. A 1 Hz GPS combined with a throttled Signal K
// subscription produces samples that are a few seconds shorter than the
// nominal period. Those samples used to be dropped by the "one sample per
// minute" guard, so the accumulated observation window never reached
// positionUpdateMinutes and `moored` was never reached: the vessel stayed
// `motoring` forever while tied to a dock.
describe('moored with position updates slightly faster than the sampling period', () => {
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

  [57, 58, 59, 60].forEach((cadence) => {
    it(`reaches moored with position updates every ${cadence} s`, () => {
      const stateMachine = new StateMachine(10, 100, 'motoring', 0, true);
      let seconds = 0;
      let state = null;

      // Get the vessel under way first: move roughly 300 m per minute.
      stateMachine.update({
        path: 'navigation.speedOverGround',
        value: 5,
        time: new Date(START),
      });
      for (let i = 1; i <= 15; i += 1) {
        seconds += 60;
        state = position(stateMachine, seconds, LAT + i * 0.0027, LON);
      }
      assert.equal(state, 'motoring', 'vessel should be under way before mooring');

      // Now the vessel stops and stays in place, but the samples arrive
      // slightly faster than the nominal sampling period.
      stateMachine.update({
        path: 'navigation.speedOverGround',
        value: 0.05,
        time: new Date(START + seconds * 1000),
      });
      for (let i = 1; i <= 60 && state !== 'moored'; i += 1) {
        seconds += cadence;
        state = position(stateMachine, seconds, LAT, LON);
      }
      assert.equal(state, 'moored', `still ${state} after 60 stationary samples`);
    });
  });
});
