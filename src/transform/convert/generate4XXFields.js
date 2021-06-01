import {createValueInterface} from './common';


export function generate490(record) {

  const {getValue, getValues} = createValueInterface(record);

  const gotTitleElementLevel = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'TitleElementLevel');
  const gotCollectionType = getValue('DescriptiveDetail', 'Collection', 'CollectionType');
  const gotCollectionIDtype = getValue('DescriptiveDetail', 'Collection', 'CollectionIdentifier', 'CollectionIdtype');
  const gotTitleText = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'TitleText');
  const gotIDValue = getValue('DescriptiveDetail', 'Collection', 'CollectionIdentifier', 'IDValue');
  const gotPartNumber = getValue('Product', 'DescriptiveDetail', 'Collection', 'TitleDetail', 'TitleElement', 'PartNumber');

  if (!gotCollectionType && !gotTitleElementLevel && !gotCollectionIDtype) {
    return [];
  }

  if (!gotTitleText && !gotPartNumber && !gotIDValue) {
    return [];
  }

  const theResult = getValues('DescriptiveDetail', 'Collection').map(makeFields);

  if (theResult === undefined || theResult.length === 0) {
    return [];
  }

  const filtered = theResult.filter((v) => v !== undefined);

  return filtered;


  function makeFields(element) {
    const subfields = generateSubfields();

    function generateSubfields() {
      const fieldA = buildFieldA();
      const fieldX = buildFieldX();
      const fieldV = buildFieldV();
      const aplusx = fieldA.concat(fieldX);

      return aplusx.concat(fieldV);
    }

    if (subfields.length > 0 && subfields !== undefined) {
      return {tag: '490', ind1: '0', subfields};
    }


    function buildFieldA() { // Requires TitleText
      if (gotTitleElementLevel === undefined || gotCollectionType === undefined || gotTitleText === undefined) {
        return [];
      }

      if (element.CollectionType[0] === undefined || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] === undefined) {
        return [];
      }

      if (element.CollectionType[0] !== '10' || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] !== '02') {
        return [];
      }

      if (element.TitleDetail[0].TitleElement[0].TitleText[0] === undefined) {
        return [];
      }

      // ---> 13.11.2020
      // Välilyöntiä ja puolipistettä ei tarvita [ a:lle] silloin,
      // kun tietueella ei ole lainakaan osakenttää ‡v    ->
      const checkfieldV = buildFieldV(); // check if there is v

      if (checkfieldV.length === 0) { // eslint-disable-line functional/no-conditional-statement
        return [{code: 'a', value: `${element.TitleDetail[0].TitleElement[0].TitleText[0]}`}]; // plain
      }
      // <---


      return [{code: 'a', value: `${element.TitleDetail[0].TitleElement[0].TitleText[0]} ;`}];
    }

    function buildFieldX() { // Requires IDValue
      if (gotCollectionIDtype === undefined || gotIDValue === undefined) {
        return [];
      }

      if (element.CollectionIdentifier[0].CollectionIdtype[0] === undefined || element.CollectionIdentifier[0].IDValue[0] === undefined) {
        return [];
      }

      if (element.CollectionIdentifier[0].CollectionIdtype[0] !== '02') {
        return [];
      }

      return [{code: 'x', value: `${element.CollectionIdentifier[0].IDValue[0]}`}];
    }


    function buildFieldV() { // Requires PartNumber
      if (gotTitleElementLevel === undefined || gotCollectionType === undefined || gotPartNumber === undefined) {
        return [];
      }

      if (element.CollectionType[0] === undefined || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] === undefined) {
        return [];
      }

      if (element.CollectionType[0] !== '10' || element.TitleDetail[0].TitleElement[0].TitleElementLevel[0] !== '02') {
        return [];
      }

      if (element.TitleDetail[0].TitleElement[0].PartNumber === undefined) { // Prev: PartNumber[0]
        return [];
      }

      return [{code: 'v', value: `${element.TitleDetail[0].TitleElement[0].PartNumber[0]}`}];
    }

  }

}
