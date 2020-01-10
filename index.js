const stateMachine = require('./stateMachine');

module.exports = function plugin(app) {
  const plugin = {};
  plugin.id = 'signalk-autostate';
  plugin.name = 'Auto-state';
  plugin.description = 'Automatically change navigation state based on vessel movement';

  let unsubscribes = [];
  plugin.start = function start(options) {
    const subscription = {
      context: 'vessel.self',
      subscribe: [
        {
          path: 'navigation.position',
          period: 60000,
        },
        {
          path: 'navigation.anchor.position',
          period: 60000,
        },
        {
          path: 'navigation.speedOverGround',
          period: 60000,
        },
      ],
    };

    const currentStatus = {};
    function setState(state) {
      if (currentStatus.state === state) {
        return;
      }
      currentStatus.state = state;
      currentStatus.statePosition = currentStatus.position;
      app.setProvideStatus(`Detected state: ${initialState}`);
    }

    function handleValue(update) {
      setState(stateMachine(update));
    }

    app.subscriptionmanager.subscribe(
      subscription,
      unsubscribes,
      subscriptionError => {
        app.error('Error:' + subscriptionError);
      },
      delta => {
        delta.updates.forEach(u => {
          u.values.forEach(handleValue);
        });
      }
    );
    app.setProvideStatus('Waiting for updates');
    const initialState = app.getSelfPath('navigation.state');
    if (initialState) {
      currentStatus.state = initialState;
      app.setProvideStatus(`Initial state: ${initialState}`);
    }
  }

  plugin.stop = function () {
    unsubscribes.forEach(f => f());
    unsubscribes = [];
  }
}
