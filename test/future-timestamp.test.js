const assert = require('assert');
const StateMachine = require('../StateMachine');

// Regression test for the case where a position update arrives with a
// timestamp ahead of the buffered samples (for example a corrupt GPS
// sentence with a bad time field, or a second position source with an
// independent clock). Such a sample used to become the buffer head, after
// which every subsequent real position was silently discarded by the
// one-per-minute guard: the elapsed difference was negative, the buffer never
// aged out, and navigation.state stayed frozen until the server was
// restarted. The buffer must instead be reset so evaluation can resume.
describe('position updates with timestamps ahead of the buffer head', () => {
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

  it('reaches sailing after a corrupt future sample while moored', () => {
    const stateMachine = new StateMachine(5, 100, 'sailing', 0, true);
    let state = null;

    // Start moored: first sample always sets moored
    for (let i = 1; i <= 6; i += 1) {
      state = position(stateMachine, i * 60, LAT, LON);
    }
    assert.equal(state, 'moored', 'vessel should be moored');

    // Corrupt sentence with a timestamp 10 years in the future
    position(stateMachine, 10 * 365 * 24 * 60 * 60, LAT, LON);

    // Vessel departs and starts moving, roughly 300 m per minute
    stateMachine.update({
      path: 'navigation.speedOverGround',
      value: 5,
      time: new Date(START + 6 * 60 * 1000),
    });
    for (let i = 7; i <= 30 && state !== 'sailing'; i += 1) {
      state = position(stateMachine, i * 60, LAT + i * 0.0027, LON);
    }
    assert.equal(state, 'sailing', `still ${state} after 24 minutes under way`);
  });

  it('recovers after a corrupt sample with a far future timestamp', () => {
    const stateMachine = new StateMachine(5, 100, 'sailing', 0, true);
    let state = null;

    // Real GPS fixes, roughly 300 m apart per minute: vessel under way
    stateMachine.update({
      path: 'navigation.speedOverGround',
      value: 5,
      time: new Date(START),
    });
    for (let i = 1; i <= 15; i += 1) {
      state = position(stateMachine, i * 60, LAT + i * 0.0027, LON);
    }
    assert.equal(state, 'sailing', 'vessel should be under way');

    // Corrupt sentence: valid checksum but bogus timestamp in the future
    state = position(stateMachine, 60 * 60 * 24 * 365, LAT, LON);
    assert.equal(state, 'sailing');

    // Real fixes resume. Before the fix these were all silently discarded
    // and the state stayed frozen; the vessel must keep being evaluated.
    for (let i = 17; i <= 30; i += 1) {
      state = position(stateMachine, i * 60, LAT + i * 0.0027, LON);
    }
    assert.equal(state, 'sailing', 'state evaluation should resume after the corrupt sample');

    // And the vessel can still reach moored when it stops
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
