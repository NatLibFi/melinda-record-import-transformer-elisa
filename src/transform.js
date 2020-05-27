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
// import {chain} from 'stream-chain';
// Import moment from 'moment';
// import saxStream from 'sax-stream';
import {MarcRecord} from '@natlibfi/marc-record';
// Import createValidator from './validate';
import {Utils} from '@natlibfi/melinda-commons';
import {EventEmitter} from 'events';

import convertRecord from './transform/convert';

// Import createValidator from './validate';

// uudet moduulit -->
import createStreamParser, {toXML, ALWAYS as streamParserAlways} from 'xml-flow';
import {Parser} from 'xml2js';
// <---

class TransformEmitter extends EventEmitter {}
const {createLogger} = Utils;

export default function (stream, {validate = true, fix = true}) {
	MarcRecord.setValidationOptions({subfieldValues: false});
	const Emitter = new TransformEmitter();
	const logger = createLogger();
	// Let validator;
	logger.log('debug', 'Starting to send recordEvents');
	readStream(stream);
	return Emitter;

	async function readStream(stream) {
		const promises = [];

		createParser(stream, {
			strict: true,
			trim: false,
			normalize: false,
			preserveMarkup: streamParserAlways,
			simplifyNodes: false,
			useArrays: streamParserAlways
		})
			.on('error', err => Emitter.emit('error', err))
			.on('end', async () => {
				logger.log('debug', `Handled ${promises.length} recordEvents`);
				await Promise.all(promises);
				Emitter.emit('end', promises.length);
			})
			.on('tag:record', async node => {
				promises.push(async () => {
					const obj = convertToObject();
					const result = await convertRecord(obj);
					Emitter.emit('record', result);
				});

				async function convertToObject() {
					const str = toXml(node);
					return toObject();

					async function toObject() {
						return new Promise((resolve, reject) => {
							new Parser().parseString(str, (err, obj) => {
								if (err) {
									return reject(err);
								}

								resolve(obj);
							});
						});
					}
				}
			});
	}
	// HERE WAS   async function convertRecord
}

