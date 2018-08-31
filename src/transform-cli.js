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
import transform from './transform';
import createValidateFunction from './validate';

run();

async function run() {
	try {
		if (process.argv.length < 3) {
			console.error(`USAGE: transform.js <INPUT FILE> [-v|-f]
        Options:
        -v  Do validation
        -f  Do validation & fixing
        `);
			process.exit(-1);
		}

		if (process.argv.length === 4 && ['-v', '-f'].includes(process.argv[2])) {
			const validate = await createValidateFunction();
			const records = await processFile(process.argv[3]);
			const results = await validate(records, process.argv[2] === '-f');

			console.log(JSON.stringify(results, undefined, 2));
		} else {
			const records = await processFile(process.argv[2]);			
			console.log(JSON.stringify(records, undefined, 2));
		}

		process.exit();
	} catch (err) {
		console.error(err);
		process.exit(-1);
	}

	async function processFile(file) {
		return transform(fs.createReadStream(file));
	}
}
