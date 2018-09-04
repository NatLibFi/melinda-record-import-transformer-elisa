/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Elisa record transformer for the Melinda record batch import system
*
* Copyright (C) 2018 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-import-transformer-elisa
*
* melinda-record-import-transformer-elisa program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-import-transformer-elisa is distributed in the hope that it will be useful,
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

import fs from 'fs';
import path from 'path';
import formatXML from 'xmlfmt';
import {MARCXML} from '@natlibfi/marc-record-serializers'
import transform from './transform';
import createValidateFunction from './validate';

run();

async function run() {
	try {
		if (process.argv.length < 3) {
			console.error(`USAGE: transform.js [-v|-f] <INPUT FILE>
				Options:
				-v  Do validation
				-f  Do validation & fixing
				-x  Output records as MARCXML to individual files
				`);
				process.exit(-1);
			}

			const {mode, asXML, file} = parseArgs(process.argv.slice(1));

			if (['validate', 'fix'].includes(mode)) {
				const validate = await createValidateFunction();
				const records = await processFile(file);
				const results = await validate(records, mode === 'fix');

				console.log(JSON.stringify(results, undefined, 2));

				if (asXML) {
					outputXML(results.filter(r => r.record).map(r => r.record));
				}
			} else {
				const records = await processFile(file);
				if (asXML) {
					outputXML(records);
				} else {
					console.log(JSON.stringify(records, undefined, 2));
				}

			}

			process.exit();
		} catch (err) {
			console.error(err);
			process.exit(-1);
		}

		async function processFile(file) {
			return transform(fs.createReadStream(file));
		}

		function parseArgs(args) {
			return args.reduce((acc, param) => {
				switch (param) {
					case '-x':
					return Object.assign(acc, {asXML: true});
					case '-v':
					return Object.assign(acc, {mode: 'validate'});
					case '-f':
					return Object.assign(acc, {mode: 'fix'});
					default:
					return Object.assign(acc, {file: param});
				}
			}, {});
		}

		function outputXML(records) {
			if (!fs.existsSync('xml')) {
				fs.mkdir('xml');
			}

			records.forEach((record, index) => {
				const padLength = String(records.length).length;
				const fileName = `${String(index).padStart(padLength, '0')}.xml`;
				const file = path.resolve('xml', fileName);
				const xml = formatXML(MARCXML.to(record));

				fs.writeFileSync(file, xml);
			});
		}
	}
