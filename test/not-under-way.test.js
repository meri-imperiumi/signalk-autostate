const StateMachine = require("../StateMachine");
const stateUpdate = require('./utils/stateUpdate');

describe("not-under-way", function() {
  const stateMachine = new StateMachine();
  after(() => {
    stateUpdate.reset();
  });
  it("should return that we are not under way, when the system boots", function() {
    stateUpdate.position(stateMachine, 'not-under-way', 60.254558, 25.042828, 0);
  });
  it("should return that we are not under way, when 10 minutes has not elapsed", function() {
    stateUpdate.position(stateMachine, 'not-under-way', 60.254558, 25.042828, 5);
  });
  it("should return that we are not under way, when system is on and position is not changing", function() {
    stateUpdate.position(stateMachine, 'not-under-way', 60.254558, 25.042828, 11);
  });
});
