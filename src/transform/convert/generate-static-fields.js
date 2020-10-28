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

export default () => [

  /*  Blocked, see email by SN 21.8.2020
  {
    tag: '300',
    subfields: [{code: 'a', value: '1 verkkoaineisto'}]
  },
  */
  {
    tag: '337',
    subfields: [
      {code: 'a', value: 'tietokonekäyttöinen'},
      {code: 'b', value: 'c'},
      {code: '2', value: 'rdamedia'}
    ]
  },
  {
    tag: '338',
    subfields: [
      {code: 'a', value: 'verkkoaineisto'},
      {code: 'b', value: 'cr'},
      {code: '2', value: 'rdacarrier'}
    ]
  },

  /*  Moved to transform/convert/index.js
  {
    tag: '344',
    subfields: [
      {code: 'a', value: 'digitaalinen'},
      {code: '2', value: 'rda'}
    ]
  },
  */
  {
    tag: '042',
    subfields: [{code: 'a', value: 'finb'}]
  },
  {
    tag: 'LOW',
    subfields: [{code: 'a', value: 'FIKKA'}]
  }

  /*
  ,

  {
    tag: '500',
    ind1: ' ',
    ind2: ' ',
    subfields: [
      {code: 'a', value: 'Koneellisesti tuotettu tietue.'},
      {code: '9', value: 'FENNI<KEEP>'}
    ]
  }
*/

];
