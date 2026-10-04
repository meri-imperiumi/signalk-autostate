const assert = require('assert');
const StateMachine = require('../StateMachine');

// Regression smoketest for position updates that straddle the antimeridian:
// a boat moored a few meters east of 180° longitude reports longitudes just
// below +180, GPS jitter carries a few samples just above it on the other
// side (-180 + epsilon). The distance between such samples is meters, not
// the ~20 000 km the naive longitude difference suggests, so the state
// machine must keep reading `moored` across the seam.
describe('moored across the antimeridian', () => {
  const START = new Date('2026-01-01T12:00:00Z').getTime();
  const LAT = -14.2;
  // ~4 m west of the seam: the ±0.00004° (~4 m at this latitude) GPS
  // jitter carries the samples across 180° and back. The consecutive
  // distances (~9 m each, ~80 m summed over the 10-minute window) stay
  // inside the 100 m under-way threshold — they read as meters across
  // the seam, not as a 40 000 km detour the naive longitude difference
  // would report
  const LON = 179.99997;

  function position(stateMachine, secondsFromStart, lat, lon) {
    return stateMachine.update({
      path: 'navigation.position',
      value: { latitude: lat, longitude: lon },
      time: new Date(START + secondsFromStart * 1000),
    });
  }

  it('stays moored when stationary samples straddle 180°', () => {
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

    // Now the vessel stops and stays put, but the GPS jitter walks the
    // reported longitude across the seam on every other sample.
    stateMachine.update({
      path: 'navigation.speedOverGround',
      value: 0.05,
      time: new Date(START + seconds * 1000),
    });
    for (let i = 1; i <= 60 && state !== 'moored'; i += 1) {
      seconds += 60;
      let lon = LON + (i % 2 === 0 ? 0.00004 : -0.00004);
      if (lon > 180) {
        lon -= 360; // wrap like real GPS data does at the antimeridian
      }
      state = position(stateMachine, seconds, LAT, lon);
    }
    assert.equal(state, 'moored', `still ${state} after 60 seam-straddling samples`);
  });
});
