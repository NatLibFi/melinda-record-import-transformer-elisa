import {createValueInterface} from './common';
import ISBN from 'isbn3'; // for 856
import {createLogger} from '@natlibfi/melinda-backend-commons';

const logger = createLogger();

export function generate856(record, dataSource, source4Value, isLegalDeposit) {

  const {getValue, getValues} = createValueInterface(record);

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

  // ---------->
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
  // <----------
}

export function generate884(sources, dataSource, moment) {

  const tellSource = sourceNames();

  return [
    {
      tag: '884',
      subfields: [
        {code: 'a', value: 'ONIX3 to MARC transformation'},
        {code: 'g', value: moment().format('YYYYMMDD')},
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
