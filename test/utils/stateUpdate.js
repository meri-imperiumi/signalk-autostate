const assert = require('assert');

module.exports = {
  position: (stateMachine, expectedState, lat, lon, minutesElapsed) => {
    const update = {
      path: "navigation.position",
      value: {
        latitude: lat,
        longitude: lon, 
      },
      time: new Date()
    };
    update.time.setMinutes(update.time.getMinutes() + minutesElapsed);
    assert.equal(expectedState, stateMachine.update(update));
  },
};
