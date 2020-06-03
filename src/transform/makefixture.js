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

run();

async function run(stream) {        // async function run() {

	console.log('\n *** now in makefixture.js  ******** \n ');

			// ----> 3.6.2020
			createParse(stream)
			.on('error', err => emitter.emit('error', err))
			.on('end', async () => {
				logger.log('debug', `Handled ${promises.length} recordEvents`);
				await Promise.all(promises);
				emitter.emit('end', promises.length);
			})
			.on('record', async obj => {
				promises.push(async () => {
					const record = await convertRecord(obj);

					if (validate === true || fix === true) {
						const result = await validateRecord(record, fix);

						emitter.emit('record', result);

						return;
					}

					emitter.emit('record', record);
					console.log(JSON.stringify(GetRecord[0].record, undefined, 2));
				});
			});
			// <---- 3.6.2020


	const GetRecord = await createParse(process.stdin); //   // was: await xmlToObject

//	console.log('*** makefixture/GetRecord: \n', GetRecord);
//	console.log('*** makefixture/GET READY for output: \n ');
//	console.log(JSON.stringify(GetRecord[0].record, undefined, 2)); // ***Was***eslint-disable-line no-console
	// ALKUP:  (GetRecord[0].record, undefined, 2)
}
