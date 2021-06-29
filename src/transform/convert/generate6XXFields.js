import {createValueInterface} from './common';
import {createLogger} from '@natlibfi/melinda-backend-commons';

const logger = createLogger();

export function generate600(record, dataSource, source4Value) {

  const {getValues} = createValueInterface(record);

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

export function generate650(record, dataSource, source4Value) {

  const {getValue, getValues} = createValueInterface(record);

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

export function generate653(record, dataSource, source4Value) {

  const {getValue, getValues} = createValueInterface(record);

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

export function generate655(record, dataSource, source4Value) {
  // Make always when there is form = AJ & formDetail = A103

  const {getValue} = createValueInterface(record);

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

