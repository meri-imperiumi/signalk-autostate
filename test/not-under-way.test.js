var assert = require('assert');
var StateMachine = require('../StateMachine');

describe('not-under-way', function() {
    const stateMachine = new StateMachine();
    it('should return that we are not under way, when the system boots', function(){
          const update = {
              path: "navigation.position",
              value: {
                  latitude: 60.254558,
                  longitude: 25.042828
              },
              time: new Date()
          };
          assert.equal('not-under-way', stateMachine.update(update))
        });
    it('should return that we are not under way, when system is no and position is not changing', function(){
          const update = {
              path: "navigation.position",
              value: {
                  latitude: 60.254558,
                  longitude: 25.042828
              },
              time: new Date()
          };
          update.time.setMinutes(update.time.getMinutes() + 11);
          assert.equal('not-under-way', stateMachine.update(update))
    });
});
