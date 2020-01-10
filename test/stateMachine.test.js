var assert = require('assert');
var stateMachine = require('../stateMachine');

describe('not-under-way', function() {
    it('should return that we are not under way', function(){
          const update = {
              path: "navigation.position",
              value: {
                  latitude: 60.254558,
                  longitude: 25.042828
              },
              time: new Date()
          };
          update.time.setMinutes(update.time.getMinutes() - 11);
          assert.equal('not-under-way', stateMachine(update))
        });
    });
