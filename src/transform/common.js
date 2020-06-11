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

import {EventEmitter} from 'events';
import createStreamParser, {toXml, ALWAYS as streamParserAlways} from 'xml-flow';
import {Parser} from 'xml2js';

export function createParser(stream) {
	const promises = [];
	class Emitter extends EventEmitter {}
	const emitter = new Emitter();

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
				emitter.emit('error', err);
			}
		})
		.on('tag:Product', node => {
			try {
				promises.push(convert());
			} catch (err) {
				emitter.emit('error', err);
			}

			async function convert() {
				const obj = await convertToObject();
				emitter.emit('record', obj);

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
			}
		});

	return emitter;
}

