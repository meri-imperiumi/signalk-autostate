const assert = require('assert');

let latestTime = null;

module.exports = {
  position: (stateMachine, expectedState, lat, lon, minutesElapsed) => {
    const update = {
      path: "navigation.position",
      value: {
        latitude: lat,
        longitude: lon, 
      },
      time: latestTime || new Date()
    };
    update.time.setMinutes(update.time.getMinutes() + minutesElapsed);
    latestTime = new Date(update.time.getTime());
    assert.equal(expectedState, stateMachine.update(update));
  },

  positionWithRealGpsData: (stateMachine, expectedState, lat, lon, timestamp) => {
    const update = {
      path: "navigation.position",
      value: {
        latitude: lat,
        longitude: lon, 
      },
      time: new Date(timestamp)
    };
    assert.equal(expectedState, stateMachine.update(update));
  },
  reset: () => {
    latestTime = null;
  },
};
