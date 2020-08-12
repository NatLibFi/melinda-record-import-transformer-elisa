#!/usr/bin/env node
/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* ONIX record transformer for the Melinda record batch import system
*
* Copyright (C) 2019-2020 University Of Helsinki (The National Library Of Finland)
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

import validateFactory from '@natlibfi/marc-record-validate';
import {
  IsbnIssn as isbnIssn,
  FieldExclusion as fieldExclusion,
  Urn as urn,
  EndingPunctuation as endingPunctuation,
  AccessRights as accessRights,
  ItemLanguage as itemLanguage,
  Punctuation as punctuation
} from '@natlibfi/marc-record-validators-melinda';

export default async () => {
  const validate = validateFactory([
    await isbnIssn({hyphenateISBN: true}),
    await urn(),
    await itemLanguage(/^520$/u),
    await fieldExclusion([
      {
        tag: /^520$/u
      }
    ]),
    await accessRights(),
    await endingPunctuation(),
    await punctuation()
  ]);

  return async (record, fix, validateFixes) => {
    const opts = fix ? {fix, validateFixes} : /* istanbul ignore next: The actual functionality is tested with the first condition */ {fix};
    const result = await validate(record, opts);
    // Console.log('   QQQ   record:\n ', record); // ***
    return {
      record: result.record,
      failed: result.valid === false,
      messages: result.report
    };
  };
};
