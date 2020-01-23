const assert = require("assert");
const geolocationUtils = require("geolocation-utils");
const StateMachine = require("../StateMachine");
const stateUpdate = require("./utils/stateUpdate");
const logs = require("./utils/logs");
const { Point } = require("where");

describe("With actual GPS data", function() {
  let dataFromFile;
  describe("using an hour of sailing", function() {
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile("skserver-raw_2019-09-15T12.log");
    });
    after(() => {
      stateUpdate.reset();
    });

    it("should keep the boat under way", function() {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState("sailing", {
        path: "navigation.position",
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp)
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
  describe("using an hour of being docked", function() {
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile("skserver-raw_2019-09-20T01.log");
    });
    after(() => {
      stateUpdate.reset();
    });

    it("should keep the boat not-under-way", function() {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState("not-under-way", {
        path: "navigation.position",
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp)
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
  describe("departure from harbour", function() {
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile("skserver-raw_2019-09-15T10.log");
    });
    after(() => {
      stateUpdate.reset();
    });

    it("should switch boat from not-under-way to sailing", function() {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState("not-under-way", {
        path: "navigation.position",
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp)
      });

      values.forEach(data => {
        let expectedState = "not-under-way";
        if (data.timestamp >= 1568544452078) {
          expectedState = "sailing";
        }
        stateUpdate.positionWithRealGpsData(
          stateMachine,
          expectedState,
          data.position.lat,
          data.position.lon,
          data.timestamp
        );
      });
    });
  });
  describe("arrival to harbour", function() {
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile("skserver-raw_2019-09-21T12.log");
    });
    after(() => {
      stateUpdate.reset();
    });

    it("should switch boat from sailing to not-under-way", function() {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState("sailing", {
        path: "navigation.position",
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp)
      });
      values.forEach(data => {
        let expectedState = "sailing";
        if (data.timestamp >= 1569068400067) {
          expectedState = "not-under-way";
        }
        stateUpdate.positionWithRealGpsData(
          stateMachine,
          expectedState,
          data.position.lat,
          data.position.lon,
          data.timestamp
        );
      });
    });
  });
});
