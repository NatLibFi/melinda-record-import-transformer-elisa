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

import {createValueInterface} from './common';

export default (record, authors) => {
  // Const {getValue} = createValueInterface(record); // ORIG
  const {getValue} = createValueInterface(record); // GetValues

  const titleType = getValue('DescriptiveDetail', 'TitleDetail', 'TitleType');
  const title = getValue('DescriptiveDetail', 'TitleDetail', 'TitleElement', 'TitleText');

  if (['00', '02', '01', '03'].includes(titleType)) {
    if (titleType === '02') {
      return [
        generate245(),
        {
          tag: '222', ind2: '0',
          subfields: [{code: 'x', value: title}]
        }
      ];
    }

    return [generate245()];
  }

  if (['04', '05', '10', '11', '12', '13'].includes(titleType)) {
    return [generate246()];
  }

  if (titleType === '06') {
    return [
      {
        tag: '242', ind1: '1',
        subfields: [{code: 'a', value: title}]
      }
    ];
  }

  if (titleType === '07') {
    return [generate245(), generate246()];
  }

  if (titleType === '08') {
    return [
      {
        tag: '257', ind1: '1', ind2: '0',
        subfields: [{code: 'a', value: title}]
      }
    ];
  }

  return [];

  function generate245() {
    const ind1 = generateInd1();
    const {mainTitle, remainder} = formatTitle();

    // Add 30.10.2020 ( subtitle check )->
    const subTitle = getValue('DescriptiveDetail', 'TitleDetail', 'TitleElement', 'Subtitle');

    if (subTitle) {
      return {
        tag: '245', ind1, ind2: '0',
        subfields: [
          {code: 'a', value: `${title} :`},
          {code: 'b', value: subTitle}
        ]
      };
    }
    // <---


    if (remainder) {
      return {
        tag: '245', ind1, ind2: '0',
        subfields: [
          {code: 'a', value: `${mainTitle} :`},
          {code: 'b', value: remainder}
        ]
      };
    }

    return {
      tag: '245', ind1, ind2: '0',
      subfields: [{code: 'a', value: mainTitle}]
    };

    function generateInd1() {
      //  --->

      // Console.log('   QQQ g245 /   authors:', authors);
      // Console.log('   QQQ g245 /   authors.length:', authors.length);

      if (authors.length === 1) { // eslint-disable-line functional/no-conditional-statement
        // Console.log('   QQQ g245 / in if-arvo:  ind1: 1');
        return '1';
      }

      if (authors.length === 0) { // eslint-disable-line functional/no-conditional-statement
        // Console.log('   QQQ g245 / in if-arvo: ind1: 0');
        return '0';
      }

      /*
      Function filter({ContributorRole}) {
        return ['A01'].includes(ContributorRole);
      }
*/

      return hasMultipleAuthors() ? '0' : '1';

      function hasMultipleAuthors() {
        return authors.some(({name}) => (/, Useita/iu).test(name));
      }

    } // <-- generateInd

    function formatTitle() {
      const lengths = calculateLengths();

      if (lengths) {
        const {mainLength, remainderLength} = lengths;

        return {
          mainTitle: title.slice(0, mainLength),
          remainder: title.slice(remainderLength).trimEnd()
        };
      }

      return {mainTitle: title};

      function calculateLengths() {
        const firstResult = (/\s+[\u2013\u2014-]\s+|:\s+|[^.]\.[^.]/u).exec(title);

        if (firstResult) {
          const [matched] = firstResult;
          const {index} = firstResult;

          return {
            mainLength: index,
            remainderLength: index + matched.length
          };
        }

        const secondResult = (/!+|\?+/u).exec(title);

        if (secondResult) {
          const [matched] = secondResult;
          const {index} = secondResult;

          return {
            mainLength: index + 1,
            remainderLength: index + 1 + matched.length
          };
        }
      }
    }
  }


  function generate246() {
    const {ind1, ind2} = generateIndicators();

    return {
      tag: '246', ind1, ind2,
      subfields: [{code: 'a', value: title}]
    };

    function generateIndicators() {
      if (titleType === '04') {
        return {ind1: '1', ind2: '3'};
      }

      if (['05', '07'].includes(titleType)) {
        return {ind1: '3', ind2: '0'};
      }

      if (titleType === '10') {
        return {ind1: '1', ind2: '8'};
      }

      if (titleType === '11') {
        return {ind1: '1', ind2: '4'};
      }

      if (['12', '13'].includes(titleType)) {
        return {ind1: '1', ind2: ' '};
      }

      return {ind1: ' ', ind2: ' '};
    }
  }
};
