const where = require("where");

const notUnderWay = "not-under-way";

class StateMachine {
  constructor() {
    this.stateChangeTime = null;
    this.stateChangePosition = null;
    this.lastState = null;
  }
  setState(state, update) {
    if (state !== this.lastState){
      this.stateChangeTime = update.time;
      if (update.path === 'navigation.position'){
        this.stateChangePosition = update.value;
      }
      this.lastState = state;
    }
    return state;
  } 

  update(update) {
    //gets input update object {
    //path: navigation.position, navigation.speedOverGround, navigation.anchor.position
    //value: {lat long}, decimal, {lat, long},
    //time: date`
    //}

    //anchor postion has a value, we have dropped the anchor
    if (update.path === "navigation.anchor.position" && update.value) {
      return "anchoring";
    }

    if (update.path === "navigation.position") {
      //inHarbour we have moved less than 100 meters in 10 minutes
      // check that 10 minutes has passed
      if (!this.stateChangeTime ){
        return this.setState(notUnderWay, update)
      }

      if (this.stateChangeTime.getTime() - update.time.getTime() >= 60000 * 10) {
        //check that current position is less than 100 meters from the previous position
        if (!this.stateChangePosition || this.stateChangePosition.distanceTo(update.value) <= 100) {
          return this.setState(notUnderWay, update);
        } else {
          //if we are not in harbour and engine is on, we are running with engine
          if (update.path === "navigation.engine" && update.value) {
            return "underEngine";
          }
          //we are not in harbour and engine is off, we are sailing
          return "underSail";
        }
      }
    }
  }
};

module.exports = StateMachine;
