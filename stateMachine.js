const where = require("where");

let harbourTime = null;
let harbourPosition = null;

module.exports = update => {
  //gets input update object {
  //path: navigation.position, navigation.speedOverGround, navigation.anchor.position
  //value: {lat long}, decimal, {lat, long},
  //time: date`
  //}

  const currentTime = new Date();
  //anchor postion has a value, we have dropped the anchor
  if (update.path === "navigation.anchor.position" && update.value) {
    return "anchoring";
  }

  if (update.path === "navigation.position") {
    //inHarbour we have moved less than 100 meters in 10 minutes
    // check that 10 minutes has passed
    if (harbourTime.getTime() - currentTime.getTime() > 60000 * 10) {
      //check that current position is less than 100 meters from the previous position
      if (harbourPosition.distanceTo(update.value) <= 100) {
        return "inHarbour";
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
