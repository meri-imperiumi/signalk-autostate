const fs = require('fs');
const util = require('util');
const path = require('path');
const nmeaSimple = require('nmea-simple');
const { FromPgn } = require('@canboat/canboatjs');
const n2kMapper = require('@signalk/n2k-signalk');

const readFile = util.promisify(fs.readFile);

module.exports = {
  readFile: (fileName) => {
    const filePath = path.resolve(__dirname, `../logs/${fileName}`);
    return readFile(filePath, 'utf-8');
  },
  parse: (content) => {
    const allLines = content.split('\n');
    return allLines
      .map((row) => {
        const [timestamp, source, value] = row.split(';');
        if (source === 'anchoralarm') {
          const parsed = JSON.parse(value);
          parsed.timestamp = parseInt(timestamp, 10);
          return parsed;
        }
        try {
          const parsed = nmeaSimple.parseNmeaSentence(value);
          if (!parsed.latitude) {
            return null;
          }
          return {
            position: {
              lat: parsed.latitude,
              lon: parsed.longitude,
            },
            timestamp: parseInt(timestamp, 10),
          };
        } catch (error) {
          return null;
        }
      })
      .filter((row) => row !== null);
  },
  parseN2K: (content) => {
    const parser = new FromPgn();
    const allLines = content.split('\n');
    return allLines
      .map((row) => {
        if (!row) {
          return null;
        }
        const json = parser.parseString(row);
        if (!json) {
          return null;
        }
        const delta = n2kMapper.toDelta(json);
        if (!delta.updates || !delta.updates.length) {
          return null;
        }
        const filteredDelta = {
          ...delta,
          updates: delta.updates.map((u) => ({
            ...u,
            values: u.values.filter((v) => {
              if ([
                'navigation.position',
                'navigation.anchor.position',
              ].indexOf(v.path) !== -1) {
                return true;
              }
              if (v.path.indexOf('propulsion') !== -1 && v.path.indexOf('revolutions') !== -1) {
                return true;
              }
              return false;
            }),
          })).filter((u) => u.values.length),
        };
        if (!filteredDelta.updates.length) {
          return null;
        }
        return filteredDelta;
      })
      .filter((d) => d !== null);
  },
};
