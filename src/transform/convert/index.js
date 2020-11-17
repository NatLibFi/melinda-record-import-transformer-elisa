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

import {hyphenate} from 'beautify-isbn';

//import fetch from 'node-fetch'; // rem 12.11.2020 (field 856)
//const URN_GENERATOR_URL = 'http://generator.urn.fi/cgi-bin/urn_generator.cgi?type=nbn';   // rem 12.11.2020 (field 856)


const logger = createLogger();

export default ({source4Value, isLegalDeposit, sources, sender, moment = momentOrig}) => async ({Product: record}) => {


  const {getValue, getValues} = createValueInterface(record);
  const dataSource = getSource();

  if (dataSource === undefined) { // eslint-disable-line functional/no-conditional-statement
    throw new Error('  No data source found.');
  }

  checkSupplierData();

  function checkSupplierData() {
    if ([dataSource] in sources === false) { // eslint-disable-line functional/no-conditional-statement
      throw new Error('Exception: please check data source.');
    }
  }

  if (isNotSupported()) { // eslint-disable-line functional/no-conditional-statement
    // Throw new Error('Unsupported product identifier type & value');
    throw new NotSupportedError('Unsupported product identifier type & value');
  }

  const marcRecord = new MarcRecord();
  const {isAudio, isText, textFormat} = getTypeInformation();

  marcRecord.leader = generateLeader(); // eslint-disable-line functional/immutable-data

  const generatedFields = await generateFields();
  generatedFields.forEach(f => marcRecord.insertField(f));


  return marcRecord;


  function generateLeader() {
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

  async function generateFields() {

    const authors = getAuthors();

    return [
      generate008({moment, record, dataSource, source4Value}),
      generate006({isAudio, isText}),
      generate007({isAudio, isText}),
      generate040(dataSource, source4Value),
      generate041(record),
      generate084a(record, dataSource, source4Value),
      generate084b(record, dataSource, source4Value),
      generate250(),
      generate263(),
      generate264(),
      generate300(),
      generate336(),
      generate344(),
      generate347(),
      generate490(),
      generate500(),
      generate506(),
      generate511(),
      generate540(),
      generate594(),
      generate600(),
      generate653(),
      generate655(),
      generate700(),
      await generate856(),
      generate884(),
      generate974(),
      generateStandardIdentifiers(),
      generateTitles(record, authors),
      generateAuthors(),
      generateStaticFields()
    ].flat();


    function generate250() {
      // Generate only if EditionNumber exists!
      const editionNr = getValue('DescriptiveDetail', 'EditionNumber');

      if (editionNr && dataSource === source4Value) {
        return [
          {
            tag: '250',
            ind1: ' ',
            ind2: ' ',
            subfields: [{code: 'a', value: `${editionNr}. painos`}]
          }
        ];
      }

      return [];
    }


    function generate263() {
      // Generate only if: NotificationType = 01 or 02  AND PublishingDateRole = 01
      const PubDatDate = getValue('PublishingDetail', 'PublishingDate', 'Date');
      const PubDatRole = getValue('PublishingDetail', 'PublishingDate', 'PublishingDateRole');
      const NotifType = getValue('NotificationType');

      if (PubDatDate && PubDatRole && NotifType && dataSource === source4Value) {

        if ((NotifType === '01' || NotifType === '02') && PubDatRole === '01') {
          return [
            {
              tag: '263',
              ind1: ' ',
              ind2: ' ',
              subfields: [{code: 'a', value: PubDatDate}]
            }
          ];
        }
        return [];
      }

      return [];
    }


    function generate300() {

      const extType = getValue('DescriptiveDetail', 'Extent', 'ExtentType');
      const extValue = getValue('DescriptiveDetail', 'Extent', 'ExtentValue');
      const extUnit = getValue('DescriptiveDetail', 'Extent', 'ExtentUnit');


      if (extValue && extType && extUnit) {

        const timeHours = getHours();
        const timeSec = getSeconds();
        const timeMins = getMinutes(); // 13.11.2020

        // I A :  if ExtentType = 09 and ExtentUnit = 15 ( 15 -> HHHMM i.e. 5 digits)
        if (extType === '09' && extUnit === '15') {
          // const outText = `1 verkkoaineisto ${timeHours}${extValue.slice(3, 5)} min)`;  // ALKUP
          const outText = `1 verkkoaineisto ${timeHours}${timeMins}`;
          return [
            {
              tag: '300',
              subfields: [{code: 'a', value: outText}]
            }
          ];
        }

        // I B :  if ExtentType = 09 and ExtentUnit = 16 ( 16 -> HHHMMSS !  i.e. 7 digits)
        if (extType === '09' && extUnit === '16') {
          // const outText = `1 verkkoaineisto ${timeHours}${extValue.slice(3, 5)} min${timeSec}`;   // ALKUP
          const outText = `1 verkkoaineisto ${timeHours}${timeMins}${timeSec}`;
          return [
            {
              tag: '300',
              subfields: [{code: 'a', value: outText}]
            }
          ];
        }

        // II: extType 00 or 10      AND extUnit = 03      AND  ProductRorm = EB, EC, ED
        if ((extType === '00' || extType === '10') && extUnit === '03' && ['EB', 'EC', 'ED'].includes(getValue('DescriptiveDetail', 'ProductForm'))) {
          const outText = `1 verkkoaineisto (${extValue} sivua)`;
          return [
            {
              tag: '300',
              subfields: [{code: 'a', value: outText}]
            }
          ];
        }


      }


      return [
        {
          tag: '300',
          subfields: [{code: 'a', value: `1 verkkoaineisto`}]
        }
      ];

      function getHours() {
        if (extValue.slice(0, 3).replace(/0/gu, '') === '') { // eslint-disable-line functional/no-conditional-statement
          return '(';
        }
        return `(${extValue.slice(0, 3).replace(/0/gu, '')} h `;
      }

      function getSeconds() {
        if (extValue.slice(6, 7) === '0') { // eslint-disable-line functional/no-conditional-statement
          return ')';
        }
        return ` ${extValue.slice(6, 7)} s)`;
      }

      //--->   13.11.2020
      function getMinutes() {

        if (extValue.slice(3, 5).replace(/0/gu, '') === '') { // eslint-disable-line functional/no-conditional-statement
          return '';
        }
        return `${extValue.slice(3, 5).replace(/0/gu, '')} min`;
      }
      // <---

    }


    function generate336() {
      if (isAudio) {
        return [
          {
            tag: '336',
            subfields: [
              {code: 'a', value: 'puhe'},
              {code: 'b', value: 'spw'},
              {code: '2', value: 'rdacontent'}
            ]
          }
        ];
      }

      if (isText) {
        return [
          {
            tag: '336',
            subfields: [
              {code: 'a', value: 'teksti'},
              {code: 'b', value: 'txt'},
              {code: '2', value: 'rdacontent'}
            ]
          }
        ];
      }

      return [];
    }


    function generate344() { // Add/moved 23.10.2020 (from generate-static)
      const form = getValue('DescriptiveDetail', 'ProductForm');

      if (form === 'AJ' || form === 'AN') {
        return [
          {
            tag: '344',
            subfields: [{code: 'a', value: 'digitaalinen'}]
          }
        ];

      }

      return [];
    }

    function generate347() {
      if (isAudio) {
        return [
          {
            tag: '347', subfields: [
              {code: 'a', value: 'äänitiedosto'},
              {code: 'b', value: 'MP3'}
            ]
          }
        ];
      }

      if (isText) {
        return [
          {
            tag: '347',
            subfields: [
              {code: 'a', value: 'tekstitiedosto'},
              {code: 'b', value: textFormat}
            ]
          }
        ];
      }
      return [];
    }


    function generate490() {

      const gotTitleElementLevel = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'TitleElementLevel');
      const gotCollectionType = getValue('DescriptiveDetail', 'Collection', 'CollectionType');
      const gotCollectionIDtype = getValue('DescriptiveDetail', 'Collection', 'CollectionIdentifier', 'CollectionIdtype');
      const gotTitleText = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'TitleText');
      const gotIDValue = getValue('DescriptiveDetail', 'Collection', 'CollectionIdentifier', 'IDValue');
      const gotPartNumber = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'PartNumber');

      // SKIP if none required fields exist
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

        function generateSubfields () {
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

          if (element.CollectionType[0] === undefined && element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] === undefined) {
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
          // console.log('   490:   fieldV / status:', checkfieldV , ' / ', checkfieldV.length);
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

          if (element.CollectionType[0] === undefined && element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] === undefined) {
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
              subfields: [
                {code: 'a', value: 'Koneellisesti tuotettu tietue.'},
                {code: '9', value: 'FENNI<KEEP>'}
              ]
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

      }

      return [];

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

      }

      return [];
    }


    function generate594() {
      //  Field is left out if NotificationType = 03 with legal deposit

      if (dataSource === source4Value) {

        const notificType = getValue('NotificationType');

        if (notificType === undefined || isLegalDeposit === undefined) {
          return []; //  Skip
        }

        if (notificType === '03' && isLegalDeposit === true) {
          return []; //  Field is left out if NotificationType = 03 with legal deposit
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

      } // If dataSource match

      return [];
    }


    function generate600() {

      const getPersonNameInverted = getValues('DescriptiveDetail', 'NameAsSubject', 'PersonNameInverted');

      if (getPersonNameInverted === undefined || getPersonNameInverted.length === 0 || dataSource !== source4Value) {
        return [];
      }

      return getPersonNameInverted.map(getNames);

      function getNames(element) {
        return {
          tag: '600',
          ind1: '1',
          ind2: '4',
          subfields: [
            {code: 'a', value: element},
            {code: '9', value: 'FENNI<KEEP>'}
          ]
        };
      }

    }

    function generate653() {
      // Added only if SubjectSchemeIdentifier = 20, 64, 71 or 72
      // A| <- SubjectHeadingText
      const SubScheIde = getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier');

      if (SubScheIde && dataSource === source4Value) {
        return getValues('DescriptiveDetail', 'Subject').filter(filter).map(makeRows);
      }


      function makeRows(element) {

        return {
          tag: '653',
          subfields: [{code: 'a', value: element.SubjectHeadingText[0]}]
        };
      }

      function filter({SubjectSchemeIdentifier}) {
        return ['20', '64', '71', '72'].includes(SubjectSchemeIdentifier?.[0]);
      }

      return [];
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
      const contribrole = getValue('DescriptiveDetail', 'Contributor', 'ContributorRole');
      const personNameInverted = getValue('DescriptiveDetail', 'Contributor', 'PersonNameInverted');


      if (contribrole && personNameInverted) {
        return getValues('DescriptiveDetail', 'Contributor').filter(filter).map(makeRows);
      }

      return [];

      function makeRows(element) {
        return {
          tag: '700',
          ind1: '1',
          ind2: ' ',
          subfields: [
            {code: 'a', value: `${element.PersonNameInverted[0]},`},
            {code: 'e', value: changeValues(element.ContributorRole[0])}
          ]
        };
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

    function generate856() { // PREV: async  rem 12.11.2020

      if (getValue('NotificationType') === '03' && isLegalDeposit === true && dataSource === source4Value) {

        const isbn = getIsbn();
        const hyphenatedisbn = hyphenate(isbn);

        return [
          {
            tag: '856',
            ind1: '4',
            ind2: '0',
            subfields: [
              {code: 'u', value: `http://urn.fi/URN:ISBN:${hyphenatedisbn}`}, // PREV: subUvalue / isbn
              {code: 'z', value: 'Käytettävissä vapaakappalekirjastoissa'},
              {code: '5', value: 'FI-Vapaa'}
            ]
          }
        ];
      }


      function getIsbn() {
        const isbn13 = getValues('ProductIdentifier').find(({ProductIDType: [type]}) => type === '15');

        if (isbn13) {
          return isbn13.IDValue[0];
        }

        return getValues('ProductIdentifier').find(({ProductIDType: [type]}) => type === '02')?.IDValue?.[0];
      }


      /*   // rem 12.11.2020 ->
      async function createURN(isbn = true) { // ALKUP: false
        if (isbn) {
          return `http://urn.fi/URN:ISBN:${isbn}`;
        }

        const response = await fetch(URN_GENERATOR_URL);
        const body = await response.text();
        return `http://urn.fi/${body}`;
      }
      */


      return [];
    }


    function generate264() {
      const publisher = getValue('PublishingDetail', 'Publisher', 'PublisherName');

      if (publisher) {
        const publishingYear = generatePublishingYear();

        if (publishingYear) {
          return {
            tag: '264', ind2: '1',
            subfields: [
              {code: 'b', value: publisher},
              {code: 'c', value: publishingYear}
            ]
          };
        }

        return {
          tag: '264', ind2: '1',
          subfields: [{code: 'b', value: publisher}]
        };
      }

      return [];

      function generatePublishingYear() {
        const publishingDate = getValue('PublishingDetail', 'PublishingDate', 'Date');
        return publishingDate ? publishingDate.slice(0, 4) : '    ';
      }

    }


    function generate884() {

      const tellSource = sourceNames();

      return [
        {
          tag: '884',
          subfields: [
            {code: 'a', value: 'ONIX3 to MARC transformation'},
            {code: 'g', value: moment().format('YYYYMMDD')},
            // {code: 'k', value: sources[dataSource]}, // Was: sources.supplier  //dataSource
            {code: 'k', value: tellSource}, // 6.11.2020
            {code: 'q', value: 'FI-NL'}
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
      // Get IDValue from      Product/RelatedMaterial/RelatedWork/WorkIdentifier/IDValue
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

      if (isbn) {
        if (isAudio || isText) {
          return [
            {
              tag: '020',
              subfields: [
                {code: 'a', value: isbn},
                {code: 'q', value: isAudio ? 'MP3' : textFormat}
              ]
            }
          ];
        }

        return [
          {
            tag: '020',
            subfields: [{code: 'a', value: isbn}]
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

      function getIsbn() {
        const isbn13 = getValues('ProductIdentifier').find(({ProductIDType: [type]}) => type === '15');

        if (isbn13) {
          return isbn13.IDValue[0];
        }

        return getValues('ProductIdentifier').find(({ProductIDType: [type]}) => type === '02')?.IDValue?.[0];
      }
    }


    function generateAuthors() {

      return authors.map(({name, role}, index) => {

        if (index === 0 && role === 'kirjoittaja') {

          return {
            tag: '100', ind1: '1',
            subfields: [
              {code: 'a', value: name},
              {code: 'e', value: role}
            ]
          };
        }


        return {
          tag: '700', ind1: '1',
          subfields: [
            {code: 'a', value: name},
            {code: 'e', value: `${role}.`}
          ]
        };

      });
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


    try {
      throw new Error('Unidentified: not audio, not text');
    } catch (e) {
      logger.log('debug', 'Exception!');
    }

  }


  function isNotSupported() {
    return getValues('ProductIdentifier').some(({ProductIDType: [type], IDValue: [value]}) => type === '02' && (/^(?<def>951|952)/u).test(value) === false);
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


};


