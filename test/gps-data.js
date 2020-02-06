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
        if (data.timestamp >= 1568544452078) {
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
        if (data.timestamp >= 1569068400067) {
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

    it('should switch boat from anchrored to sailing', () => {
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
    const stateMachine = new StateMachine();
    before(async () => {
      dataFromFile = await logs.readFile('private-n2k-2017-10-06.log');
    });
    after(() => {
      stateUpdate.reset();
    });

    it('should switch boat from under-engine to not-under-way', () => {
      const values = logs.parseN2K(dataFromFile);
      const initialPoint = values[0].updates[0];
      stateMachine.setState('under-engine', {
        path: 'navigation.position',
        value: new Point(
          initialPoint.values[0].value.latitude,
          initialPoint.values[0].value.longitude,
        ),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach((data) => {
        const expectedState = 'under-engine';
        stateUpdate.signalkDelta(
          stateMachine,
          expectedState,
          data,
        );
      });
    }).timeout(10000);
  });
});
