const { readFile, writeFile } = require('fs/promises');
const { join } = require('path');
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
    const stateFile = join(app.getDataDirPath(), 'persisted-state.json');
    const posMinutes = options.position_minutes || 10;
    const subscription = {
      context: 'vessels.self',
      subscribe: [
        {
          path: 'navigation.position',
          period: (posMinutes * 60000) / 10,
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
          period: 6000,
        },
      ],
    };

    const currentStatus = {};
    let lastUpdate = 0;
    function setState(state, update) {
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
            timestamp: update.time || new Date().toISOString(),
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
      writeFile(stateFile, JSON.stringify({
        state,
        time: update.time,
      }), 'utf-8')
        .catch((e) => {
          app.error(e.message);
        });
    }

    stateMachine = new StateMachine(
      options.position_minutes,
      options.underway_threshold,
      options.default_propulsion,
      options.moored_threshold,
    );
    function handleValue(update) {
      setState(stateMachine.update(update), update);
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
    readFile(stateFile, 'utf-8')
      .then((content) => JSON.parse(content))
      .then((data) => {
        currentStatus.state = data.state;
        stateMachine.lastState = data.state;
        stateMachine.stateChangeTime = new Date(data.time);
        setStatus(`Persisted state: ${data.state}`);
      })
      .catch(() => {
        const initialState = app.getSelfPath('navigation.state');
        if (initialState) {
          currentStatus.state = initialState;
          setStatus(`Initial state: ${initialState}`);
        }
      });
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
        minimum: 2,
        title: 'How often to check whether vessel is under way (in minutes)',
      },
      underway_threshold: {
        type: 'integer',
        default: 100,
        title: 'Distance the vessel must move within the time to be considered under way (in meters)',
      },
      moored_threshold: {
        type: 'number',
        default: 0,
        minimum: 0,
        maximum: 1,
        title: 'Speed the vessel can have when stopping the engine to be considered moored immediately (in m/s)',
      },
    },
  };

  return plugin;
};
