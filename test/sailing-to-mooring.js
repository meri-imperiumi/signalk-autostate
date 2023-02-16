const { Point } = require('where');
const geolocationUtils = require('geolocation-utils');
const StateMachine = require('../StateMachine');
const stateUpdate = require('./utils/stateUpdate');

describe('transition from sailing to moored', () => {
  const stateMachine = new StateMachine();
  const initialPoint = {
    lat: 60.254558,
    lon: 25.042828,
  };
  const sailingPoint = geolocationUtils.moveTo(initialPoint, { heading: 90, distance: 101 });
  const mooringPoint1 = geolocationUtils.moveTo(sailingPoint, { heading: 90, distance: 401 });
  const mooringPoint2 = geolocationUtils.moveTo(mooringPoint1, { heading: 90, distance: 50 });
  before(() => {
    stateMachine.setState('sailing', {
      path: 'navigation.position',
      value: new Point(initialPoint.lat, initialPoint.lon),
      time: new Date(),
    });
  });
  after(() => {
    stateUpdate.reset();
  });
  it('should return that we are sailing at first', () => {
    stateUpdate.position(stateMachine, 'sailing', initialPoint.lat, initialPoint.lon, 0);
  });
  it('should return that we are sailing, when position has changed', () => {
    stateUpdate.position(stateMachine, 'sailing', sailingPoint.lat, sailingPoint.lon, 10);
  });
  it('should return that we are sailing, when we have just arrived to mooring spot', () => {
    stateUpdate.position(stateMachine, 'sailing', mooringPoint1.lat, mooringPoint1.lon, 10);
  });
  it('should return that we are not under way when we have not moved in 10 minutes', () => {
    stateUpdate.position(stateMachine, 'moored', mooringPoint1.lat, mooringPoint1.lon, 11);
  });
  it('should still return that we are not under way when we have not moved in 20 minutes', () => {
    stateUpdate.position(stateMachine, 'moored', mooringPoint1.lat, mooringPoint1.lon, 21);
  });
  it('should still return that we are not under way when we have moved only slightly', () => {
    stateUpdate.position(stateMachine, 'moored', mooringPoint2.lat, mooringPoint2.lon, 11);
  });
});
