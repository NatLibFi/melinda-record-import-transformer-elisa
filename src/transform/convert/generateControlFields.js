
import {createValueInterface} from './common';


export function generate006({isAudio, isText}) {
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


export function generate007({isAudio, isText}) {
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


export function generate008({moment, record, dataSource, source4Value}) {

  const {getValue} = createValueInterface(record);

  const date = moment().format('YYMMDD');
  const language = generateLanguage();
  const publicationCountry = generatePublicationCountry();
  const publishingYear = generatePublishingYear();
  const subjectSchemeName = generateSubjectSchemeName();
  const targetAudience = generateTargetAudience();
  const value = `${date}s${publishingYear}    ${publicationCountry} ||||${targetAudience}o|||||||||${subjectSchemeName}|${language}||`;

  return [{tag: '008', value}];

  function generateLanguage() {
    return getLanguageRole(record) === '01' ? getLanguage(record) : '|||';
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
      if (CheckSubjectSchemeName === 'Kirjavälityksen tuoteryhmä' && CheckSubjectCode === '03' && dataSource === source4Value) {
        return '0';
      }

      return '|';
    }

    return '|'; // Basic value
  }


  function generateTargetAudience() { // Ns. 008/B & C
    // Position 22 = target audience on MARC

    const CheckEditionType = getValue('DescriptiveDetail', 'EditionType');
    const CheckSubjectSchemeIdentifier = getValue('DescriptiveDetail', 'SubjectSchemeIdentifier');
    const CheckSubjectCode = getValue('DescriptiveDetail', 'SubjectCode');

    if (CheckSubjectSchemeIdentifier && CheckSubjectCode && CheckEditionType && CheckEditionType && dataSource && dataSource === source4Value) {
      if (CheckSubjectSchemeIdentifier === '73' && ((CheckSubjectCode === 'L' || CheckSubjectCode === 'N') && CheckEditionType !== 'SMP')) {
        return 'j';
      }

      if (CheckEditionType === 'SMP' && dataSource === source4Value) {
        return 'f';
      }

      return '|';
    }


    return '|'; // Basic value
  }

}

function getLanguageRole(record) { // For generate008
  const {getValue} = createValueInterface(record);
  return getValue('DescriptiveDetail', 'Language', 'LanguageRole');
}


function getLanguage(record) {
  const summary = getSummary(record);

  if (summary && (/Huom\. kirja on englanninkielinen/u).test(summary)) {
    return 'eng';
  }

  const {getValue} = createValueInterface(record);
  return getValue('DescriptiveDetail', 'Language', 'LanguageCode');
}


function getSummary(record) {
  const {getValue} = createValueInterface(record);
  const value = getValue('CollateralDetail', 'TextContent', 'Text');
  return typeof value === 'object' ? value._ : value;
}


