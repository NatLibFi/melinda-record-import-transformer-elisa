
import {createValueInterface} from './common';

export function generate040(dataSource, source4Value) {

  if (dataSource === source4Value) {
    return [
      {
        tag: '040',
        subfields: [
          {code: 'a', value: 'FI-KV'},
          {code: 'b', value: 'fin'}, // Previously: getLanguage() ; Now this should be 'kuvailun kieli' = fin
          {code: 'e', value: 'rda'},
          {code: 'd', value: 'FI-NL'}
        ]
      }
    ];
  }

  return [
    {
      tag: '040',
      subfields: [
        {code: 'b', value: 'fin'}, // Previously getLanguage() ; this should be 'kuvailun kieli' = fin
        {code: 'e', value: 'rda'},
        {code: 'd', value: 'FI-NL'}
      ]
    }
  ];
}


export function generate041(record) {

  const {getValue} = createValueInterface(record);
  const form = getValue('DescriptiveDetail', 'ProductForm');
  const langCode = getValue('DescriptiveDetail', 'Language', 'LanguageCode');

  if (form !== undefined && langCode !== undefined) {

    if (['EB', 'EC', 'ED'].includes(form)) {
      return [
        {
          tag: '041',
          subfields: [{code: 'a', value: langCode}]
        }
      ];
    }


    if (form === 'AJ') {
      return [
        {
          tag: '041',
          subfields: [{code: 'd', value: langCode}]
        }
      ];
    }

    return [];
  }

  return [];
}

export function generate084a(record, dataSource, source4Value) {

  const {getValue, getValues} = createValueInterface(record);

  // A-case:  SubjectCode Field added if  SubjectSchemeIdentifier = 66
  if (getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier') && dataSource === source4Value) {
    return getValues('DescriptiveDetail', 'Subject').filter(filter).map(getSSI);
  }

  function getSSI(element) {
    return {
      tag: '084',
      subfields: [
        {code: 'a', value: element.SubjectCode[0]},
        {code: '2', value: 'ykl'}
      ]
    };
  }

  function filter({SubjectSchemeIdentifier}) {
    return ['66'].includes(SubjectSchemeIdentifier?.[0]);
  }

  return [];
}


export function generate084b(record, dataSource, source4Value) {
  // B-case:  SubjectHeadingText Field added if SubjectSchemeIdentifier = 80
  const {getValue, getValues} = createValueInterface(record);

  if (getValue('DescriptiveDetail', 'Subject', 'SubjectSchemeIdentifier') && dataSource === source4Value) {
    return getValues('DescriptiveDetail', 'Subject').filter(filter).map(getSSI);
  }

  function getSSI(element) {
    return {
      tag: '084',
      ind1: '9',
      subfields: [
        {code: 'a', value: element.SubjectHeadingText[0]},
        {code: '2', value: 'ykl'}
      ]
    };
  }

  function filter({SubjectSchemeIdentifier}) {
    return ['80'].includes(SubjectSchemeIdentifier?.[0]);
  }

  return [];
}
