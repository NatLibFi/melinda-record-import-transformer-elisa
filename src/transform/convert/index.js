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

import {MarcRecord} from '@natlibfi/marc-record';
import momentOrig from 'moment';
import {createValueInterface} from './common';
import generateTitles from './generate-titles';
import generateStaticFields from './generate-static-fields';
import NotSupportedError from './../../error';
import {createLogger} from '@natlibfi/melinda-backend-commons';
import {generate006, generate007, generate008} from './generateControlFields';
import {generate040, generate041, generate084a, generate084b} from './generate0XXFields.js';
import {generate240, generate250, generate263, generate264} from './generate2XXFields.js';
import {generate300, generate336, generate344, generate347} from './generate3XXFields.js';
import {generate490} from './generate4XXFields';
import {generate500, generate506, generate511, generate540, generate594} from './generate5XXFields.js';
import {generate600, generate650, generate653, generate655} from './generate6XXFields';
import {generate700} from './generate7XXFields';
import {generate856, generate884} from './generate8XXFields';
import {generate974} from './generate9XXFields';

import ISBN from 'isbn3';

const logger = createLogger();

export default ({source4Value, isLegalDeposit, sources, sender, moment = momentOrig}) => async ({Product: record}) => {
  const {getValue, getValues} = createValueInterface(record);
  const dataSource = getSource();

  if (dataSource === undefined) { // eslint-disable-line functional/no-conditional-statement
    throw new NotSupportedError('No data source found.');
  }

  checkSupplierData();

  function checkSupplierData() {
    if ([dataSource] in sources === false) { // eslint-disable-line functional/no-conditional-statement
      throw new NotSupportedError('Exception: please check data source.');
    }
  }

  if (isNotSupported()) { // eslint-disable-line functional/no-conditional-statement
    throw new NotSupportedError('Unsupported product identifier type & value');
  }

  const marcRecord = new MarcRecord(); // New empty record

  const {isAudio, isText, textFormat} = getTypeInformation();
  marcRecord.leader = generateLeader(isAudio, isText, textFormat); // eslint-disable-line functional/immutable-data
  const generatedFields = await generateFields(isAudio, isText, textFormat);
  generatedFields.forEach(f => marcRecord.insertField(f));

  if (MarcRecord.isEqual(marcRecord, new MarcRecord())) { // eslint-disable-line functional/no-conditional-statement
    throw new NotSupportedError('Record conversion failed. Skipping record');
  }

  return marcRecord.toObject(); // toObject removes validation filters

  function generateLeader(isAudio, isText) {
    const type = generateType();
    const bibliographicLevel = generateBibliographicLevel();
    const encodingLevel = generateEncodingLevel();

    return `00000n${type}${bibliographicLevel} a2200000${encodingLevel}i 4500`;

    function generateEncodingLevel() {

      /* Old code left here just in case ->
          Const encodingLevels = {
            '01': '3',
            '02': '5',
            '03': '8',
            '04': '8',
            '05': 'J',
            '08': '8',
            '09': '8'
          };

          const notificationType = getValue('NotificationType');
          return encodingLevels[notificationType] || '|';
      */
      return '8'; // 2.11.2020: wanted same value for all Onix
    }

    function generateType() {
      if (isAudio) {
        return 'i';
      }

      if (isText) {
        return 'a';
      }

      return '|';
    }

    function generateBibliographicLevel() {
      return isAudio || isText ? 'm' : '|';
    }
  }

  async function generateFields(isAudio, isText, textFormat) {
    const authors = getAuthors();

    return [
      generate008({moment, record, dataSource, source4Value}),
      generate006({isAudio, isText}),
      generate007({isAudio, isText}),
      generate040(dataSource, source4Value),
      generate041(record),
      generate084a(record, dataSource, source4Value),
      generate084b(record, dataSource, source4Value),
      generate240(record),
      generate250(record, dataSource, source4Value),
      generate263(record, dataSource, source4Value),
      generate264(record),
      generate300(record),
      generate336(isAudio, isText),
      generate344(record),
      generate347(isAudio, isText, textFormat),
      generate490(record),
      generate500(record, dataSource, source4Value, isLegalDeposit),
      generate506(record, dataSource, source4Value, isLegalDeposit),
      generate511(record),
      generate540(record, dataSource, source4Value, isLegalDeposit),
      generate594(record, dataSource, source4Value, isLegalDeposit),
      generate600(record, dataSource, source4Value),
      generate650(record, dataSource, source4Value),
      generate653(record, dataSource, source4Value),
      generate655(record, dataSource, source4Value),
      generate700(record),
      await generate856(record, dataSource, source4Value, isLegalDeposit),
      generate884(sources, dataSource, moment),
      generate974(record, dataSource, source4Value),
      generateStandardIdentifiers(),
      generateTitles(record, authors),
      generateAuthors(),
      generateSID(),
      generateStaticFields()
    ].flat();


    function generateStandardIdentifiers() {
      const isbn = getIsbn();

      if (!isbn) {
        //logger.log('debug', 'Exception: generateStandardIdentifiers, getIsbn; isbn');
        return [];
      }

      if (isbn) {
        if (isAudio || isText) {
          return [
            {
              tag: '020',
              subfields: [
                {code: 'a', value: isbn.isbn13h},
                {code: 'q', value: isAudio ? 'MP3' : textFormat}
              ]
            }
          ];
        }

        return [
          {
            tag: '020',
            subfields: [{code: 'a', value: isbn.isbn13h}]
          }
        ];
      }

      const gtin = getValues('ProductIdentifier').find(({ProductIDType: [type]}) => type === '03')?.IDValue?.[0];

      if (gtin) {
        return [
          {
            tag: '024', ind1: '3',
            subfields: [{code: 'a', value: gtin}]
          }
        ];
      }

      return [];
    }


    function generateAuthors() {

      const mappedRows = getValues('DescriptiveDetail', 'Contributor').filter(filter).map((row) => {

        // check if toimittaja
        if (row.PersonNameInverted) {
          const pattern = /\s?\(toim\.\)|Toimittanut /u;
          const [name] = row.PersonNameInverted;

          if (pattern.test(name)) {
            return {
              tag: '700',
              ind1: '1',
              ind2: ' ',
              subfields: [
                {code: 'a', value: getName(row.PersonNameInverted[0])},
                {code: 'e', value: 'toimittaja'}
              ]
            };
          }

        }


        if (row.SequenceNumber) { // alternate A01-cases, i.e. second, third etc; both isni & non-isni ->
          const [sequenceNumberValue] = row.SequenceNumber;
          const [contributorRoleValue] = row.ContributorRole;

          if (contributorRoleValue === 'A01' && sequenceNumberValue !== '1') { // --> second A01 goes to 700 field

            if (row.NameIdentifier !== undefined) {
              return {
                tag: '700',
                ind1: '1',
                ind2: ' ',
                subfields: [
                  {code: 'a', value: getName(row.PersonNameInverted[0])},
                  {code: 'e', value: changeRoleValues(row.ContributorRole[0])},
                  {code: '0', value: `https://isni.org/isni/${row.NameIdentifier[0].IDValue}`}
                ]
              };
            }

            if (row.NameIdentifier === undefined) {
              return {
                tag: '700',
                ind1: '1',
                ind2: ' ',
                subfields: [
                  {code: 'a', value: getName(row.PersonNameInverted[0])},
                  {code: 'e', value: changeRoleValues(row.ContributorRole[0])}
                ]
              };
            }

            return false;
          }

        }


        if (row.NameIdentifier !== undefined) {
          return {
            tag: changeTagValues(row.ContributorRole[0]),
            ind1: '1',
            ind2: ' ',
            subfields: [
              {code: 'a', value: getName(row.PersonNameInverted[0])},
              {code: 'e', value: changeRoleValues(row.ContributorRole[0])},
              {code: '0', value: `https://isni.org/isni/${row.NameIdentifier[0].IDValue}`}
            ]
          };

        }


        if (row.NameIdentifier === undefined && row.PersonNameInverted !== undefined) {
          return {
            tag: changeTagValues(row.ContributorRole[0]),
            ind1: '1',
            ind2: ' ',
            subfields: [
              {code: 'a', value: getName(row.PersonNameInverted[0])},
              {code: 'e', value: changeRoleValues(row.ContributorRole[0])}
            ]
          };

        }

        return false;
      });

      return mappedRows.filter(value => value !== false);


      function filter({ContributorRole}) {
        const [firstContributorRole] = ContributorRole;
        return ['A01', 'E07'].includes(firstContributorRole); // Only these roles here
      }


      function changeRoleValues(value) {
        if (value === 'A01') {
          return 'kirjoittaja.';
        }
        if (value === 'E07') {
          return 'lukija.';
        }
        if (value === 'B01') {
          return 'toimittaja.';
        }
        return value;
      }

      function getName(value) {
        if (value !== undefined) {
          return value;
        }
        return 'Unnamed person';
      }

      function changeTagValues(value) {
        if (value === 'A01') {
          return '100';
        }
        if (value === 'B01') {
          return '100';
        }
        if (value === 'E07') {
          return '700';
        }
        return value;
      }

    }


    function getAuthors() {
      return getValues('DescriptiveDetail', 'Contributor')
        .filter(filter)
        .map(normalize)
        .sort(({sequence: a}, {sequence: b}) => a - b);

      function filter({PersonNameInverted, ContributorRole}) {
        return PersonNameInverted?.[0] && ['A01', 'E07'].includes(ContributorRole?.[0]);
      }

      function normalize({PersonNameInverted, ContributorRole, SequenceNumber}) {
        const pattern = /\s?\(toim\.\)|Toimittanut /u;
        const name = PersonNameInverted?.[0] || '';
        // Without sequence use a high number to get sorted to the end
        const sequence = Number(SequenceNumber?.[0]) || 1000;

        if (pattern.test(name)) {
          return {
            sequence,
            name: name.replace(pattern, ''),
            role: 'toimittaja'
          };
        }

        return {
          name, sequence,
          role: ContributorRole?.[0] === 'A01' ? 'kirjoittaja' : 'lukija'
        };
      }
    }
  }


  function getTypeInformation() {
    const pfd = getValue('DescriptiveDetail', 'ProductFormDetail');
    const pfds = getValues('DescriptiveDetail', 'ProductFormDetail'); // may have many values

    if (dataSource === source4Value) {
      const recRef = getValue('Product', 'RecordReference');

      if (!recRef) { // eslint-disable-line functional/no-conditional-statement
        logger.log('debug', `No RecordReferenceID found - SKIP`);
        throw new NotSupportedError('Unidentified: not audio, not text. No RecordReferenceID found');
      }

      if (!pfd) { // eslint-disable-line functional/no-conditional-statement
        logger.log('debug', `NOT ANY ProductFormDetail found - SKIP  ${recRef}`);
        throw new NotSupportedError('Unidentified: not audio, not text. NOT ANY ProductFormDetail found');
      }

      if (pfds && pfds.length > 1) { // eslint-disable-line functional/no-conditional-statement
        logger.log('debug', `Many ProductFormDetails -SKIP  ${recRef}`);
        throw new NotSupportedError('Unidentified: not audio, not text. Many ProductFormDetails');
      }
    }

    if (getValue('DescriptiveDetail', 'ProductFormDetail') && getValue('DescriptiveDetail', 'ProductForm')) {
      const form = getValue('DescriptiveDetail', 'ProductForm');
      const formDetail = getValue('DescriptiveDetail', 'ProductFormDetail');

      if (form === 'AJ' && formDetail === 'A103') {
        return {isAudio: true};
      }

      if (form === 'AN' && formDetail === 'A103') { // <--- add 22.10.2020 / look email SN
        return {isAudio: true};
      }

      if (['EB', 'EC', 'ED'].includes(form) && ['E101', 'E107'].includes(formDetail)) { // <--- added EC 22.10.2020 / look email SN
        return {isText: true, textFormat: formDetail === 'E101' ? 'EPUB' : 'PDF'};
      }
    }

    throw new NotSupportedError('Unidentified: not audio, not text. TEST');
  }


  function isNotSupported() {
    return getValues('ProductIdentifier').some(({ProductIDType: [type], IDValue: [value]}) => type === '02' && (/^(?<def>951|952)/u).test(value) === false);
  }

  function getIsbn() {
    const isbn15 = getValues('ProductIdentifier').find(({ProductIDType: [type]}) => type === '15');

    if (isbn15 === undefined) {
      logger.log('debug', 'isbn15 undefined. ');
      return false;
    }

    if (isbn15) {
      const isbnAudit = ISBN.audit(isbn15.IDValue[0]);

      if (!isbnAudit.validIsbn) {
        logger.log('debug', 'Exception: getIsbn, Audit');
        return false;
      }

      const {isbn10, isbn10h, isbn13, isbn13h} = ISBN.parse(isbn15.IDValue[0]);
      return {isbn10, isbn10h, isbn13, isbn13h};
    }

    const fromType02 = getValues('ProductIdentifier').find(({ProductIDType: [type]}) => type === '02')?.IDValue?.[0];

    if (fromType02 === undefined) {
      logger.log('debug', 'isbn Type02 undefined. ');
      return false;
    }

    if (fromType02) {
      const isbnAudit = ISBN.audit(fromType02.IDValue[0]);

      if (!isbnAudit.validIsbn) {
        logger.log('debug', 'Exception: getIsbnFrom2, Audit');
        return false;
      }

      const {isbn10, isbn10h, isbn13, isbn13h} = ISBN.parse(fromType02.IDValue[0]);
      return {isbn10, isbn10h, isbn13, isbn13h};
    }

    return false;
  }

  function getSource() {
    // Check first suppliername then sender name
    // SupplierName
    if (getValue('Product', 'ProductSupply', 'SupplyDetail', 'Supplier', 'SupplierName')) {
      const gvalue = getValue('Product', 'ProductSupply', 'SupplyDetail', 'Supplier', 'SupplierName');
      return gvalue;
    }

    // SenderName
    if (getValue('Product', 'ProductSupply', 'SupplyDetail', 'Supplier', 'SenderName')) {
      const gvalue = getValue('Product', 'ProductSupply', 'SupplyDetail', 'Supplier', 'SenderName');
      return gvalue;
    }

    return sender.name;
  }

  function generateSID() {
    if (dataSource === source4Value) {
      const recRef = getValue('Product', 'RecordReference');

      if (recRef === undefined) {
        logger.log('debug', 'Exception: no RecordReference/SID');
        return [];
      }

      return [
        {
          tag: 'SID',
          subfields: [
            {code: 'c', value: `${recRef}`},
            {code: 'b', value: 'FI-KV'}
          ]
        }
      ];
    }

    return [];
  }
};


