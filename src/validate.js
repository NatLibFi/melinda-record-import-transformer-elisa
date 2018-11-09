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

/* eslint-disable new-cap */
import validateFactory from '@natlibfi/marc-record-validate';
import {IsbnIssn, ItemLanguage} from '@natlibfi/marc-record-validators-melinda';

export default async () => {
	const validate = await validateFactory([
		await IsbnIssn(),
		await ItemLanguage(/^520$/)
	]);

	return async (records, fix = false) => {
		const opts = fix ? {fix: true, validateFixes: true} : {fix: false};
		const results = await Promise.all(
			records.map(r => validate(r, opts))
		);

		return results.map(result => ({
			record: result.record,
			failed: !result.valid,
			messages: result.report
		}));
	};
};
