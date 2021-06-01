import {createValueInterface} from './common';


export function generate500(record, dataSource, source4Value, isLegalDeposit) {

  const {getValue} = createValueInterface(record);

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


export function generate506(record, dataSource, source4Value, isLegalDeposit) {

  const {getValue} = createValueInterface(record);

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


export function generate511(record) {

  const {getValue, getValues} = createValueInterface(record);

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


export function generate540(record, dataSource, source4Value, isLegalDeposit) {

  const {getValue} = createValueInterface(record);

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


export function generate594(record, dataSource, source4Value, isLegalDeposit) {

  const {getValue} = createValueInterface(record);

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
