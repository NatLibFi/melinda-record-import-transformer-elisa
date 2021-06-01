import {createValueInterface} from './common';


export function generate974(record, dataSource, source4Value) {
  // Get IDValue from   Product/RelatedMaterial/RelatedWork/WorkIdentifier/IDValue

  const {getValue, getValues} = createValueInterface(record);

  const getIdvalue = getValue('RelatedMaterial', 'RelatedWork', 'WorkIdentifier', 'IDValue');
  const gids = getValues('RelatedMaterial', 'RelatedWork', 'WorkIdentifier');

  if (getIdvalue && gids && dataSource === source4Value) {
    return gids.map(doEdits);
  }

  function doEdits(element) {
    return {
      tag: '974',
      subfields: [
        {code: 'a', value: 'KV'},
        {code: 'b', value: element.IDValue[0]},
        {code: '5', value: 'FENNI'}
      ]
    };
  }
  return [];
}
