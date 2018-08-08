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

'use strict';

import MarcRecord from 'marc-record-js';
import validateFactory from '@natlibfi/marc-record-validators-melinda';
import {TransformerUtils as utils} from '@natlibfi/melinda-record-import-commons';
import config from './config';

start();

async function start() {
	let validate;
	const logger = utils.createLogger();

	utils.registerSignalHandlers();
	utils.checkEnv();

	const stopHealthCheckService = utils.startHealthCheckService(process.env.HEALTH_CHECK_PORT);

	try {
		validate = validateFactory(config.validators);

		await utils.startTransformation(transform);
		stopHealthCheckService();
		process.exit();
	} catch (err) {
		stopHealthCheckService();
		logger.error(err);
		process.exit(-1);
	}

	async function transform(response) {
		const records = await response.json();
		const convertedRecords = await Promise.all(records.map(convertRecord));
		const validationResults = await Promise.all(convertedRecords.map(r => validate(r, {
			fix: true,
			validateFixes: true
		})));

		return convertedRecords.reduce((acc, record, index) => {
			return acc.concat({
				record,
				failed: validationResults[index].failed,
				messages: validationResults[index].validators
			});
		}, []);

		function convertRecord(record) {}
	}
}
