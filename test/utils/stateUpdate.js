const assert = require('assert');

let latestTime = null;

module.exports = {
  position: (stateMachine, expectedState, lat, lon, minutesElapsed) => {
    const update = {
      path: 'navigation.position',
      value: {
        latitude: lat,
        longitude: lon,
      },
      time: latestTime || new Date(),
    };
    update.time.setMinutes(update.time.getMinutes() + minutesElapsed);
    latestTime = new Date(update.time.getTime());
    assert.equal(stateMachine.update(update), expectedState);
  },

  positionWithRealGpsData: (
    stateMachine,
    expectedState,
    lat,
    lon,
    timestamp,
  ) => {
    const update = {
      path: 'navigation.position',
      value: {
        latitude: lat,
        longitude: lon,
      },
      time: new Date(timestamp),
    };
    try {
      assert.equal(stateMachine.update(update), expectedState);
    } catch (e) {
      console.log('CATCH ERROR');
      console.log(expectedState, stateMachine);
      throw (e);
    }
  },
  anchorPositionWithRealGpsData: (
    stateMachine,
    expectedState,
    value,
    timestamp,
  ) => {
    const update = {
      path: value.path,
      value: value.value,
      time: new Date(timestamp),
    };
    assert.equal(stateMachine.update(update), expectedState);
  },
  logUpdate: (stateMachine, expectedState, value, timestamp) => {
    if (value.position) {
      if (value.speedOverGround) {
        stateMachine.update({
          path: 'navigation.speedOverGround',
          value: value.speedOverGround,
        });
      }
      // Basic GPS update
      module.exports.positionWithRealGpsData(
        stateMachine,
        expectedState,
        value.position.lat,
        value.position.lon,
        timestamp,
      );
      return;
    }
    // TODO: Handle anchoralarm updates
    if (value.updates) {
      value.updates.forEach((val) => {
        val.values.forEach((v) => {
          if (v.path === 'navigation.speedOverGround') {
            assert.equal(stateMachine.update({
              ...v,
              time: new Date(timestamp),
            }), expectedState);
          }
          if (v.path === 'navigation.anchor.position') {
            module.exports.anchorPositionWithRealGpsData(
              stateMachine,
              expectedState,
              v,
              timestamp,
            );
          }
          if (v.path === 'propulsion.main.state') {
            assert.equal(stateMachine.update({
              ...v,
              time: new Date(timestamp),
            }), expectedState);
          }
        });
      });
    }
  },

  reset: () => {
    latestTime = null;
  },
};
