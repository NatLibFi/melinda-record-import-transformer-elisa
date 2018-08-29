#!/usr/bin/env node
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

import os from 'os';
import fs from 'fs';
import path from 'path';
import {spawn} from 'child_process';
import {MARCXML} from 'marc-record-serializers';
import createValidateFunction from './validate';
import {TransformerUtils} from '@natlibfi/melinda-record-import-commons'

const CONVERSION_SCRIPT_PATH = process.env.CONVERSION_SCRIPT_PATH || 'melinda-elisa-ellibs-eresource-scripts/elisa_metadata_konversio.pl';

export async function transform(data) {
	return new Promise((resolve, reject) => {
		const errBuffer = [];
		const records = [];
		const tempFile = path.resolve(os.tmpdir(), `elisa-transformation-${Date.now().toString()}`);

		fs.writeFileSync(tempFile, data);

		const proc = spawn(CONVERSION_SCRIPT_PATH, ['-M', '-f', tempFile], {
			encoding: 'utf8'
		});

		const recordStream = new MARCXML.Reader(proc.stdout);

		proc.stderr.on('data', data => errBuffer.push(data));

		proc.on('error', handleError);
		proc.on('exit', code => {
			if (code !== 0) {
				handleError(`Conversion command failed: ${errBuffer.join('')}`);
			}

			resolve(records);
		});

		recordStream.on('error', handleError);
		recordStream.on('data', r => records.push(r));
		recordStream.on('end', () => {
			if (fs.existsSync(tempFile)) {
				fs.unlinkSync(tempFile);
			}
		});

		function handleError(err) {
			if (fs.existsSync(tempFile)) {
				fs.unlinkSync(tempFile);
			}

			reject(err);
		}
	});
}

export async function validate(records, fix = false) {
	const validate = await createValidateFunction();
	const opts = fix ? {fix: true, validateFixes: true} : {fix: false};
	const results = await Promise.all(
		records.map(r => validate(r, opts))
	);

	return results.map(result => ({
		record: result.record,
		failed: !result.valid,
		messages: result.report
	}));
}

export async function transformCallback(response) {
	const data = await response.text();
	const records = await transform(data);
	const validate = await createValidateFunction();
  return TransformerUtils.runValidate(validate, records, true);

}
