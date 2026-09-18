const assert = require('assert');
const geolocationUtils = require('geolocation-utils');
const StateMachine = require('../StateMachine');

// The window proves movement minutes after it started. stateValidFrom carries
// the time the state became true.
describe('time a state became valid', () => {
  const berth = {
    lat: 60.254558,
    lon: 25.042828,
  };

  function feed(stateMachine, point, at) {
    return stateMachine.update({
      path: 'navigation.position',
      value: {
        latitude: point.lat,
        longitude: point.lon,
      },
      time: at,
    });
  }

  it('should date an arrival from the start of the window it proved', () => {
    const stateMachine = new StateMachine();
    const start = new Date('2026-09-18T10:00:00Z');
    let minute = 0;
    const next = () => {
      minute += 1;
      return new Date(start.getTime() + minute * 60000);
    };
    // Under way, then still until the window proves it.
    let point = berth;
    for (let i = 0; i < 12; i += 1) {
      point = geolocationUtils.moveTo(point, { heading: 270, distance: 120 });
      feed(stateMachine, point, next());
    }
    assert.strictEqual(stateMachine.lastState, 'sailing');
    let state = null;
    let validFrom = null;
    let window = null;
    for (let i = 0; i < 12 && state !== 'moored'; i += 1) {
      state = feed(stateMachine, point, next());
      validFrom = stateMachine.stateValidFrom;
      window = stateMachine.positions.toarray();
    }
    assert.strictEqual(state, 'moored');
    // The proof covers the window: stopped at its oldest fix.
    assert.strictEqual(validFrom.getTime(), window[window.length - 1].time.getTime());
    assert.ok(validFrom < window[0].time, 'should predate the deciding fix');
  });

  it('should date the departure from the last fix alongside', () => {
    const stateMachine = new StateMachine();
    const start = new Date('2026-09-18T10:00:00Z');
    let at = start;
    let minute = 0;
    const next = () => {
      minute += 1;
      at = new Date(start.getTime() + minute * 60000);
      return at;
    };
    for (let i = 0; i < 12; i += 1) {
      feed(stateMachine, berth, next());
    }
    // Four more minutes alongside.
    let lastAlongside = at;
    for (let i = 0; i < 4; i += 1) {
      lastAlongside = next();
      feed(stateMachine, berth, lastAlongside);
    }
    let point = berth;
    let state = null;
    let validFrom = null;
    for (let i = 0; i < 4 && state !== 'sailing'; i += 1) {
      point = geolocationUtils.moveTo(point, { heading: 90, distance: 60 });
      state = feed(stateMachine, point, next());
      validFrom = stateMachine.stateValidFrom;
    }
    assert.strictEqual(state, 'sailing');
    assert.strictEqual(validFrom.getTime(), lastAlongside.getTime());
  });

  it('should not drift backwards while the state keeps being re-proved', () => {
    const stateMachine = new StateMachine();
    const start = new Date('2026-09-18T10:00:00Z');
    let minute = 0;
    const next = () => {
      minute += 1;
      return new Date(start.getTime() + minute * 60000);
    };
    for (let i = 0; i < 12; i += 1) {
      feed(stateMachine, berth, next());
    }
    let point = berth;
    let at = null;
    for (let i = 0; i < 14; i += 1) {
      point = geolocationUtils.moveTo(point, { heading: 90, distance: 120 });
      at = next();
      feed(stateMachine, point, at);
    }
    assert.strictEqual(stateMachine.lastState, 'sailing');
    // Still sailing: the delta carries now, not a window ago.
    assert.strictEqual(stateMachine.stateValidFrom.getTime(), at.getTime());
  });
});
