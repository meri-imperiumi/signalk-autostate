const geolocationUtils = require('geolocation-utils');
const StateMachine = require('../StateMachine');
const stateUpdate = require('./utils/stateUpdate');

describe('transition from anchored to sailing', () => {
  const stateMachine = new StateMachine();
  const initialPoint = {
    lat: 60.254558,
    lon: 25.042828,
  };
  const pointOutOfBounds = geolocationUtils.moveTo(initialPoint, {
    heading: 90,
    distance: 101,
  });
  const pointOutOfBounds2 = geolocationUtils.moveTo(pointOutOfBounds, {
    heading: 90,
    distance: 400,
  });
  const pointOutOfBounds3 = geolocationUtils.moveTo(pointOutOfBounds2, {
    heading: 90,
    distance: 400,
  });
  after(() => {
    stateUpdate.reset();
  });
  it('should set state as anchored when given anchor position', () => {
    stateUpdate.anchor(stateMachine, 'anchored', initialPoint, 0);
  });
  it('should remain anchored despite moving about', () => {
    stateUpdate.position(stateMachine, 'anchored', pointOutOfBounds.lat, pointOutOfBounds.lon, 20);
    stateUpdate.position(stateMachine, 'anchored', initialPoint.lat, initialPoint.lon, 20);
  });
  it('should set state as sailing when given NULL anchor position', () => {
    stateUpdate.anchor(stateMachine, 'sailing', null, 4);
  });
  it('should stay sailing when immediately given point next to anchor', () => {
    stateUpdate.position(stateMachine, 'sailing', initialPoint.lat, initialPoint.lon, 0);
  });
  it('should stay sailing when not moving for a few minutes', () => {
    for (let i = 9; i > 0; i -= 1) {
      stateUpdate.position(stateMachine, 'sailing', initialPoint.lat, initialPoint.lon, 1);
      console.log(i);
    }
  });
  it('should return that we are sailing, when position has not changed within 10min of hoisting anchor', () => {
    stateUpdate.position(stateMachine, 'sailing', pointOutOfBounds.lat, pointOutOfBounds.lon, 10);
  });
  it('should return that we are sailing, when position has changed and 10 minutes have not elapsed', () => {
    stateUpdate.position(stateMachine, 'sailing', pointOutOfBounds2.lat, pointOutOfBounds2.lon, 5);
  });
  it('should return that we are sailing, when position has changed and 10 minutes have elapsed', () => {
    stateUpdate.position(stateMachine, 'sailing', pointOutOfBounds3.lat, pointOutOfBounds3.lon, 10);
  });
});
