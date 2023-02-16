const { Point } = require('where');
const StateMachine = require('../StateMachine');
const stateUpdate = require('./utils/stateUpdate');
const logs = require('./utils/logs');

describe('With actual GPS data', () => {
  describe('using an hour of sailing', () => {
    let dataFromFile;
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-15T12.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should keep the boat under way', () => {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState('sailing', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach((data) => {
        stateUpdate.logUpdate(stateMachine, 'sailing', data, data.timestamp);
      });
    });
  });
  describe('using an hour of being docked', () => {
    let dataFromFile;
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-23T04.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should keep the boat moored', () => {
      const values = logs.parse(dataFromFile);
      const positionUpdates = values.filter((val) => val.position);
      const initialPoint = positionUpdates[0];
      stateMachine.setState('moored', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach((data) => {
        stateUpdate.logUpdate(
          stateMachine,
          'moored',
          data,
          data.timestamp,
        );
      });
    });
  });
  describe('one hour of anchoring', () => {
    let dataFromFile;
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-20T01.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should keep the boat anchoring', () => {
      const values = logs.parse(dataFromFile);
      const positionUpdates = values.filter((val) => val.position);
      const initialPoint = positionUpdates[0];
      stateMachine.setState('anchored', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach((data) => {
        stateUpdate.logUpdate(stateMachine, 'anchored', data, data.timestamp);
      });
    });
  });
  describe('departure from harbour', () => {
    let dataFromFile;
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-15T10.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should switch boat from moored to sailing', () => {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState('moored', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });

      values.forEach((data) => {
        let expectedState = 'moored';
        if (data.timestamp >= 1568544488089) {
          expectedState = 'sailing';
        }
        stateUpdate.logUpdate(
          stateMachine,
          expectedState,
          data,
          data.timestamp,
        );
      });
    });
  });
  describe('arrival to harbour', () => {
    let dataFromFile;
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-21T12.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should switch boat from sailing to moored', () => {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState('sailing', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach((data) => {
        let expectedState = 'sailing';
        if (data.timestamp >= 1569068464063) {
          expectedState = 'moored';
        }
        stateUpdate.logUpdate(
          stateMachine,
          expectedState,
          data,
          data.timestamp,
        );
      });
    });
  });
  describe('arrival to anchorage', () => {
    let dataFromFile;
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-19T17.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should switch boat from sailing to anchoring', () => {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState('sailing', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });

      values.forEach((data) => {
        let expectedState = 'sailing';
        if (data.timestamp >= new Date(1568912623809)) {
          expectedState = 'anchored';
        }
        stateUpdate.logUpdate(
          stateMachine,
          expectedState,
          data,
          data.timestamp,
        );
      });
    });
  });
  describe('departure from anchorage', () => {
    let dataFromFile;
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile('skserver-raw_2019-09-14T08.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should switch boat from anchored to sailing', () => {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState('sailing', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach((data) => {
        let expectedState = 'anchored';
        if (data.timestamp >= new Date('2019-09-14T08:00:00.055Z')) {
          expectedState = 'sailing';
        }
        if (data.timestamp >= new Date('2019-09-14T08:52:08.053Z')) {
          expectedState = 'moored';
        }
        stateUpdate.logUpdate(
          stateMachine,
          expectedState,
          data,
          data.timestamp,
        );
      });
    });
  });

  describe.skip('with N2K propulsion data', () => {
    let dataFromFile;
    const stateMachine = new StateMachine(10, 100, 'motoring');
    before(async () => {
      dataFromFile = await logs.readFile('private-n2k-2017-10-06.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should switch boat from motoring to moored', () => {
      const values = logs.parseN2K(dataFromFile);
      const initialPoint = values[0].updates[0];
      stateMachine.setState('motoring', {
        path: 'navigation.position',
        value: new Point(
          initialPoint.values[0].value.latitude,
          initialPoint.values[0].value.longitude,
        ),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach((data) => {
        let expectedState = 'motoring';
        if (!data) {
          return;
        }
        if (data.timestamp >= new Date('2017-10-06T08:06:09.864Z')) {
          expectedState = 'moored';
        }
        stateUpdate.signalkDelta(
          stateMachine,
          expectedState,
          data,
        );
      });
    }).timeout(10000);
  });

  describe('anchor to mooring from History API', () => {
    let dataFromFile;
    const stateMachine = new StateMachine(10, 100, 'motoring');
    before(async () => {
      dataFromFile = await logs.readFile('sk-history-2023-03-16.json');
    });
    after(() => {
      stateUpdate.reset();
    });
    it('should switch boat from anchored to motoring and later moored', () => {
      const values = JSON.parse(dataFromFile).data;
      const initialPoint = values[0];

      // Start anchored
      stateMachine.setState('anchored', {
        path: 'navigation.position',
        value: new Point(initialPoint[1][1], initialPoint[1][0]),
        time: new Date(initialPoint[0]),
      });

      // Hoist the anchor
      stateUpdate.logUpdate(stateMachine, 'motoring', {
        updates: [
          {
            values: [
              {
                path: 'navigation.anchor.position',
                value: null,
              },
            ],
          },
        ],
      }, new Date('2023-02-16T11:26:07.500Z'));

      // Then run the log
      values.forEach((data) => {
        if (data[0] < '2023-02-16T11:26:07.500Z') {
          // No need to run the locations before hoisting anchor
          return;
        }
        let expectedState = 'motoring';
        if (data[0] >= '2023-02-16T12:18:10.000000000Z') {
          expectedState = 'moored';
        }
        stateUpdate.logUpdate(stateMachine, expectedState, {
          position: {
            lat: data[1][1],
            lon: data[1][0],
          },
        }, new Date(data[0]));
      });
    });
  });
});
