#!/usr/bin/env node
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

/* eslint-disable new-cap */

import validateFactory from '@natlibfi/marc-record-validate';
import {
	IsbnIssn, ItemLanguage, EndingPunctuation, EmptyFields, Urn
} from '@natlibfi/marc-record-validators-melinda';

export default async (record, fix, validateFixes) => {
	const validate = validateFactory([
		await IsbnIssn({hyphenateISBN: true}),
		await EndingPunctuation(),
		await ItemLanguage(/^520$/),
		await Urn(),
		await EmptyFields()
	]);

	const opts = fix ? {fix, validateFixes} : {fix};
	const result = await validate(record, opts);
	return {
		record: result.record,
		failed: result.valid === false,
		messages: result.report
	};
};
