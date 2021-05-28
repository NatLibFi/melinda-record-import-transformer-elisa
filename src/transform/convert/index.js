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
      generate490(),
      generate500(),
      generate506(),
      generate511(),
      generate540(),
      generate594(),
      generate600(),
      generate650(),
      generate653(),
      generate655(),
      generate700(),
      await generate856(),
      generate884(),
      generate974(),
      generateStandardIdentifiers(),
      generateTitles(record, authors),
      generateAuthors(),
      generateSID(),
      generateStaticFields()
    ].flat();


    function generate490() {
      const gotTitleElementLevel = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'TitleElementLevel');
      const gotCollectionType = getValue('DescriptiveDetail', 'Collection', 'CollectionType');
      const gotCollectionIDtype = getValue('DescriptiveDetail', 'Collection', 'CollectionIdentifier', 'CollectionIdtype');
      const gotTitleText = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'TitleText');
      const gotIDValue = getValue('DescriptiveDetail', 'Collection', 'CollectionIdentifier', 'IDValue');
      const gotPartNumber = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'PartNumber');

      if (!gotCollectionType && !gotTitleElementLevel && !gotCollectionIDtype) {
        return [];
      }

      if (!gotTitleText && !gotPartNumber && !gotIDValue) {
        return [];
      }

      const theResult = getValues('DescriptiveDetail', 'Collection').map(makeFields);

      if (theResult === undefined || theResult.length === 0) {
        return [];
      }

      const filtered = theResult.filter((v) => v !== undefined);

      return filtered;


      function makeFields(element) {
        const subfields = generateSubfields();

        function generateSubfields() {
          const fieldA = buildFieldA();
          const fieldX = buildFieldX();
          const fieldV = buildFieldV();
          const aplusx = fieldA.concat(fieldX);

          return aplusx.concat(fieldV);
        }

        if (subfields.length > 0 && subfields !== undefined) {
          return {tag: '490', ind1: '0', subfields};
        }


        function buildFieldA() { // Requires TitleText
          if (gotTitleElementLevel === undefined || gotCollectionType === undefined || gotTitleText === undefined) {
            return [];
          }

          if (element.CollectionType[0] === undefined || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] === undefined) {
            return [];
          }

          if (element.CollectionType[0] !== '10' || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] !== '02') {
            return [];
          }

          if (element.TitleDetail[0].TitleElement[0].TitleText[0] === undefined) {
            return [];
          }

          // ---> 13.11.2020
          // Välilyöntiä ja puolipistettä ei tarvita [ a:lle] silloin,
          // kun tietueella ei ole lainakaan osakenttää ‡v    ->
          const checkfieldV = buildFieldV(); // check if there is v

          if (checkfieldV.length === 0) { // eslint-disable-line functional/no-conditional-statement
            return [{code: 'a', value: `${element.TitleDetail[0].TitleElement[0].TitleText[0]}`}]; // plain
          }
          // <---


          return [{code: 'a', value: `${element.TitleDetail[0].TitleElement[0].TitleText[0]} ;`}];
        }

        function buildFieldX() { // Requires IDValue
          if (gotCollectionIDtype === undefined || gotIDValue === undefined) {
            return [];
          }

          if (element.CollectionIdentifier[0].CollectionIdtype[0] === undefined || element.CollectionIdentifier[0].IDValue[0] === undefined) {
            return [];
          }

          if (element.CollectionIdentifier[0].CollectionIdtype[0] !== '02') {
            return [];
          }

          return [{code: 'x', value: `${element.CollectionIdentifier[0].IDValue[0]}`}];
        }


        function buildFieldV() { // Requires PartNumber
          if (gotTitleElementLevel === undefined || gotCollectionType === undefined || gotPartNumber === undefined) {
            return [];
          }

          if (element.CollectionType[0] === undefined || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] === undefined) {
            return [];
          }

          if (element.CollectionType[0] !== '10' || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] !== '02') {
            return [];
          }

          if (element.TitleDetail[0].TitleElement[0].PartNumber === undefined) { // Prev: PartNumber[0]
            return [];
          }

          return [{code: 'v', value: `${element.TitleDetail[0].TitleElement[0].PartNumber[0]}`}];
        }

      }

    }


    function generate500() {
      if (dataSource === source4Value) {
        const notificType = getValue('NotificationType');

        if (notificType && (notificType === '01' || notificType === '02')) {
          return [
            {
              tag: '500',
              subfields: [{code: 'a', value: 'ENNAKKOTIETO / KIRJAVÄLITYS'}]
            }
          ];

        }

        if (notificType && notificType === '03' && isLegalDeposit === false) {
          return [
            {
              tag: '500',
              subfields: [{code: 'a', value: 'TARKISTETTU ENNAKKOTIETO / KIRJAVÄLITYS'}]
            }
          ];

        }

        if (notificType && notificType === '03' && isLegalDeposit === true) {
          return [
            {
              tag: '500',
              subfields: [{code: 'a', value: 'Koneellisesti tuotettu tietue.'}]
            }
          ];

        }

      }

      // All others --->
      return [
        {
          tag: '500',
          ind1: ' ',
          ind2: ' ',
          subfields: [{code: 'a', value: 'Koneellisesti tuotettu tietue.'}]
        }
      ];
      // All others <---
    }


    function generate506() {
      if (dataSource === source4Value) {
        // Field added if NotificationType = 03 with legal deposit
        const notificType = getValue('NotificationType');

        if (notificType && notificType === '03' && isLegalDeposit === true) {
          return [
            {
              tag: '506',
              ind1: '1',
              subfields: [
                {code: 'a', value: 'Aineisto on käytettävissä vapaakappalekirjastoissa.'},
                {code: 'f', value: 'Online access with authorization'}, // now without dot: 12.11.2020
                {code: '2', value: 'star'},
                {code: '5', value: 'FI-Vapaa'},
                {code: '9', value: 'FENNI<KEEP>'}
              ]
            }
          ];
        }

        return [];
      }


      //--->  for alternate way
      return [
        {
          tag: '506',
          ind1: '1',
          subfields: [
            {code: 'a', value: 'Aineisto on käytettävissä vapaakappalekirjastoissa.'},
            {code: 'f', value: 'Online access with authorization'}, // now without dot: 12.11.2020
            {code: '2', value: 'star'},
            {code: '5', value: 'FI-Vapaa'},
            {code: '9', value: 'FENNI<KEEP>'}
          ]
        }
      ];
      //<---  for alternate way
    }


    function generate511() {
      if (getValue('DescriptiveDetail', 'Contributor', 'PersonName')) {
        const theData = getValues('DescriptiveDetail', 'Contributor').filter(filter);
        const dataMapped = theData.map(makeFields);

        return dataMapped;
      }

      function filter({ContributorRole}) {
        return ['E07'].includes(ContributorRole?.[0]);
      }


      function makeFields(element) {

        if (!element.PersonName) {
          return {
            tag: '511',
            ind1: '0',
            subfields: [{code: '9', value: 'FENNI<KEEP>'}]
          };
        }

        return {
          tag: '511',
          ind1: '0',
          subfields: [
            {code: 'a', value: `Lukija: ${element.PersonName[0]}.`},
            {code: '9', value: 'FENNI<KEEP>'}
          ]
        };
      }

      return [];
    }

    function generate540() {
      if (dataSource === source4Value) {
        // Field added if NotificationType = 03 with legal deposit
        const notificType = getValue('NotificationType');

        if (notificType !== undefined && notificType === '03' && isLegalDeposit === true) {
          return [
            {
              tag: '540',
              subfields: [
                {code: 'a', value: 'Aineisto on käytettävissä tutkimus- ja muihin tarkoituksiin;'},
                {code: 'b', value: 'Kansalliskirjasto;'},
                {code: 'c', value: 'Laki kulttuuriaineistojen tallettamisesta ja säilyttämisestä'},
                {code: 'u', value: 'http://www.finlex.fi/fi/laki/ajantasa/2007/20071433'},
                {code: '5', value: 'FI-Vapaa'},
                {code: '9', value: 'FENNI<KEEP>'}
              ]
            }
          ];

        }

        return [];
      }

      //--->  alternate way
      return [
        {
          tag: '540',
          subfields: [
            {code: 'a', value: 'Aineisto on käytettävissä tutkimus- ja muihin tarkoituksiin;'},
            {code: 'b', value: 'Kansalliskirjasto;'},
            {code: 'c', value: 'Laki kulttuuriaineistojen tallettamisesta ja säilyttämisestä'},
            {code: 'u', value: 'http://www.finlex.fi/fi/laki/ajantasa/2007/20071433'},
            {code: '5', value: 'FI-Vapaa'},
            {code: '9', value: 'FENNI<KEEP>'}
          ]
        }
      ];
      //<---  alternate way
    }

    function generate594() {
      if (dataSource === source4Value) {
        const notificType = getValue('NotificationType');

        if (notificType === undefined || isLegalDeposit === undefined) {
          return []; //  Skip
        }

        if (notificType === '03' && isLegalDeposit === true) {
          // return []; //  Field is left out if NotificationType = 03 with legal deposit

          return [
            {
              tag: '594',
              subfields: [
                {code: 'a', value: 'Koneellisesti tuotettu tietue'},
                {code: '5', value: 'FENNI'}
              ]
            }
          ];
        }

        if (notificType === '01' || notificType === '02') {
          return [
            {
              tag: '594',
              subfields: [
                {code: 'a', value: 'ENNAKKOTIETO / KIRJAVÄLITYS'},
                {code: '5', value: 'FENNI'}
              ]
            }
          ];
        }

        if (notificType === '03' && isLegalDeposit === false) {
          return [
            {
              tag: '594',
              subfields: [
                {code: 'a', value: 'TARKISTETTU ENNAKKOTIETO / KIRJAVÄLITYS'},
                {code: '5', value: 'FENNI'}
              ]
            }
          ];
        }
      }

      //--->  for alternate way
      return [
        {
          tag: '594',
          subfields: [
            {code: 'a', value: 'Koneellisesti tuotettu tietue'},
            {code: '5', value: 'FENNI'}
          ]
        }
      ];
      //<---  for alternate way
    }


    function generate600() {

      const getPersonNameInverted = getValues('DescriptiveDetail', 'NameAsSubject', 'PersonNameInverted');
      // Refers to PersonNameInverted of NameAsSubject!

      if (getPersonNameInverted === undefined || getPersonNameInverted.length === 0 || dataSource !== source4Value) {
        return [];
      }

      const output = getValues('DescriptiveDetail', 'NameAsSubject').map(makeFields);
      const filtered = output.filter((rw) => rw !== undefined);
      return filtered;

      function makeFields(element) {

        const subfields = generateSubfields();

        if (subfields.length > 0 && subfields !== undefined) {
          return {tag: '600',
            ind1: '1',
            ind2: '4',
            subfields};
        }

        function generateSubfields() {
          const writeBasics = basics();

          if (element.NameIdentifier === undefined) {
            return writeBasics;
          }

          if (element.NameIdentifier !== undefined) {
            const writeIsni = isni();
            return writeBasics.concat(writeIsni);
          }

          return [];

          function basics () {
            return [{code: 'a', value: getPersonNameInverted[0]}];
          }

          function isni () {
            return [{code: '0', value: `https://isni.org/isni/${element.NameIdentifier[0].IDValue}`}];
          }

        }

      }

    }


    function generate650() {
      const SubScheIde = getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier');

      if (SubScheIde && dataSource === source4Value) {
        const values = getValues('DescriptiveDetail', 'Subject').filter(filter).map(makeRows);
        return values.filter(value => value !== false);
      }

      return [];

      function makeRows(element) {
        const value = getData(element);

        if (!value) {
          return false;
        }

        return {
          tag: '650',
          ind1: ' ',
          ind2: '7',

          subfields: [
            {code: 'a', value},
            {code: '2', value: 'yso/fin'},
            {code: 'g', value: 'ENNAKKOTIETO'}
          ]

        };

        function getData() {
          if (element.SubjectHeadingText === undefined) {
            logger.log('debug', 'Exception: 650 - element.SubjectHeadingText');
            return false;
          }

          return element.SubjectHeadingText[0];
        }
      }

      function filter({SubjectSchemeIdentifier}) {
        return ['71'].includes(SubjectSchemeIdentifier?.[0]);
      }
    }


    function generate653() {
      const SubScheIde = getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier');

      if (SubScheIde && dataSource === source4Value) {
        const values = getValues('DescriptiveDetail', 'Subject').filter(filter).map(makeRows);
        return values.filter(value => value !== false);
      }

      return [];

      function makeRows(element) {
        const value = getData(element);

        if (!value) {
          return false;
        }

        return {
          tag: '653',
          subfields: [
            {code: 'a', value},
            {code: 'g', value: 'ENNAKKOTIETO'}
          ]
        };

        function getData() {
          if (element.SubjectHeadingText === undefined) {
            logger.log('debug', 'Exception: 653 - element.SubjectHeadingText');
            return false;
          }

          return element.SubjectHeadingText[0];
        }
      }

      function filter({SubjectSchemeIdentifier}) {
        return ['20', '64', '72'].includes(SubjectSchemeIdentifier?.[0]); // '71', moved to 650! 26.3.2021
      }
    }

    function generate655() {
      // Make always when there is form = AJ & formDetail = A103
      const form = getValue('DescriptiveDetail', 'ProductForm');
      const formDetail = getValue('DescriptiveDetail', 'ProductFormDetail');

      if (formDetail === undefined || form === undefined || dataSource !== source4Value) {
        return [];
      }

      if (form === 'AJ' && formDetail === 'A103') {
        return [
          {
            tag: '655',
            ind2: '7',
            subfields: [
              {code: 'a', value: 'äänikirjat'},
              {code: '2', value: 'slm/fin'},
              {code: '0', value: 'http://urn.fi/URN:NBN:fi:au:slm:s579'},
              {code: '9', value: 'FENNI<KEEP>'}
            ]
          }
        ];

      }
      return [];
    }

    function generate700() {

      const contribrole = getValues('DescriptiveDetail', 'Contributor', 'ContributorRole');
      const personNameInverted = getValues('DescriptiveDetail', 'Contributor', 'PersonNameInverted');

      if (contribrole && personNameInverted) {
        return getValues('DescriptiveDetail', 'Contributor').filter(filter).map(makeRows);
      }

      return [];

      function makeRows(element) {

        if (element.NameIdentifier !== undefined) {
          return {
            tag: '700',
            ind1: '1',
            ind2: ' ',
            subfields: [
              {code: 'a', value: getName(element)},
              {code: 'e', value: changeValues(element.ContributorRole[0])},
              {code: '0', value: buildIsni()}
            ]
          };
        }


        return {
          tag: '700',
          ind1: '1',
          ind2: ' ',
          subfields: [
            {code: 'a', value: getName(element)},
            {code: 'e', value: changeValues(element.ContributorRole[0])}
          ]
        };

        function getName() {
          if (personNameInverted !== undefined && element.PersonNameInverted !== undefined) {
            return element.PersonNameInverted[0];
          }
          return 'Unnamed person';
        }

        function buildIsni() {
          return `https://isni.org/isni/${element.NameIdentifier[0].IDValue}`;
        }

      }


      function filter({ContributorRole}) {
        return ['B06', 'A12', 'B01'].includes(ContributorRole?.[0]); // Excluded 'E07', generateAuthors makes it already
      }

      function changeValues(value) {
        if (value === 'B06') {
          return 'kääntäjä.';
        }
        if (value === 'E07') {
          return 'lukija.';
        }
        if (value === 'A12') {
          return 'kuvittaja.';
        }
        if (value === 'B01') {
          return 'toimittaja.';
        }
        return value;
      }

    }


    function generate856() {
      const isbn = getIsbn();

      if (!isbn) {
        //logger.log('debug', 'Exception: 856, getIsbn; isbn');
        return [];
      }

      if (dataSource === source4Value) {
        if (getValue('NotificationType') === '03' && isLegalDeposit === true) {
          return [
            {
              tag: '856',
              ind1: '4',
              ind2: '0',
              subfields: [
                {code: 'u', value: `http://urn.fi/URN:ISBN:${isbn.isbn13h}`},
                {code: 'z', value: 'Käytettävissä vapaakappalekirjastoissa'},
                {code: '5', value: 'FI-Vapaa'}
              ]
            }
          ];
        }

        return [];
      }


      //--->  for alternate way
      return [
        {
          tag: '856',
          ind1: '4',
          ind2: '0',
          subfields: [
            {code: 'u', value: `http://urn.fi/URN:ISBN:${isbn.isbn13h}`},
            {code: 'z', value: 'Käytettävissä vapaakappalekirjastoissa'},
            {code: '5', value: 'FI-Vapaa'}
          ]
        }
      ];
      //<---  for alternate way
    }


    function generate884() {
      const tellSource = sourceNames();

      return [
        {
          tag: '884',
          subfields: [
            {code: 'a', value: 'ONIX3 to MARC transformation'},
            {code: 'g', value: moment().format('YYYYMMDD')},
            // {code: 'k', value: sources[dataSource]},
            {code: 'k', value: tellSource}, // 6.11.2020
            {code: 'q', value: 'FI-NL'},
            {code: '5', value: 'MELINDA'},
            {code: '5', value: 'FENNI'}
          ]
        }
      ];

      function sourceNames() {
        if (sources[dataSource] === 'Elisa') { // eslint-disable-line functional/no-conditional-statement
          return 'MELINDA_RECORD_IMPORT_SOURCE1';
        }

        if (sources[dataSource] === 'Ellibs') { // eslint-disable-line functional/no-conditional-statement
          return 'MELINDA_RECORD_IMPORT_SOURCE2';
        }

        if (sources[dataSource] === 'Books On Demand') { // eslint-disable-line functional/no-conditional-statement
          return 'MELINDA_RECORD_IMPORT_SOURCE3';
        }

        if (sources[dataSource] === 'Kirjavälitys Oy') { // eslint-disable-line functional/no-conditional-statement
          return 'MELINDA_RECORD_IMPORT_SOURCE4';
        }

        return `${sources[dataSource]}`; // Others, tests etc. write as it is
      }
    }

    function generate974() {
      // Get IDValue from   Product/RelatedMaterial/RelatedWork/WorkIdentifier/IDValue
      const getIdvalue = getValue('RelatedMaterial', 'RelatedWork', 'WorkIdentifier', 'IDValue');
      const gids = getValues('RelatedMaterial', 'RelatedWork', 'WorkIdentifier');

      if (getIdvalue && gids && dataSource === source4Value) {
        return gids.map(doEdits);
      }

      function doEdits(element) {
        return {
          tag: '974',
          subfields: [
            {code: 'a', value: 'KV'},
            {code: 'b', value: element.IDValue[0]},
            {code: '5', value: 'FENNI'}
          ]
        };
      }
      return [];
    }


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


