/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Publication archives record transformer for the Melinda record batch import system
*
* Copyright (C) 2019-2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-import-transformer-publication-archives
*
* melinda-record-import-transformer-publication-archives program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-import-transformer-publication-archives is distributed in the hope that it will be useful,
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

import {createParse} from './common';

// ->  added 3.6
import convertRecord from './convert';
import {MarcRecord} from '@natlibfi/marc-record';
import Utils from '@natlibfi/melinda-commons';
import EventEmitter from 'events';
import createValidator from './validate';

class TransformEmitter extends EventEmitter {}
const createLogger = Utils;
// <- 3.6

console.log('\n *** Start -  in makefixture.js  ******** \n ');

 // run();
 // async function run() {

export default async function (stream) { // ORIG:  (stream, {validate = true, fix = true})

		
	MarcRecord.setValidationOptions({subfieldValues: false});
	const validateRecord = await createValidator();
	const emitter = new TransformEmitter();
	const logger = createLogger();
	const promises = [];

	console.log('\n *** now in makefixture.js/default async  ******** \n ');

	// ----> added 3.6.2020

	createParse(stream)
		.on('error', err => emitter.emit('error', err))
		.on('Product', async obj => {  // record vai Product?
			promises.push(async () => {
				const record = await convertRecord(obj);

				if (validate === true || fix === true) {
					const result = await validateRecord(record, fix);

					emitter.emit('record', result);
						console.log('   ***   ');
						
					return;
				}

				emitter.emit('record', record);

				console.log(JSON.stringify(record, undefined, 2)); // record
			});
		});
	// <---- 3.6.2020

	// POIS -> // const GetRecord = await createParse(process.stdin); //   // was: await xmlToObject

	console.log('*** makefixture/ending \n');

//	Console.log(JSON.stringify(GetRecord[0].record, undefined, 2)); // ***Was***eslint-disable-line no-console
	// ALKUP:  (GetRecord[0].record, undefined, 2)
}    


