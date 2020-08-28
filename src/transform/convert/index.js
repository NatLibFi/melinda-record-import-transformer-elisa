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
import {Utils} from '@natlibfi/melinda-commons';

const {createLogger} = Utils;
const logger = createLogger();


export default ({legalDeposit, sources, sender, moment = momentOrig}) => ({Product: record}) => {

  const {getValue, getValues} = createValueInterface(record);
  const dataSource = getSource();

  if (dataSource === undefined) { // eslint-disable-line functional/no-conditional-statement
    throw new Error('  No source found.');
  }

  if (isNotSupported()) { // eslint-disable-line functional/no-conditional-statement
    throw new Error('Unsupported product identifier type & value');
  }


  const marcRecord = new MarcRecord();

  const {isAudio, isText, textFormat} = getTypeInformation();

  marcRecord.leader = generateLeader(); // eslint-disable-line functional/immutable-data

  generateFields().forEach(f => marcRecord.insertField(f));


  return marcRecord;


  function generateLeader() {
    const type = generateType();
    const bibliographicLevel = generateBibliographicLevel();
    const encodingLevel = generateEncodingLevel();

    return `00000n${type}${bibliographicLevel} a2200000${encodingLevel}i 4500`;

    function generateEncodingLevel() {
      const encodingLevels = {
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

  function generateFields() {

    const authors = getAuthors();

    return [
      generate008(),
      generate006(),
      generate007(),
      generate040(),
      generate041(),
      generate084a(),
      generate084b(),
      generate250(),
      generate263(),
      generate264(),
      generate300(),
      generate336(),
      generate347(),
      generate490(),
      generate500(), // Only original is used (email SN 19.8.2020)
      generate506(),
      generate511(),
      generate520(),
      generate540(),
      generate594(),
      generate600(),
      generate653(),
      generate655(),
      generate700(),
      generate856(),
      generate884(),
      generate974(),
      generateStandardIdentifiers(),
      generateTitles(record, authors),
      generateAuthors(),
      generateStaticFields()
    ].flat();

    function generate250() {
      // Generate only if EditionNumber exists!

      if (getValue('DescriptiveDetail', 'EditionNumber')) {
        const editionNr = getValue('DescriptiveDetail', 'EditionNumber');

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


    function generate263() { // Added 1.7.2020
      // Generate only if:
      // NotificationType = 01 or 02  AND
      // PublishingDateRole = 01


      if (getValue('PublishingDetail', 'PublishingDate', 'Date') &&
        getValue('PublishingDetail', 'PublishingDate', 'PublishingDateRole') &&
        getValue('NotificationType')) {

        if ((getValue('NotificationType') === '01' || getValue('NotificationType') === '02') &&
              getValue('PublishingDetail', 'PublishingDate', 'PublishingDateRole') === '01') {

          return [
            {
              tag: '263',
              ind1: ' ',
              ind2: ' ',
              subfields: [{code: 'a', value: getValue('PublishingDetail', 'PublishingDate', 'Date')}]
            }
          ];

        }

        return [];
      }

      return []; // None fields exist

    }


    function generate300() {

      const extType = getValue('DescriptiveDetail', 'Extent', 'ExtentType');
      const extValue = getValue('DescriptiveDetail', 'Extent', 'ExtentValue');
      const extUnit = getValue('DescriptiveDetail', 'Extent', 'ExtentUnit');

      if (extType && extValue && extUnit) {

        // I A :  if ExtentType = 09 and ExtentUnit = 15 ( 15 -> HHHMM i.e. 5 digits)
        if (extType === '09' && extUnit === '15') {
          const outText = `1 verkkoaineisto (${extValue.slice(0, 3).replace(/0/gu, '')}h ${extValue.slice(3, 5)} min)`;
          return [
            {
              tag: '300',
              subfields: [{code: 'a', value: outText}]
            }
          ];
        }

        // I B :  if ExtentType = 09 and ExtentUnit = 16 ( 16 -> HHHMMSS !!!  i.e. 7 digits)
        if (extType === '09' && extUnit === '16') {
          const outText = `1 verkkoaineisto (${extValue.slice(0, 3).replace(/0/gu, '')} h ${extValue.slice(3, 5)} min ${extValue.slice(6, 7)} s)`;
          return [
            {
              tag: '300',
              subfields: [{code: 'a', value: outText}]
            }
          ];
        }

        // II: extType 00 or 10      AND extUnit = 03      AND  ProductRorm = EB, EC, ED
        //
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

      return [];
    }


    function generate600() {

      if (getValue('DescriptiveDetail', 'NameAsSubject', 'PersonNameInverted')) {
        const theData = getValues('DescriptiveDetail', 'NameAsSubject', 'PersonNameInverted');
        const dataMapped = theData.map(getNames);
        return dataMapped;

      }

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

      return [];
    }


    function generate974() {
      // Get IDValue from
      // Product/RelatedMaterial/RelatedWork/WorkIdentifier/IDValue
      const getidvalue = getValue('RelatedMaterial', 'RelatedWork', 'WorkIdentifier', 'IDValue');

      if (getidvalue) {
        const gids = getValues('RelatedMaterial', 'RelatedWork', 'WorkIdentifier');
        const newDeal = gids.map(doEdits);
        return newDeal;
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

    function generate347() {
      if (isAudio) {
        return [
          {
            tag: '347', subfields: [
              {code: 'a', value: 'äänitiedosto'},
              {code: 'b', value: 'MP3'},
              {code: '2', value: 'rda'}
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
              {code: 'b', value: textFormat},
              {code: '2', value: 'rda'}
            ]
          }
        ];
      }
    }


    function generate490() {
      //  Subfields x and v are left out if ONIX has no IDValue or PartNumber.

      let output = [];

      // FOR FIELDS EXISTENCE CHECK:
      // Const gotTitleElementLevel = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'TitleElementLevel');
      const gotPartNumber = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'PartNumber');
      // Const gotCollectionType = getValue('DescriptiveDetail', 'Collection', 'CollectionType');
      // Const gotCollectionIdtype = getValue('DescriptiveDetail', 'Collection', 'CollectionIdentifier', 'CollectionIdtype');
      const gotIDValue = getValue('DescriptiveDetail', 'Collection', 'CollectionIdentifier', 'IDValue');

      const theData = getValues('DescriptiveDetail', 'Collection').filter(filter); // Collection
      const dataMapped = theData.map(makeFields);
      return output; // dataMapped ???


      function filter({CollectionType}) {
        return ['10'].includes(CollectionType?.[0]);
      }

      function makeFields(element) {

        function buildFieldsav() {
          if (element.CollectionType[0] === undefined && element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] === undefined) {
            return [];
          }

          if (element.CollectionType[0] !== '10' || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] !== '02') {
            return [];
          }


          // Check if exists essentials:  TitleText/IDValue/PartNumber:
          if (gotPartNumber === undefined || element.TitleDetail[0].TitleElement[0].PartNumber[0] === undefined) {
            // Console.log('   QQQ   490      a&v:   leave out v! Make only a');

            if (element.TitleDetail[0].TitleElement[0].TitleText[0] === undefined) {
              // Console.log('   QQQ   490      a&v: can not make a, text = undefined');
              return [];
            }

            return [{code: 'a', value: `${element.TitleDetail[0].TitleElement[0].TitleText[0]}`}];

          }


          return [
            {code: 'a', value: `${element.TitleDetail[0].TitleElement[0].TitleText[0]}`},
            {code: 'v', value: `${element.TitleDetail[0].TitleElement[0].PartNumber[0]}`}
          ];

        }


        const subfields = generateSubfields();


        function generateSubfields () {
          const fieldsav = buildFieldsav();
          const fieldx = buildx();
          return fieldsav.concat(fieldx);
        }


        function buildx() { // Generate x subfield  ( = IDValue)
          if (gotIDValue === undefined || element.CollectionIdentifier[0].CollectionIdtype[0] === undefined || element.CollectionIdentifier[0].IDValue[0] === undefined) {
            return [];
          }

          if (element.CollectionIdentifier[0].CollectionIdtype[0] === '02') {
            return [{code: 'x', value: `${element.CollectionIdentifier[0].IDValue[0]}`}];
          }

          return [];
        }


        function fieldsCombined () {

          if (element.CollectionType[0] === undefined || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] === undefined) {
            console.log('   QQQ   490      essentials undefined, SKIP !');
            return [];
          }

          if (element.CollectionType[0] !== '10' && element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] !== '02' && element.CollectionIdentifier[0].CollectionIdtype[0] !== '02') {
            console.log('   QQQ   490      essentials got awrong values, SKIP !');
            return [];
          }

          // ---> case: no a&v , CollectionType=2 BUT IDValue undefined = SKIP -->
          if (element.CollectionType[0] !== '10' && element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] !== '02' && element.CollectionIdentifier[0].CollectionIdtype[0] === '02' && element.CollectionIdentifier[0].IDValue[0] === undefined) {
            console.log('   QQQ   490      SKIP!  no av-values match and for x is only CollectionIdType, IDValu undefined');
            return [];
          }

          return [{tag: '490', ind1: '0', subfields}]; // <--- case OK
        }


        output = fieldsCombined();
        console.log('   QQQ   tulos: \n ', JSON.stringify(output));

        return fieldsCombined();
      }

    }


    function generate500() {

      if (getValue('NotificationType') === '01' || getValue('NotificationType') === '02') {

        return [
          {
            tag: '500',
            subfields: [
              {code: 'a', value: 'ENNAKKOTIETO / KIRJAVÄLITYS'},
              {code: '9', value: 'FENNI<KEEP>'}
            ]
          }
        ];

      }

      if (getValue('NotificationType') === '03' && legalDeposit.true !== 'true') {

        return [
          {
            tag: '500',
            subfields: [
              {code: 'a', value: 'TARKISTETTU ENNAKKOTIETO / KIRJAVÄLITYS'},
              {code: '9', value: 'FENNI<KEEP>'}
            ]
          }
        ];

      }

      if (getValue('NotificationType') === '03' && legalDeposit.true === 'true') {

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

      return [];
    }


    function generate506() {
      // Field added if NotificationType = 03 with legal deposit

      if (getValue('NotificationType') === '03' && legalDeposit.true === 'true') {

        return [
          {
            tag: '506',
            ind1: '1',
            subfields: [
              {code: 'a', value: 'Aineisto on käytettävissä vapaakappalekirjastoissa.'},
              {code: 'f', value: 'Online access with authorization'},
              {code: '2', value: 'star'},
              {code: '5', value: 'FI-Vapaa'},
              {code: '9', value: 'FENNI<KEEP>'}
            ]
          }
        ];

      }

      return [];

    }


    function generate511() {


      if (getValue('NotificationType') !== 'E07' || !getValue('PersonName')) {
        return [];
      }

      const theData = getValues('DescriptiveDetail', 'Contributor').filter(filter);
      const dataMapped = theData.map(makeFields);
      return dataMapped;

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

    }


    function generate540() {
      // Field added if NotificationType = 03 with legal deposit
      if (getValue('NotificationType') === '03' && legalDeposit.true === 'true') {

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

    function generate594() {
      //  Field is left out if NotificationType = 03 with legal deposit
      //  If NotificationType = 01 or 02 : ENNAKKOTIETO / KIRJAVÄLITYS  (|a)
      //  If NotificationType = 03 without legal deposit: TARKISTETTU ENNAKKOTIETO / KIRJAVÄLITYS  (|a)

      if (getValue('NotificationType') === '03' && legalDeposit.true === 'true') {
        return [];
      }

      // ... no need to ignore so let's go on ->
      if (getValue('NotificationType') === '01' || getValue('NotificationType') === '02') {
        //  If NotificationType = 01 or 02 : ENNAKKOTIETO / KIRJAVÄLITYS  (|a)
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


      if (getValue('NotificationType') === '03' && legalDeposit.true !== 'true') {
        //  If NotificationType = 03 without legal deposit: TARKISTETTU ENNAKKOTIETO / KIRJAVÄLITYS  (|a)
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

      return [];
    }


    function generate653() {
      // Added only if SubjectSchemeIdentifier = 20, 64, 71 or 72
      // A| <- SubjectHeadingText
      const SubScheIde = getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier');

      if (SubScheIde) {
        const theData = getValues('DescriptiveDetail', 'Subject').filter(filter);
        const dataMapped = theData.map(makeRows);
        return dataMapped;
      }

      return [];

      function makeRows(element) {

        return {
          tag: '653',
          subfields: [{code: 'a', value: element.SubjectHeadingText[0]}]
        };
      }

      function filter({SubjectSchemeIdentifier}) {
        return ['20', '64', '71', '72'].includes(SubjectSchemeIdentifier?.[0]);
      }

    }


    function generate655() {
      // Make always when there is form = AJ & formDetail = A103

      if (getValue('DescriptiveDetail', 'ProductFormDetail') &&
        getValue('DescriptiveDetail', 'ProductForm')) {

        const form = getValue('DescriptiveDetail', 'ProductForm');
        const formDetail = getValue('DescriptiveDetail', 'ProductFormDetail');

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
            },
            {
              tag: '655',
              ind2: '7',
              subfields: [
                {code: 'a', value: 'e-äänikirjat'},
                {code: '2', value: 'slm/fin'},
                {code: '0', value: 'http://urn.fi/URN:NBN:fi:au:slm:s1204'},
                {code: '9', value: 'FENNI<KEEP>'}
              ]
            }
          ];
        }

        return [];
      }


    }


    function generate700() {

      const contribrole = getValue('DescriptiveDetail', 'Contributor', 'ContributorRole');

      if (contribrole) {
        const theData = getValues('DescriptiveDetail', 'Contributor').filter(filter);
        // Console.log('   QQQ   700      theData: ', theData);
        const dataMapped = theData.map(makeRows);
        return dataMapped;
      }
      return [];

      function makeRows(element) {
        return {
          tag: '700',
          subfields: [{code: 'a', value: changeValues(element.ContributorRole[0])}]
        };
      }

      function filter({ContributorRole}) {
        return ['B06', 'E07', 'A12', 'B01'].includes(ContributorRole?.[0]);
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
      // Field added    if NotificationType = 03 with legal deposit
      // WAITS FOR:  URN of legal deposit

      if (getValue('NotificationType') === '03' && legalDeposit.true === 'true') {
        // Console.log('   856   Now it is NotificationType 03 & legalDeposit true -> MAKE FIELD 856!');

        return [
          {
            tag: '856',
            ind1: '4',
            ind2: '0',
            subfields: [
              {code: 'u', value: 'URN of legal deposit XXXXXXXXXX under construction'},
              {code: 'z', value: 'Käytettävissä vapaakappalekirjastoissa'},
              {code: '5', value: 'FI-Vapaa'}
            ]
          }
        ];
      }


      return [];
    }


    function generate006() {
      const materialForm = isAudio || isText ? 'm' : '|';
      const itemForm = isAudio || isText ? 'o' : '|';
      const fileType = generateFileType();

      return [
        {
          tag: '006', value: `${materialForm}|||||${itemForm}||${fileType}||||||||`
        }
      ];

      function generateFileType() {
        if (isAudio) {
          return 'h';
        }

        if (isText) {
          return 'd';
        }

        return '|';
      }
    }

    function generate007() {
      if (isAudio) {
        return [
          {tag: '007', value: 'sr|uunnnnnuneu'},
          {tag: '007', value: 'cr|nnannnuuuuu'}
        ];
      }

      if (isText) {
        return [{tag: '007', value: 'cr||||||||||||'}];
      }

      return [];
    }

    function generate264() {
      const publisher = getValue('PublishingDetail', 'Publisher', 'PublisherName');

      if (publisher) {
        const publishingDate = getValue('PublishingDetail', 'PublishingDate', 'Date');

        if (publishingDate) {
          return {
            tag: '264', ind2: '1',
            subfields: [
              {code: 'b', value: publisher},
              {code: 'c', value: publishingDate}
            ]
          };
        }

        return {
          tag: '264', ind2: '1',
          subfields: [{code: 'b', value: publisher}]
        };
      }

      return [];
    }


    function generate884() {

      const supplier = dataSource; // = getSource()

      return [
        {
          tag: '884',
          subfields: [
            {code: 'a', value: 'ONIX3 to MARC transformation'},
            {code: 'g', value: moment().format('YYYYMMDD')},
            {code: 'k', value: sources[supplier]},
            {code: 'q', value: 'FI-NL'}
          ]
        }
      ];

    }


    function generate008() {
      const date = moment().format('YYMMDD');
      const language = generateLanguage();
      const publicationCountry = generatePublicationCountry();
      const publishingYear = generatePublishingYear();
      const subjectSchemeName = generateSubjectSchemeName();
      const targetAudience = generateTargetAudience();
      const value = `${date}s${publishingYear}    ${publicationCountry} ||||${targetAudience}o|||||||||${subjectSchemeName}|${language}||`;

      return [{tag: '008', value}];

      function generateLanguage() {
        return getLanguageRole() === '01' ? getLanguage() : '|||';
      }

      function generatePublicationCountry() {
        const publicationCountry = getValue('PublishingDetail', 'CountryOfPublication');
        return publicationCountry ? publicationCountry.slice(0, 2).toLowerCase() : 'xx';
      }

      function generatePublishingYear() {
        const publishingDate = getValue('PublishingDetail', 'PublishingDate', 'Date');
        return publishingDate ? publishingDate.slice(0, 4) : '    ';
      }

      function generateSubjectSchemeName() { // Ns. 008/A

        const CheckSubjectSchemeName = getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeName');
        const CheckSubjectCode = getValue('DescriptiveDetail', 'Subject', 'SubjectCode');

        if (CheckSubjectSchemeName && CheckSubjectCode) {

          if (CheckSubjectSchemeName === 'Kirjavälityksen tuoteryhmä' && CheckSubjectCode === '03' && dataSource === 'Kirjavälitys Oy') {

            return '0';
          }

          return '|';
        }

        return '|'; // Basic value
      }


      function generateTargetAudience() { // Ns. 008/B & C
        // Position 22 = target audience on MARC

        const CheckEditionType = getValue('DescriptiveDetail', 'EditionType');
        const CheckSubjectSchemeIdentifier = getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier');
        const CheckSubjectCode = getValue('DescriptiveDetail', 'Subject', 'SubjectCode');


        if (CheckSubjectSchemeIdentifier && CheckSubjectCode && CheckEditionType && dataSource === 'Kirjavälitys Oy') {


          if (CheckSubjectSchemeIdentifier === '73' && ((CheckSubjectCode === 'L' || CheckSubjectCode === 'N') && CheckEditionType !== 'SMP')) {

            return 'j';
          }


          if (CheckEditionType === 'SMP' && dataSource === 'Kirjavälitys Oy') {

            return 'f';
          }

          return '|';
        }


        return '|'; // Basic value
      }


    }


    function generate520() {
      const summary = getSummary();
      const textType = getValue('CollateralDetail', 'TextContent', 'TextType');

      return summary && textType === '03' ? [
        {
          tag: '520', subfields: [{code: 'a', value: summary}]
        }
      ] : [];
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

    function generate040() {
      return [
        {
          tag: '040',
          subfields: [
            {code: 'a', value: 'FI-KV'},
            {code: 'b', value: getLanguage()},
            {code: 'e', value: 'rda'},
            {code: 'd', value: 'FI-NL'}
          ]
        }
      ];
    }

    function generate041() {

      if (getValue('DescriptiveDetail', 'ProductForm')) {
        const form = getValue('DescriptiveDetail', 'ProductForm');

        if (['EB', 'EC', 'ED'].includes(form)) {
          return getLanguageRole() === '01' ? [
            {
              tag: '041', subfields: [{code: 'a', value: getLanguage()}]
            }
          ] : [];
        }


        if (form === 'AJ') {
          return getLanguageRole() === '01' ? [
            {
              tag: '041', subfields: [{code: 'd', value: getLanguage()}]
            }
          ] : [];
        }


        return getLanguageRole() === '01' ? [
          {
            tag: '041', subfields: [{code: 'a', value: getLanguage()}]
          }
        ] : [];

      }

      return [];
    }


    function generate084a() {
      // A-case:  SubjectCode Field added if if SubjectSchemeIdentifier = 66

      if (getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier')) {
        const theData = getValues('DescriptiveDetail', 'Subject').filter(filter);
        const dataMapped = theData.map(getSSI);
        return dataMapped;
      }

      function getSSI(element) {

        return {
          tag: '084',
          subfields: [
            {code: 'a', value: element.SubjectCode[0]},
            {code: '2', value: 'Ykl'}
          ]
        };
      }

      function filter({SubjectSchemeIdentifier}) {
        return ['66'].includes(SubjectSchemeIdentifier?.[0]);
      }


      return [];
    }


    function generate084b() {
      // B-case:  SubjectHeadingText Field added if SubjectSchemeIdentifier = 80
      if (getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier')) {
        const theData = getValues('DescriptiveDetail', 'Subject').filter(filter);
        const dataMapped = theData.map(getSSI);
        return dataMapped;
      }

      function getSSI(element) {

        return {
          tag: '084',
          ind1: '9',
          subfields: [
            {code: 'a', value: element.SubjectHeadingText[0]},
            {code: '2', value: 'Ykl'}
          ]
        };
      }

      function filter({SubjectSchemeIdentifier}) {
        return ['80'].includes(SubjectSchemeIdentifier?.[0]);
      }

      return [];
    }

    function generateAuthors() {
      return authors.map(({name, role}, index) => {
        if (index === 0) {
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
            {code: 'e', value: role}
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

      if (['EB', 'ED'].includes(form) && ['E101', 'E107'].includes(formDetail)) {
        return {isText: true, textFormat: formDetail === 'E101' ? 'EPUB' : 'PDF'};
      }

    }


    try {
      throw new Error('Unidentified: not audio, not text');
    } catch (e) {

      logger.log('debug', 'Exception!');

      if (e instanceof NotSupportedError) {
        return e;
      }

    }


  }


  function getLanguageRole() {
    return getValue('DescriptiveDetail', 'Language', 'LanguageRole');
  }

  function getSummary() {
    const value = getValue('CollateralDetail', 'TextContent', 'Text');
    return typeof value === 'object' ? value._ : value;
  }

  function getLanguage() {
    const summary = getSummary();

    if (summary && (/Huom\. kirja on englanninkielinen/u).test(summary)) {
      return 'eng';
    }

    return getValue('DescriptiveDetail', 'Language', 'LanguageCode');
  }

  function isNotSupported() {
    return getValues('ProductIdentifier').some(({ProductIDType: [type], IDValue: [value]}) => type === '02' && (/^(?<def>951|952)/u).test(value) === false);
  }


  function getSource() {
    // Check first suppliername then sender name

    // SupplierName --->
    if (getValue('Product', 'ProductSupply', 'SupplyDetail', 'Supplier', 'SupplierName')) {
      const gvalue = getValue('Product', 'ProductSupply', 'SupplyDetail', 'Supplier', 'SupplierName');
      return gvalue;
    }
    // SupplierName <---


    // SenderName --->
    if (getValue('Product', 'ProductSupply', 'SupplyDetail', 'Supplier', 'SenderName')) {
      const gvalue = getValue('Product', 'ProductSupply', 'SupplyDetail', 'Supplier', 'SenderName');
      return gvalue;
    }
    // SenderName <---


    return sender.name;

  }


};


