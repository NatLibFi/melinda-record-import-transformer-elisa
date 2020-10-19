/* eslint-disable no-unused-vars, */
import {createLogger} from '@natlibfi/melinda-backend-commons';
import createSruClient from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';

const logger = createLogger();
const recordId = '100';

const sruClient = createSruClient({url: 'https://sru.api.melinda-test.kansalliskirjasto.fi/bib',
  recordSchema: 'marcxml',
  maxRecordsPerRequest: 500,
  retrieveAll: false}); // Max records per request seems to be 50

readSomeSubrecords();

function readSomeSubrecords(recordId, offset = 1) { // RecordId
  console.log('   Now in function readSomeSubrecords.');

  return new Promise((resolve, reject) => {
    const promises = [];


    sruClient.searchRetrieve(`melinda.partsofhost=${recordId}`, {startRecord: offset}) // Query
      .on('record', xmlString => {
        logger.log('silly', 'Got Record');
        console.log('   ...record.');
        promises.push(MARCXML.from(xmlString, {subfieldValues: false})); // eslint-disable-line functional/immutable-data
      })
      .on('end', async offset => {
        logger.log('info', 'Ending queries');
        console.log('   ...end.');
        const records = await Promise.all(promises);
        resolve({offset, records});
      })
      .on('error', err => reject(err));

  });

}
