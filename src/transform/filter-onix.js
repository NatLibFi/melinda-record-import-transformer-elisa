
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

import {EventEmitter} from 'events';
import createStreamParser, {toXml, ALWAYS as streamParserAlways} from 'xml-flow';
import {Parser} from 'xml2js';

/*

Import {createLogger} from '@natlibfi/melinda-backend-commons';
const logger = createLogger();
logger.log('info', 'Start! ');

*/

import {createValueInterface} from './convert/common';

const emitter = new class extends EventEmitter {}();

start();

async function start() {

  const promises = [];

  createStreamParser(process.stdin, { // Stream !
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
        console.log('</ONIXMessage>'); // eslint-disable-line no-console

      } catch (err) {
        /* istanbul ignore next: Generic error */ emitter.emit('error', err);
      }
    })
    .on('tag:Header', node => {
      initializeConverter();

      async function initializeConverter() {
        try {
          const obj = await convertToObject(node);

          console.log(`<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference">`); // eslint-disable-line no-console
          console.log(toXml(obj)); // eslint-disable-line no-console
        } catch (err) {
          /* istanbul ignore next: Generic error */ emitter.emit('error', err);
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

        const obj = await convertToObject(node);
        const printRow = toXml(obj);
        const {getValue, getValues} = createValueInterface(obj.Product);
        const values = getValues('DescriptiveDetail', 'ProductForm');
        const prodForm = getValue('DescriptiveDetail', 'ProductForm');

        if (values && prodForm && ['AJ', 'AN', 'EB', 'EC', 'ED'].includes(prodForm)) { // eslint-disable-line functional/no-conditional-statement
          console.log(printRow); // eslint-disable-line no-console
        }


        /*
            // ALTERNATE RegExp-way:
            //const regExp = /ProductForm.AJ|ProductForm.AN|ProductForm.EB|ProductForm.EC|ProductForm.ED/gu; // Only wanted cases
            // Const regExp = /ProductForm.EC/gu; // Only wanted cases

            If (printRow.search(regExp) > 0) { // eslint-disable-line functional/no-conditional-statement
              console.log(printRow); // eslint-disable-line no-console
              return;
            }
        */

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


