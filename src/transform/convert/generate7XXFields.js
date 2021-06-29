import {createValueInterface} from './common';

export function generate700(record) {

  const {getValues} = createValueInterface(record);

  const contribrole = getValues('DescriptiveDetail', 'Contributor', 'ContributorRole');
  const personNameInverted = getValues('DescriptiveDetail', 'Contributor', 'PersonNameInverted');

  if (contribrole && personNameInverted) {
    return getValues('DescriptiveDetail', 'Contributor').filter(filter).map(makeRows);
  }

  return [];

  function makeRows(element) {

    if (element.NameIdentifier !== undefined) {
      return {
        tag: '700',
        ind1: '1',
        ind2: ' ',
        subfields: [
          {code: 'a', value: getName(element)},
          {code: 'e', value: changeValues(element.ContributorRole[0])},
          {code: '0', value: buildIsni()}
        ]
      };
    }

    return {
      tag: '700',
      ind1: '1',
      ind2: ' ',
      subfields: [
        {code: 'a', value: getName(element)},
        {code: 'e', value: changeValues(element.ContributorRole[0])}
      ]
    };

    function getName() {
      if (personNameInverted !== undefined && element.PersonNameInverted !== undefined) {
        return element.PersonNameInverted[0];
      }
      return 'Unnamed person';
    }

    function buildIsni() {
      return `https://isni.org/isni/${element.NameIdentifier[0].IDValue}`;
    }

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
