import {createValueInterface} from './common';

export function generate300(record) {

  const {getValue} = createValueInterface(record);
  const extType = getValue('DescriptiveDetail', 'Extent', 'ExtentType');
  const extValue = getValue('DescriptiveDetail', 'Extent', 'ExtentValue');
  const extUnit = getValue('DescriptiveDetail', 'Extent', 'ExtentUnit');

  if (extValue && extType && extUnit) {

    const timeHours = getHours();
    const timeSec = getSeconds();
    const timeMins = getMinutes();

    // I A :  if ExtentType = 09 and ExtentUnit = 15 ( 15 -> HHHMM i.e. 5 digits)
    if (extType === '09' && extUnit === '15') {

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

  function getMinutes() {

    if (extValue.slice(3, 5).replace(/0/gu, '') === '') { // eslint-disable-line functional/no-conditional-statement
      return '';
    }
    return `${extValue.slice(3, 5).replace(/0/gu, '')} min`;
  }
}

export function generate336(isAudio, isText) {

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


export function generate344(record) { // Add/moved 23.10.2020 (from generate-static)
  const {getValue} = createValueInterface(record);

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

export function generate347(isAudio, isText, textFormat) {

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
