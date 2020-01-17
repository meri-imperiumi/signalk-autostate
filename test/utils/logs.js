const fs = require('fs');
const util = require('util');
const path = require('path');
const nmeaSimple = require('nmea-simple');

const readFile = util.promisify(fs.readFile);

module.exports = {
  readFile: (fileName) => {
    const filePath = path.resolve(__dirname, `../logs/${fileName}`);
    return readFile(filePath, 'utf-8');
  },
  parse: (content) => {
    const allLines = content.split("\n");
    return allLines
      .map(row => {
        const [timestamp, n, value] = row.split(";");
        try {
          const parsed = nmeaSimple.parseNmeaSentence(value);
          if (!parsed.latitude) {
            return null;
          }
          return {
            position: {
              lat: parsed.latitude,
              lon: parsed.longitude
            },
            timestamp: parseInt(timestamp),
          };
        } catch (error) {
          return null;
        }
      })
      .filter(row => row !== null);
  },
};
