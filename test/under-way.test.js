const assert = require("assert");
const geolocationUtils = require("geolocation-utils");
const StateMachine = require("../StateMachine");
const stateUpdate = require("./utils/stateUpdate");
const nmeaSimple = require("nmea-simple");
const { Point } = require('where');
const fs = require("fs");
const util = require("util");
const path = require("path");

describe("sailing with actual gps data", function() {
  const stateMachine = new StateMachine();
  const readFile = util.promisify(fs.readFile);
  let dataFromFile;
  before(async () => {
    const dataPath12 = path.resolve(
      __dirname,
      "./logs/skserver-raw_2019-09-15T12.log"
    );
    const dataPath13 = path.resolve(
      __dirname,
      "./logs/skserver-raw_2019-09-15T13.log"
    );
    const dataPath14 = path.resolve(
      __dirname,
      "./logs/skserver-raw_2019-09-15T14.log"
    );

    dataFromFile = await readFile(dataPath13, "utf-8");
  });
  after(() => {
    stateUpdate.reset();
  });

  it("should sail if we are actually doing it", function() {
    const allLines = dataFromFile.split("\n");
    const values = allLines
      .map(row => {
        const [timestamp, n, value] = row.split(";");
        try {
          const parsed = nmeaSimple.parseNmeaSentence(value);
          if (!parsed.latitude) {
            return null;
          }
          return {
            position: {
              lat: parsed.latitude,
              lon: parsed.longitude
            },
            timestamp
          };
        } catch (error) {
          return null;
        }
      })
      .filter(row => row !== null);

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
