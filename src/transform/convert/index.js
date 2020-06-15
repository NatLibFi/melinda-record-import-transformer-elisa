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

export default ({sources, moment = momentOrig}) => ({Product: record}) => {
  const {getValue, getValues} = createValueInterface(record);

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
      generate520(),
      generate040(),
      generate041(),
      generate884(),
      generate264(),
      generate336(),
      generate347(),
      generate500(),
      generate655(),
      generateStandardIdentifiers(),
      generateTitles(record, authors),
      generateAuthors(),
      generateStaticFields()
    ].flat();

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

    function generate500() {
      return isAudio ? [
        {
          tag: '500', subfields: [
            {code: 'a', value: 'Äänikirja.'},
            {code: '9', value: 'FENNI<KEEP>'}
          ]
        }
      ] : [];
    }

    function generate655() {
      return isAudio ? [
        {
          tag: '655',
          ind2: '7',
          subfields: [
            {code: 'a', value: 'äänikirjat'},
            {code: '2', value: 'slm/fin'},
            {code: '0', value: 'http://urn.fi/URN:NBN:fi:au:slm:s579'}
          ]
        }
      ] : [];
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
      const supplier = getValue('ProductSupply', 'SupplyDetail', 'Supplier', 'SupplierName');

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
      const value = `${date}s${publishingYear}    ${publicationCountry} |||||o|||||||||||${language}||`;

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
            {code: 'b', value: getLanguage()},
            {code: 'e', value: 'rda'},
            {code: 'd', value: 'FI-NL'}
          ]
        }
      ];
    }

    function generate041() {
      return getLanguageRole() === '01' ? [
        {
          tag: '041', subfields: [{code: 'a', value: getLanguage()}]
        }
      ] : [];
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
    const form = getValue('DescriptiveDetail', 'ProductForm');
    const formDetail = getValue('DescriptiveDetail', 'ProductFormDetail');

    if (form === 'AJ' && formDetail === 'A103') {
      return {isAudio: true};
    }

    if (['EB', 'ED'].includes(form) && ['E101', 'E107'].includes(formDetail)) {
      return {isText: true, textFormat: formDetail === 'E101' ? 'EPUB' : 'PDF'};
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
};
