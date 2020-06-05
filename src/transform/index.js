/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* ONIX record transformer for the Melinda record batch import system
*
* Copyright (C) 2019 University Of Helsinki (The National Library Of Finland)
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
import {Utils} from '@natlibfi/melinda-commons';
import {createParse} from './common';
import {EventEmitter} from 'events';
import convertRecord from './convert';
import createValidator from './validate';

class TransformEmitter extends EventEmitter {}
const {createLogger} = Utils;

export default async function (stream, {validate = true, fix = true}) {
	MarcRecord.setValidationOptions({subfieldValues: false});
	const validateRecord = await createValidator();
	const emitter = new TransformEmitter();
	const logger = createLogger();
	const promises = [];

	logger.log('debug', 'Starting to send recordEvents');

	createParse(stream)
		.on('error', err => emitter.emit('error', err))
		.on('end', async () => {
			logger.log('debug', `Handled ${promises.length} recordEvents`);
			await Promise.all(promises);
			emitter.emit('end', promises.length);
		})
		.on('Product', async obj => {
			promises.push(async () => {
				const record = await convertRecord(obj);

				if (validate === true || fix === true) {
					const result = await validateRecord(record, fix);

					emitter.emit('record', result);

					return;
				}

				emitter.emit('record', record);
			});
		});

	return emitter;
}

