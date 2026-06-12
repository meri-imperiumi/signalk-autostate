const geolocationUtils = require('geolocation-utils');
const StateMachine = require('../StateMachine');
const stateUpdate = require('./utils/stateUpdate');

describe('handling multiple engines', () => {
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
  after(() => {
    stateUpdate.reset();
  });
  describe('with engine1 running', () => {
    it('should return that we are not under way, when the system boots', () => {
      stateUpdate.position(stateMachine, 'moored', initialPoint.lat, initialPoint.lon, 0);
      stateUpdate.engine(stateMachine, 'moored', 'engine1', 'started');
    });
    it('should return that we are not under way, when position has changed but 10 minutes have not elapsed', () => {
      stateUpdate.position(stateMachine, 'moored', pointOutOfBounds.lat, pointOutOfBounds.lon, 5);
    });
    it('should return that we are motoring, when position has changed', () => {
      stateUpdate.position(stateMachine, 'motoring', pointOutOfBounds.lat, pointOutOfBounds.lon, 5);
    });
    it('should return that we are motoring, when position has not changed and 10 minutes have not elapsed', () => {
      stateUpdate.position(stateMachine, 'motoring', pointOutOfBounds.lat, pointOutOfBounds.lon, 2);
    });
  });
  describe('with both engines running', () => {
    before(() => {
      stateUpdate.engine(stateMachine, 'motoring', 'engine2', 'started');
    });
    it('should return that we are motoring, when position has not changed and 10 minutes have not elapsed', () => {
      stateUpdate.position(stateMachine, 'motoring', pointOutOfBounds.lat, pointOutOfBounds.lon, 2);
    });
  });
  describe('with engine2 running', () => {
    before(() => {
      stateMachine.currentSpeed = 2;
      stateUpdate.engine(stateMachine, 'motoring', 'engine1', 'stopped');
    });
    it('should return that we are motoring, when position has changed and 10 minutes have elapsed', () => {
      stateUpdate.position(stateMachine, 'motoring', pointOutOfBounds2.lat, pointOutOfBounds2.lon, 10);
    });
  });
  describe('with no engines running', () => {
    it('should return that we are sailing, when position has not changed and 10 minutes have not elapsed', () => {
      stateUpdate.engine(stateMachine, 'sailing', 'engine2', 'stopped');
      stateUpdate.position(stateMachine, 'sailing', pointOutOfBounds2.lat, pointOutOfBounds2.lon, 2);
    });
  });
});
