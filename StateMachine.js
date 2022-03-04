const { Point } = require('where');
const debug = require('debug')('signalk-autostate:statemachine:update');
const debugFallback = require('debug')('signalk-autostate:statemachine:fallback');

const moored = 'moored';
const anchored = 'anchored';
const sailing = 'sailing';
const motoring = 'motoring';

class StateMachine {
  constructor(positionUpdateMinutes = 10, underWayThresholdMeters = 100, defaultPropulsion = 'sailing', underWayThresholdSpeed = 2) {
    this.stateChangeTime = null;
    this.stateChangePosition = null;
    this.lastState = null;
    this.positionUpdateMinutes = positionUpdateMinutes;
    this.underWayThresholdMeters = underWayThresholdMeters;
    this.underWayThresholdSpeed = underWayThresholdSpeed;
    this.defaultPropulsion = defaultPropulsion;
    this.currentPropulsion = defaultPropulsion;
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

  update(update) {
    // anchor postion has a value, we have dropped the anchor
    if (update.path === 'navigation.anchor.position') {
      if (update.value) {
        return this.setState(anchored, update);
      }
      return this.setState(this.currentPropulsion, update);
    }

    if (update.path.match(/propulsion\.([A-Za-z0-9]+)\.state/)) {
      if (update.value === 'started') {
        this.currentPropulsion = 'motoring';
      } else {
        this.currentPropulsion = this.defaultPropulsion;
      }
      return this.lastState;
    }
    if (update.path.match(/propulsion\.([A-Za-z0-9]+)\.revolutions/)) {
      if (update.value) {
        this.currentPropulsion = 'motoring';
      } else {
        this.currentPropulsion = this.defaultPropulsion;
      }
      return this.lastState;
    }
    if (update.path === 'navigation.speedOverGround' && this.lastState !== 'anchored') {
      if (update.value > this.underWayThresholdSpeed) {
        // Going fast, so assuming under way
        debug(`Speed is ${update.value}m/s, over ${this.underWayThresholdSpeed}m/s, assuming under way`);
        return this.setState(this.currentPropulsion);
      }
    }
    if (update.path === 'navigation.position' && this.lastState !== 'anchored') {
      // inHarbour we have moved less than 100 meters in 10 minutes
      // check that 10 minutes has passed
      const positionUpdate = {
        time: update.time,
        path: update.path,
        value: new Point(update.value.latitude, update.value.longitude),
      };

      if (!this.stateChangeTime) {
        debug('First state change');
        return this.setState(moored, positionUpdate);
      }
      const secondsElapsed = (positionUpdate.time.getTime() - this.stateChangeTime.getTime())
        / 1000;
      if (secondsElapsed >= this.positionUpdateMinutes * 60) {
        // check that current position is less than 100 meters from the previous position
        debug(`After ${Math.round(secondsElapsed / 60)} minutes`);
        if (!this.stateChangePosition) {
          debug('Initial position update');
          return this.setState(moored, positionUpdate);
        }
        const distanceSinceLastUpdate = this.stateChangePosition.distanceTo(positionUpdate.value)
          * 1000;
        if (distanceSinceLastUpdate < this.underWayThresholdMeters) {
          debug(`Has only moved ${Math.round(distanceSinceLastUpdate)} meters`);
          return this.setState(moored, positionUpdate);
        }
        // we are not in harbour we are sailing
        debug(`Has moved > ${this.underWayThresholdMeters}m (${Math.round(distanceSinceLastUpdate)} meters)`);
        return this.setState(this.currentPropulsion, positionUpdate);
      }
      debugFallback(`Only ${Math.round(secondsElapsed / 60)} minutes elapsed, returning old state`);
    }
    return this.lastState;
  }
}

module.exports = StateMachine;
