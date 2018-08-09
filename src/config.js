/* eslint-disable new-cap */
import {IsbnIssn, ItemLanguage} from '@natlibfi/marc-record-validators-melinda';

export default {
	validators: [
		IsbnIssn(),
		ItemLanguage(/^520$/)
	]
};
