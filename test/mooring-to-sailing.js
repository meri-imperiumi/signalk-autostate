const assert = require("assert");
const geolocationUtils = require('geolocation-utils');
const StateMachine = require("../StateMachine");
const stateUpdate = require('./utils/stateUpdate');

describe("transition from not-under-way to sailing", function() {
  const stateMachine = new StateMachine();
  const initialPoint = {
    lat: 60.254558,
    lon: 25.042828,
  };
  const pointOutOfBounds = geolocationUtils.moveTo(initialPoint, 90, 101);
  const pointOutOfBounds2 = geolocationUtils.moveTo(initialPoint, 90, 501);
  it("should return that we are not under way, when the system boots", function() {
    stateUpdate.position(stateMachine, 'not-under-way', initialPoint.lat, initialPoint.lon, 0);
  });
  it("should return that we are not under way, when position has changed but 10 minutes have not elapsed", function() {
    stateUpdate.position(stateMachine, 'not-under-way', pointOutOfBounds.lat, pointOutOfBounds.lon, 5);
  });
  it("should return that we are sailing, when position has changed", function() {
    stateUpdate.position(stateMachine, 'sailing', pointOutOfBounds.lat, pointOutOfBounds.lon, 11);
  });
  it("should return that we are sailing, when position has not changed and 10 minutes have not elapsed", function() {
    stateUpdate.position(stateMachine, 'sailing', pointOutOfBounds.lat, pointOutOfBounds.lon, 5);
  });
  it("should return that we are sailing, when position has changed and 10 minutes have elapsed", function() {
    stateUpdate.position(stateMachine, 'sailing', pointOutOfBounds2.lat, pointOutOfBounds2.lon, 15);
  });
});
