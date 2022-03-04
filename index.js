const StateMachine = require('./StateMachine');

module.exports = function createPlugin(app) {
  const plugin = {};
  plugin.id = 'signalk-autostate';
  plugin.name = 'Auto-state';
  plugin.description = 'Automatically change navigation state based on vessel movement';

  let unsubscribes = [];
  let stateMachine = null;
  const setStatus = app.setPluginStatus || app.setProviderStatus;
  plugin.start = function start(options) {
    const subscription = {
      context: 'vessels.self',
      subscribe: [
        {
          path: 'navigation.position',
          period: 60000,
        },
        {
          path: 'navigation.anchor.position',
          period: 6000,
        },
        {
          path: 'propulsion.*.revolutions',
          period: 6000,
        },
        {
          path: 'propulsion.*.state',
          period: 6000,
        },
        {
          path: 'navigation.speedOverGround',
          period: 60000,
        },
      ],
    };

    const currentStatus = {};
    let lastUpdate = 0;
    function setState(state) {
      const currentUpdate = new Date().getTime();
      if (currentStatus.state === state && (lastUpdate + 600000) > currentUpdate) {
        return;
      }
      currentStatus.state = state;
      app.handleMessage(plugin.id, {
        context: `vessels.${app.selfId}`,
        updates: [
          {
            source: {
              label: plugin.id,
            },
            timestamp: (new Date().toISOString()),
            values: [
              {
                path: 'navigation.state',
                value: state,
              },
            ],
          },
        ],
      });
      setStatus(`Detected state: ${state}`);
      lastUpdate = currentUpdate;
    }

    stateMachine = new StateMachine(
      options.position_minutes,
      options.underway_threshold,
      options.default_propulsion,
      options.underway_threshold_speed,
    );
    function handleValue(update) {
      setState(stateMachine.update(update));
    }

    app.subscriptionmanager.subscribe(
      subscription,
      unsubscribes,
      (subscriptionError) => {
        app.error(`Error:${subscriptionError}`);
      },
      (delta) => {
        if (!delta.updates) {
          return;
        }
        delta.updates.forEach((u) => {
          if (!u.values) {
            return;
          }
          u.values.forEach((v) => {
            handleValue({
              path: v.path,
              value: v.value,
              time: new Date(u.timestamp),
            });
          });
        });
      },
    );
    setStatus('Waiting for updates');
    const initialState = app.getSelfPath('navigation.state');
    if (initialState) {
      currentStatus.state = initialState;
      setStatus(`Initial state: ${initialState}`);
    }
  };

  plugin.stop = function stop() {
    unsubscribes.forEach((f) => f());
    unsubscribes = [];
  };

  plugin.schema = {
    type: 'object',
    properties: {
      default_propulsion: {
        type: 'string',
        default: 'sailing',
        title: 'Default means of propulsion when the vessel is moving',
        enum: [
          'sailing',
          'motoring',
        ],
      },
      position_minutes: {
        type: 'integer',
        default: 10,
        title: 'How often to check whether vessel is under way (in minutes)',
      },
      underway_threshold: {
        type: 'integer',
        default: 100,
        title: 'Distance the vessel must move within the time to be considered under way (in meters)',
      },
      underway_threshold_speed: {
        type: 'integer',
        default: 2,
        title: 'Speed which the vessel must move at to be also considered under way (in m/s)',
      },
    },
  };

  return plugin;
};
