/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* ONIX record transformer for the Melinda record batch import system
*
* Copyright (C) 2019-2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-import-transformer-onix
*
* melinda-record-import-transformer-onix program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-import-transformer-onix is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import {MarcRecord} from '@natlibfi/marc-record';
import {EventEmitter} from 'events';
import createStreamParser, {toXml, ALWAYS as streamParserAlways} from 'xml-flow';
import {Parser} from 'xml2js';
import createConverter from './convert';
import createValidator from './validate';
import NotSupportedError from './../error';
export default options => (stream, {validate = true, fix = true} = {}) => {
  MarcRecord.setValidationOptions({subfieldValues: false});

  const emitter = new class extends EventEmitter {}();

  start();

  return emitter;

  async function start() {
    let converterPromise; // eslint-disable-line functional/no-let
    const promises = [];

    const validateRecord = await createValidator();

    createStreamParser(stream, {
      strict: true,
      trim: false,
      normalize: false,
      preserveMarkup: streamParserAlways,
      simplifyNodes: false,
      useArrays: streamParserAlways
    })
      .on('error', err => emitter.emit('error', err))
      .on('end', async () => {
        try {
          await Promise.all(promises);
          emitter.emit('end', promises.length);
        } catch (err) {
          /* istanbul ignore next: Generic error */ emitter.emit('error', err);
        }
      })
      .on('tag:Header', node => {
        converterPromise = initializeConverter();

        async function initializeConverter() {
          try {
            const obj = await convertToObject(node);
            const sender = parseSender(obj);
            converterPromise = createConverter({...options, sender});
          } catch (err) {
            /* istanbul ignore next: Generic error */ emitter.emit('error', err);
          }

          function parseSender(obj) {
            return {
              name: obj?.Header?.Sender?.[0]?.SenderName?.[0],
              addressee: obj?.Header?.Addressee?.[0]?.AddresseeName?.[0],
              messageNumber: obj?.Header?.MessageNumber?.[0],
              sentTime: obj?.Header?.SentDateTime?.[0]
            };
          }
        }
      })
      .on('tag:Product', node => {
        try {
          promises.push(convert()); // eslint-disable-line functional/immutable-data
        } catch (err) {
          /* istanbul ignore next: Generic error */ emitter.emit('error', err);
        }

        async function convert() {
          try {
            const obj = await convertToObject(node);
            const convertRecord = await converterPromise;
            const record = await convertRecord(obj);

            // Console.log('   record:\n ', JSON.stringify(record,null,1) );
            // Console.log('   record:\n ', record);

            if (validate === true || fix === true) {
              const result = await validateRecord(record, fix);

              emitter.emit('record', result);
              return;
            }

            /* istanbul ignore next: No tests without validators */ emitter.emit('record', {record});
          } catch (err) {

            if (err instanceof NotSupportedError) {

              return emitter.emit('record', {
                failed: true,
                messages: [err.message]
              });
            }

            throw err;

          }
        }
      });

    function convertToObject(node) {
      const str = toXml(node);
      return toObject();

      function toObject() {
        return new Promise((resolve, reject) => {
          new Parser().parseString(str, (err, obj) => {
            if (err) {
              /* istanbul ignore next: Generic error */ return reject(err);
            }

            resolve(obj);
          });
        });
      }
    }
  }
};
