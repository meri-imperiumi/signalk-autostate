const assert = require("assert");

let latestTime = null;

module.exports = {
  position: (stateMachine, expectedState, lat, lon, minutesElapsed) => {
    const update = {
      path: "navigation.position",
      value: {
        latitude: lat,
        longitude: lon
      },
      time: latestTime || new Date()
    };
    update.time.setMinutes(update.time.getMinutes() + minutesElapsed);
    latestTime = new Date(update.time.getTime());
    assert.equal(expectedState, stateMachine.update(update));
  },

  positionWithRealGpsData: (
    stateMachine,
    expectedState,
    lat,
    lon,
    timestamp
  ) => {
    const update = {
      path: "navigation.position",
      value: {
        latitude: lat,
        longitude: lon
      },
      time: new Date(timestamp)
    };
    try {
      assert.equal(expectedState, stateMachine.update(update));

    } catch (e) {
      console.log(expectedState, stateMachine);
      throw(e);
    }
  },
  anchorPositionWithRealGpsData: (
    stateMachine,
    expectedState,
    value,
    timestamp
  ) => {
    const update = {
      path: value.path,
      value: value.value,
      time: new Date(timestamp)
    };
    assert.equal(expectedState, stateMachine.update(update));
  },
  logUpdate: (stateMachine, expectedState, value, timestamp) => {
    if (value.position) {
      // Basic GPS update
      module.exports.positionWithRealGpsData(
        stateMachine,
        expectedState,
        value.position.lat,
        value.position.lon,
        timestamp
      );
      return;
    }
    // TODO: Handle anchoralarm updates
    if (value.updates) {
      value.updates.forEach(val => {
        val.values.forEach(v => {
          if (v.path !== "navigation.anchor.position") {
            return;
          }
          module.exports.anchorPositionWithRealGpsData(
            stateMachine,
            expectedState,
            v,
            timestamp
          );
        });
      });
    }
  },

  reset: () => {
    latestTime = null;
  }
};
