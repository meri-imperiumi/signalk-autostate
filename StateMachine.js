const { Point } = require("where");

const notUnderWay = "not-under-way";
const anchored = "anchored";
const sailing = "sailing";
const underEngine = "under-engine"

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
    if (update.path === "navigation.anchor.position") {
      if(update.value){
       return this.setState(anchored, update);
      }else{
        return this.setState(sailing, update);
      } 
    }

    if (update.path === "propulsion.XXX.revolutions") {
      if(update.value){
        return this.setState(underEngine, update);
      }
    }

    if (update.path === "navigation.position") {
      //inHarbour we have moved less than 100 meters in 10 minutes
      // check that 10 minutes has passed
      const positionUpdate = {
        time: update.time,
        path: update.path,
        value: new Point(update.value.latitude, update.value.longitude),
      };

      if (!this.stateChangeTime ){
        return this.setState(notUnderWay, positionUpdate)
      }

      if (positionUpdate.time.getTime() - this.stateChangeTime.getTime() >= 60000 * 10) {
        //check that current position is less than 100 meters from the previous position
        if (!this.stateChangePosition || this.stateChangePosition.distanceTo(positionUpdate.value) <= 0.1) {
          return this.setState(notUnderWay, positionUpdate);
        } else {
          //we are not in harbour we are sailing
          return this.setState(sailing, positionUpdate);
        }
      }
      return this.lastState;
    }
  }
};

module.exports = StateMachine;
