const { Point } = require('where');
const CircularBuffer = require('circular-buffer');
const debug = require('debug')('signalk-autostate:statemachine:update');
const debugFallback = require('debug')('signalk-autostate:statemachine:fallback');

// Receiver noise, in meters and m/s: not a function of the threshold or the
// window length, so absolute.
const JITTER_EXTENT_METERS = 50;
const JITTER_MAX_SPEED = 0.5;

const moored = 'moored';
const anchored = 'anchored';
const sailing = 'sailing';
const motoring = 'motoring';

// Bounding box diagonal in meters. Does not grow with jitter around a point.
function extentOf(positions) {
  if (positions.length < 2) {
    return 0;
  }
  const lats = positions.map((p) => p.lat);
  const lons = positions.map((p) => p.lon);
  const southWest = new Point(Math.min(...lats), Math.min(...lons));
  const northEast = new Point(Math.max(...lats), Math.max(...lons));
  return southWest.distanceTo(northEast) * 1000;
}

class StateMachine {
  constructor(positionUpdateMinutes = 10, underWayThresholdMeters = 100, defaultPropulsion = 'sailing', motorStoppedSpeed = 0, watchKeepMoving = true) {
    this.stateChangeTime = null;
    this.stateChangePosition = null;
    this.positions = new CircularBuffer(positionUpdateMinutes + 1);
    this.lastState = null;
    this.positionUpdateMinutes = positionUpdateMinutes;
    this.underWayThresholdMeters = underWayThresholdMeters;
    this.defaultPropulsion = defaultPropulsion;
    this.currentPropulsion = defaultPropulsion;
    this.motorStoppedSpeed = motorStoppedSpeed;
    this.watchKeepMoving = watchKeepMoving;
    this.currentSpeed = 0;
    this.currentOnWatch = false;
    this.engineStates = {};
  }

  setState(state, update) {
    if (state !== this.lastState) {
      debug(`State has changed from ${this.lastState} to ${state}`);
      this.stateChangeTime = update.time || new Date();
      if (update.path === 'navigation.position') {
        this.setPosition(update.value);
      }
      this.lastState = state;
    } else if (state === sailing || state === motoring) {
      this.stateChangeTime = update.time || new Date();
      if (update.path === 'navigation.position') {
        this.setPosition(update.value);
      }
    }
    return state;
  }

  setPosition(position) {
    debug(`Set state position to ${position}`);
    this.stateChangePosition = position;
  }

  switchMotoringSailing(engine, engineIsRunning, update) {
    this.engineStates[engine] = engineIsRunning;
    const anyEngineRunning = Object
      .keys(this.engineStates)
      .find((eng) => this.engineStates[eng]);
    const newPropulsion = anyEngineRunning ? 'motoring' : this.defaultPropulsion;

    const oldPropulsion = this.currentPropulsion;
    if (oldPropulsion === newPropulsion) {
      return this.lastState;
    }
    this.currentPropulsion = newPropulsion;
    if (this.lastState === motoring && this.currentSpeed <= this.motorStoppedSpeed) {
      // Special-case when motor is stopped and speed is zero
      debug(`Motor stopped while speed is ${this.currentSpeed}, assuming moored`);
      return this.setState(moored, update);
    }
    if (this.lastState === motoring || this.lastState === sailing) {
      // Under way, switch state to new propulsion method
      debug(`Under way and switched from ${oldPropulsion} to ${newPropulsion}`);
      return this.setState(newPropulsion, update);
    }
    return this.lastState;
  }

  update(update) {
    if (update.path === 'navigation.speedOverGround') {
      this.currentSpeed = update.value;
    }
    if (update.path === 'watch.state.onWatch') {
      this.currentOnWatch = update.value;
    }
    if (update.path === 'navigation.anchor.position') {
      if (update.value) {
        // anchor position has a value, we have dropped the anchor
        return this.setState(anchored, update);
      }
      // With null value the anchor is hoisted
      return this.setState(this.currentPropulsion, update);
    }

    const propulsionState = update.path.match(/propulsion\.([A-Za-z0-9]+)\.state/);
    if (propulsionState) {
      if (update.value === 'started') {
        return this.switchMotoringSailing(propulsionState[1], true, update);
      }
      return this.switchMotoringSailing(propulsionState[1], false, update);
    }
    const propulsionRevolutions = update.path.match(/propulsion\.([A-Za-z0-9]+)\.revolutions/);
    if (propulsionRevolutions) {
      if (update.value > 0) {
        return this.switchMotoringSailing(propulsionRevolutions[1], true, update);
      }
      return this.switchMotoringSailing(propulsionRevolutions[1], false, update);
    }
    if (update.path === 'navigation.position' && this.lastState !== anchored) {
      if (!update.value || update.value.latitude == null || update.value.longitude == null) {
        // Safety for empty positions
        return this.lastState;
      }

      // inHarbour we have moved less than 100 meters in 10 minutes
      const positionUpdate = {
        time: update.time,
        path: update.path,
        value: new Point(update.value.latitude, update.value.longitude),
        speed: this.currentSpeed,
      };
      if (this.positions.size() > 0) {
        // Ensure that a minute has elapsed
        if ((positionUpdate.time - this.positions.get(0).time) / 1000 < 60) {
          return this.lastState;
        }
      }
      this.positions.enq(positionUpdate);

      if (!this.stateChangeTime) {
        debug(`First state change ${positionUpdate.value} ${positionUpdate.time}`);
        return this.setState(moored, positionUpdate);
      }

      if (this.positions.size() < this.positionUpdateMinutes
        && (positionUpdate.time - this.stateChangeTime) / 60000 < this.positionUpdateMinutes) {
        debugFallback(`Only ${Math.round((positionUpdate.time - this.stateChangeTime) / 60000)} minutes elapsed since last state change, returning old state`);
        return this.lastState;
      }

      const distance = this.positions.toarray().reduce((d, u, idx, arr) => {
        if (idx === 0) {
          // Skip first entry as we're counting distances
          return d;
        }
        if (Math.round((positionUpdate.time - u.time) / 60000) > this.positionUpdateMinutes) {
          // Stale entry
          return d;
        }
        const previous = arr[idx - 1];
        const elapsed = (previous.time - u.time) / 1000;
        const dist = previous.value.distanceTo(u.value) * 1000;
        return {
          dist: d.dist + dist,
          time: d.time + elapsed,
          speed: d.speed,
          window: d.window.concat([u.value]),
        };
      }, {
        dist: 0,
        time: 0,
        speed: 0,
        window: [this.positions.get(0).value],
      });
      if (distance.time && distance.dist) {
        distance.speed = distance.dist / distance.time;
      }
      // The path length accumulates noise past the threshold; the extent does
      // not. Inside the jitter limits the vessel has not moved, however long
      // its path.
      const extent = extentOf(distance.window);
      const jitter = distance.dist >= this.underWayThresholdMeters
        && extent < Math.min(JITTER_EXTENT_METERS, this.underWayThresholdMeters / 2)
        && this.currentSpeed <= JITTER_MAX_SPEED;
      if (jitter) {
        debug(`Has moved ${Math.round(distance.dist)} meters but stayed within ${Math.round(extent)} meters in ${Math.round(distance.time / 60)} minutes`);
      }
      if (distance.dist < this.underWayThresholdMeters || jitter) {
        // Round to whole minutes, like the staleness check above does. The
        // accumulated window is bounded by the sample buffer, so comparing the
        // exact figure makes this check fail permanently when the samples do
        // not land precisely on the sampling period (for example a 1 Hz GPS
        // behind a throttled subscription, where they arrive a few seconds
        // early and get dropped by the one-per-minute guard).
        if (Math.round(distance.time / 60) < this.positionUpdateMinutes) {
          debug(`Has only moved ${Math.round(distance.dist)} meters in ${Math.round(distance.time / 60)} minutes (${distance.speed.toFixed(2)}m/s). Ignoring since below time treshold`);
          return this.lastState;
        }
        if (this.watchKeepMoving && this.currentOnWatch) {
          debug(`Has only moved ${Math.round(distance.dist)} meters in ${Math.round(distance.time / 60)} minutes (${distance.speed.toFixed(2)}m/s). Ignoring since watch schedule is active`);
          return this.lastState;
        }
        debug(`Has only moved ${Math.round(distance.dist)} meters in ${Math.round(distance.time / 60)} minutes (${distance.speed.toFixed(2)}m/s)`);
        return this.setState(moored, positionUpdate);
      }
      if (this.lastState === 'moored' && this.currentSpeed === 0 && (positionUpdate.time - this.stateChangeTime) / 60000 < 10) {
        debug(`Has moved > ${this.underWayThresholdMeters}m (${Math.round(distance.dist)} meters) but speed is zero, assuming staying moored`);
        return this.lastState;
      }
      // If we are not in harbour we are sailing or motoring
      debug(`Has moved > ${this.underWayThresholdMeters}m (${Math.round(distance.dist)} meters in ${Math.round(distance.time / 60)} minutes, ${distance.speed.toFixed(2)}m/s)`);
      return this.setState(this.currentPropulsion, positionUpdate);
    }
    return this.lastState;
  }
}

module.exports = StateMachine;
