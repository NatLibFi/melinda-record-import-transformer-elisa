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

import {READERS} from '@natlibfi/fixura';
import moment from 'moment';
import {expect} from 'chai';
import generateTests from '@natlibfi/fixugen';
import createConverter, {__RewireAPI__ as RewireAPI} from './convert'; // eslint-disable-line import/named

generateTests({callback,
	path: [__dirname, '..', '..', 'test-fixtures', 'transform', 'convert'],
	recurse: false,
	fixura: {
		reader: READERS.JSON,
		failWhenNotFound: false
	},
	mocha: {
		beforeEach: () => {
			RewireAPI.__Rewire__('moment', () => moment('2000-01-01T00:00:00'));
		},
		afterEach: () => {
			RewireAPI.__ResetDependency__('moment');
		}
	}
});

function callback({getFixture}) {
	const convert = createConverter({sources: {foobar: 'foobar'}});
	const inputData = getFixture('input.json');
	const expectedRecord = getFixture('output.json');
	const expectedError = getFixture({components: ['error.txt'], reader: READERS.TEXT});

	if (expectedError) {
		return expect(() => convert(inputData)).to.throw(Error, new RegExp(expectedError));
	}

	const record = convert(inputData);
	expect(record.toObject()).to.eql(expectedRecord);
}
