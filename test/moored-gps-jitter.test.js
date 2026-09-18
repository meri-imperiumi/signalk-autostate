const geolocationUtils = require('geolocation-utils');
const StateMachine = require('../StateMachine');
const stateUpdate = require('./utils/stateUpdate');

// Fixes metres off a mooring sum to more than the 100 m threshold over a ten
// minute window.
describe('moored with GPS jitter', () => {
  const stateMachine = new StateMachine();
  const mooring = {
    lat: 60.254558,
    lon: 25.042828,
  };
  const jitter = [0, 90, 180, 270, 45, 225, 135, 315, 0, 180].map((heading) => (
    geolocationUtils.moveTo(mooring, { heading, distance: 15 })
  ));
  after(() => {
    stateUpdate.reset();
  });
  it('should return that we are not under way, when the system boots', () => {
    stateUpdate.position(stateMachine, 'moored', mooring.lat, mooring.lon, 0);
  });
  it('should stay moored while the fixes wander around the mooring', () => {
    jitter.forEach((point) => {
      stateUpdate.position(stateMachine, 'moored', point.lat, point.lon, 1);
    });
  });
  it('should go under way once the vessel actually leaves', () => {
    let point = jitter[jitter.length - 1];
    for (let i = 0; i < 3; i += 1) {
      point = geolocationUtils.moveTo(point, { heading: 90, distance: 120 });
      stateUpdate.position(stateMachine, 'sailing', point.lat, point.lon, 1);
    }
  });
});

// Non-zero reported speed must not switch the jitter branch off.
describe('moored with GPS jitter and non-zero speed', () => {
  const stateMachine = new StateMachine();
  const mooring = {
    lat: 60.254558,
    lon: 25.042828,
  };
  const jitter = [0, 90, 180, 270, 45, 225, 135, 315, 0, 180].map((heading) => (
    geolocationUtils.moveTo(mooring, { heading, distance: 15 })
  ));
  after(() => {
    stateUpdate.reset();
  });
  it('should return that we are not under way, when the system boots', () => {
    stateMachine.update({ path: 'navigation.speedOverGround', value: 0.2 });
    stateUpdate.position(stateMachine, 'moored', mooring.lat, mooring.lon, 0);
  });
  it('should stay moored while the receiver reports jitter speeds', () => {
    jitter.forEach((point) => {
      stateMachine.update({ path: 'navigation.speedOverGround', value: 0.2 });
      stateUpdate.position(stateMachine, 'moored', point.lat, point.lon, 1);
    });
  });
});

describe('a vessel moving slowly inside a small area', () => {
  const stateMachine = new StateMachine();
  const start = {
    lat: 60.254558,
    lon: 25.042828,
  };
  after(() => {
    stateUpdate.reset();
  });
  it('should return that we are not under way, when the system boots', () => {
    stateUpdate.position(stateMachine, 'moored', start.lat, start.lon, 0);
    stateUpdate.position(stateMachine, 'moored', start.lat, start.lon, 11);
  });
  it('should go under way rather than read as jitter', () => {
    // Back and forth waiting for a bridge: small extent, but making way.
    let point = start;
    let heading = 90;
    for (let i = 0; i < 6; i += 1) {
      heading = heading === 90 ? 270 : 90;
      point = geolocationUtils.moveTo(point, { heading, distance: 40 });
      stateMachine.update({ path: 'navigation.speedOverGround', value: 1.5 });
      stateUpdate.position(stateMachine, i < 2 ? 'moored' : 'sailing', point.lat, point.lon, 1);
    }
  });
});
