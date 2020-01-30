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

    it('should keep the boat not-under-way', () => {
      const values = logs.parse(dataFromFile);
      const positionUpdates = values.filter((val) => val.position);
      const initialPoint = positionUpdates[0];
      stateMachine.setState('not-under-way', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });
      values.forEach((data) => {
        stateUpdate.logUpdate(
          stateMachine,
          'not-under-way',
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

    it('should switch boat from not-under-way to sailing', () => {
      const values = logs.parse(dataFromFile);
      const initialPoint = values[0];
      stateMachine.setState('not-under-way', {
        path: 'navigation.position',
        value: new Point(initialPoint.position.lat, initialPoint.position.lon),
        time: new Date(initialPoint.timestamp),
      });

      values.forEach((data) => {
        let expectedState = 'not-under-way';
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

    it('should switch boat from sailing to not-under-way', () => {
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
          expectedState = 'not-under-way';
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
});
