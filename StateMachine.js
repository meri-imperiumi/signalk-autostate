const { Point } = require('where');
const CircularBuffer = require('circular-buffer');
const debug = require('debug')('signalk-autostate:statemachine:update');
const debugFallback = require('debug')('signalk-autostate:statemachine:fallback');

const moored = 'moored';
const anchored = 'anchored';
const sailing = 'sailing';
const motoring = 'motoring';

class StateMachine {
  constructor(positionUpdateMinutes = 10, underWayThresholdMeters = 100, defaultPropulsion = 'sailing', motorStoppedSpeed = 0) {
    this.stateChangeTime = null;
    this.stateChangePosition = null;
    this.positions = new CircularBuffer(positionUpdateMinutes + 1);
    this.lastState = null;
    this.positionUpdateMinutes = positionUpdateMinutes;
    this.underWayThresholdMeters = underWayThresholdMeters;
    this.defaultPropulsion = defaultPropulsion;
    this.currentPropulsion = defaultPropulsion;
    this.motorStoppedSpeed = motorStoppedSpeed;
    this.currentSpeed = 0;
  }

  setState(state, update) {
    if (state !== this.lastState) {
      debug(`State has changed from ${this.lastState} to ${state}`);
      this.stateChangeTime = update.time;
      if (update.path === 'navigation.position') {
        this.setPosition(update.value);
      }
      this.lastState = state;
    } else if (state === sailing || state === motoring) {
      this.stateChangeTime = update.time;
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

  switchMotoringSailing(newPropulsion, update) {
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
    if (update.path === 'navigation.anchor.position') {
      if (update.value) {
        // anchor position has a value, we have dropped the anchor
        return this.setState(anchored, update);
      }
      // With null value the anchor is hoisted
      const newState = this.setState(this.currentPropulsion, update);
      // Here we need to give a bit more time from deactivating anchor alarm
      // to getting under way without a "fake moored" in between
      this.stateChangeTime.setMinutes(this.stateChangeTime.getMinutes() + 5);

      return newState;
    }

    if (update.path.match(/propulsion\.([A-Za-z0-9]+)\.state/)) {
      if (update.value === 'started') {
        return this.switchMotoringSailing(motoring, update);
      }
      return this.switchMotoringSailing(this.defaultPropulsion, update);
    }
    if (update.path.match(/propulsion\.([A-Za-z0-9]+)\.revolutions/)) {
      if (update.value > 0) {
        return this.switchMotoringSailing(motoring, update);
      }
      return this.switchMotoringSailing(this.defaultPropulsion, update);
    }
    if (update.path === 'navigation.position' && this.lastState !== anchored) {
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
        };
      }, {
        dist: 0,
        time: 0,
        speed: 0,
      });
      if (distance.time && distance.dist) {
        distance.speed = distance.dist / distance.time;
      }
      if (distance.dist < this.underWayThresholdMeters) {
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
