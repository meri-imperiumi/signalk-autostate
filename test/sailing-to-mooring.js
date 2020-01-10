const assert = require("assert");
const { Point } = require('where');
const geolocationUtils = require('geolocation-utils');
const StateMachine = require("../StateMachine");
const stateUpdate = require('./utils/stateUpdate');

describe("transition from sailing to not-under-way", function() {
  const stateMachine = new StateMachine();
  const initialPoint = {
    lat: 60.254558,
    lon: 25.042828,
  };
  const sailingPoint = geolocationUtils.moveTo(initialPoint, 90, 101);
  const mooringPoint1 = geolocationUtils.moveTo(initialPoint, 90, 501);
  const mooringPoint2 = geolocationUtils.moveTo(initialPoint, 90, 550);
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
  it("should return that we are sailing at first", function() {
    stateUpdate.position(stateMachine, 'sailing', initialPoint.lat, initialPoint.lon, 0);
  });
  it("should return that we are sailing, when position has changed", function() {
    stateUpdate.position(stateMachine, 'sailing', sailingPoint.lat, sailingPoint.lon, 11);
  });
  it("should return that we are sailing, when we have arrived to mooring spot", function() {
    stateUpdate.position(stateMachine, 'sailing', mooringPoint1.lat, mooringPoint1.lon, 11);
  });
  it("should return that we are not under way when we have not moved in 10 minutes", function() {
    stateUpdate.position(stateMachine, 'not-under-way', mooringPoint1.lat, mooringPoint1.lon, 11);
  });
  it("should still return that we are not under way when we have not moved in 20 minutes", function() {
    stateUpdate.position(stateMachine, 'not-under-way', mooringPoint1.lat, mooringPoint1.lon, 21);
  });
  it("should still return that we are not under way when we have moved only slightly", function() {
    stateUpdate.position(stateMachine, 'not-under-way', mooringPoint2.lat, mooringPoint2.lon, 11);
  });
});
