const where = require("where");

// We assume that the vessel is in harbour when system boots up
let stateChangeTime = null;
let stateChangePosition = null;
let lastState = null;

const notUnderWay = "not-under-way";

const setState = (state, update) => {
  if (state !== lastState){
      stateChangeTime = update.time;
      if (update.path === 'navigation.position'){
        stateChangePosition = update.value;
      }
      lastState = state;
  }
  return state;
} 

module.exports = update => {
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
    if (! stateChangeTime ){
      return setState(notUnderWay, update)
    }

    console.log(stateChangeTime, update.time, (stateChangeTime.getTime() - update.time.getTime()) / 1000);
    if (stateChangeTime.getTime() - update.time.getTime() >= 60000 * 10) {
      //check that current position is less than 100 meters from the previous position
      if (!stateChangePosition || stateChangePosition.distanceTo(update.value) <= 100) {
        return setState(notUnderWay, update);
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
};
