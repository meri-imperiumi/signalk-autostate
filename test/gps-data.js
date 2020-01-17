const assert = require("assert");
const geolocationUtils = require("geolocation-utils");
const StateMachine = require("../StateMachine");
const stateUpdate = require("./utils/stateUpdate");
const logs = require('./utils/logs');
const { Point } = require('where');

describe("With actual GPS data", function() {
  const stateMachine = new StateMachine();
  let dataFromFile;
  describe('using an hour of sailing', function() {
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-15T12.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it("should keep the boat under way", function() {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState('sailing', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach(data => {
        stateUpdate.positionWithRealGpsData(
          stateMachine,
          "sailing",
          data.position.lat,
          data.position.lon,
          data.timestamp
        );
      });
    });
  });
  describe('using an hour of being docked', function() {
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-20T01.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it("should keep the boat not-under-way", function() {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState('not-under-way', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach(data => {
        stateUpdate.positionWithRealGpsData(
          stateMachine,
          "not-under-way",
          data.position.lat,
          data.position.lon,
          data.timestamp
        );
      });
    });
  });
});
