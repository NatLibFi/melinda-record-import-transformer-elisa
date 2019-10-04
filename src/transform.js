/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* ONIX record transformer for the Melinda record batch import system
*
* Copyright (C) 2019 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-import-transformer-onix
*
* melinda-record-import-transformer-onix program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-import-transformer-onix is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import fetch from 'node-fetch';
import moment from 'moment';
import saxStream from 'sax-stream';
import {MarcRecord} from '@natlibfi/marc-record';
import {Utils} from '@natlibfi/melinda-commons';

const ENCODING_LEVEL_MAP = {
	'01': '3',
	'02': '5',
	'03': '8',
	'04': '8',
	'05': 'J',
	'08': '8',
	'09': '8'
};
const ISIL_MAP = {
	'Elisa Kirja': 'FI-Elisa',
	'Ellibs Oy': 'FI-Ellibs',
	'Kirjavälitys Oy': 'FI-KV'
};

const URN_GENERATOR_URL = 'http://generator.urn.fi/cgi-bin/urn_generator.cgi?type=nbn';

export default async stream => {
	const {createLogger} = Utils;
	const logger = createLogger();

	return new Promise((resolve, reject) => {
		const records = [];
		const xmlStream = stream.pipe(saxStream({
			strict: true, tag: 'Product'
		}));

		xmlStream.on('error', err => {
			reject(err);
		});
		xmlStream.on('end', () => {
			resolve(records);
		});
		xmlStream.on('data', node => {
			if (dropRecord(node)) {
				logger.log('info', `dropped record with recordReference: ${node.children.RecordReference.value}`);
			} else {
				records.push(transformToMarc(node));
			}
		});
	});

	function transformToMarc(node) {
		const record = new MarcRecord();
		const languageRole = getNodeValue(['DescriptiveDetail', 'Language', 'LanguageRole']);
		const recordReference = getNodeValue('RecordReference');
		const notificationType = getNodeValue('NotificationType');
		const supplier = getNodeValue([
			'ProductSupply',
			'SupplyDetail',
			'Supplier',
			'SupplierName'
		]);

		const {isbn, gtin, proprietaryId} = parseProductIdentifiers();
		const {textType, summary} = parseCollateralDetail();
		const {form, formDetail} = parseProductForm();
		const {titleType, titleLevel, title} = parseTitleDetail();
		const contributors = parseContributors();
		const {publisher, publishingDate, publishingStatus, publicationCountry} = parsePublishingDetail();

		const language = getLanguage();
		const isil = getISIL();

		logger.log('debug', `languageRole:${languageRole}`);
		logger.log('debug', `recordReference:${recordReference}`);
		logger.log('debug', `notificationType:${notificationType}`);
		logger.log('debug', `supplier:${supplier}`);
		logger.log('debug', `isbn:${isbn}, gtin:${gtin}, proprietaryId:${proprietaryId}`);
		logger.log('debug', `textType:${textType}`);
		logger.log('debug', `form:${form}, formDetail:${formDetail}`);
		logger.log('debug', `titleType:${titleType}, titleLevel:${titleLevel}, title:${title}`);
		logger.log('debug', `contributors:${JSON.stringify(contributors)}`);
		logger.log('debug', `publisher:${publisher}, publishingDate:${publishingDate}, publishingStatus:${publishingStatus}, publicationCountry:${publicationCountry}`);
		logger.log('debug', `language:${language}`);
		logger.log('debug', `isil:${isil}`);
		logger.log('debug', `summary:${summary}`);

		record.insertField({tag: '003', value: isil});

		record.insertField(create006({0: 'm', 6: 'o', 9: 'h'}));
		record.insertField(create008());

		if (proprietaryId) {
			record.insertField({
				tag: '035',
				subfields: [
					{code: 'a', value: `(${isil})${proprietaryId}`}
				]
			});
		}

		record.insertField({
			tag: '037',
			ind1: '3',
			subfields: [
				{code: 'a', value: recordReference}
			]
		});

		record.insertField({
			tag: '300',
			subfields: [
				{code: 'a', value: '1 verkkoaineisto'}
			]
		});

		record.insertField({
			tag: '337',
			subfields: [
				{code: 'a', value: 'tietokonekäyttöinen'},
				{code: 'b', value: 'c'},
				{code: '2', value: 'rdamedia'}
			]
		});

		record.insertField({
			tag: '338',
			subfields: [
				{code: 'a', value: 'verkkoaineisto'},
				{code: 'b', value: 'cr'},
				{code: '2', value: 'rdacarrier'}
			]
		});

		record.insertField({
			tag: '344',
			subfields: [
				{code: 'a', value: 'digitaalinen'},
				{code: '2', value: 'rda'}
			]
		});

		/*
    	If (textType === '03' && summary) {
      		record.insertField({
        		tag: '520,',
        		subfields: [
          			{code: 'a', value: summary }
        		]
      		})
    	} */

		if (isbn) {
			record.insertField({
				tag: '020',
				subfields: [
					{code: 'a', value: isbn}
				]
			});
		} else if (gtin) {
			record.insertField({
				tag: '024',
				ind1: '3',
				subfields: [
					{code: 'a', value: gtin}
				]
			});
		}

		if (languageRole === '01') {
			update008({35: language[0], 36: language[1], 37: language[2]});

			record.insertField({
				tag: '041',
				subfields: [
					{code: 'a', value: language}
				]
			});
		}

		if (['00', '02', '01', '03'].includes(titleType)) {
			if (titleType === '02') {
				record.insertField({
					tag: '222',
					ind2: '0',
					subfields: [
						{code: 'x', value: title}
					]
				});
			}

			record.insertField(create245());
		} else if (['04', '05', '10', '11', '12', '13'].includes(titleType)) {
			record.insertField(create246());
		} else {
			switch (titleType) {
				case '06':
					record.insertField({
						tag: '242',
						ind1: '1',
						subfields: [
							{code: 'a', value: title}
						]
					});
					break;
				case '07':
					record.insertField(create245());
					record.insertField(create246());
					break;
				case '08':
					record.insertField({
						tag: '247',
						ind1: '1',
						ind2: '0',
						subfields: [
							{code: 'a', value: title}
						]
					});
					break;
				default:
					break;
			}
		}

		if (publisher) {
			const field = {
				tag: '264',
				ind2: '1',
				subfields: [
					{code: 'b', value: publisher}
				]
			};

			if (publishingDate) {
				field.subfields.push({code: 'c', value: publishingDate});
			}

			record.insertField(field);
		}

		handleContributors();

		if (form === 'AJ' && formDetail === 'A103') {
			handleAudio();
		} else if ((form === 'EB' || form === 'ED') && formDetail === 'E101') {
			handleText('EPUB');
		} else if ((form === 'EB' || form === 'ED') && formDetail === 'E107') {
			handleText('PDF');
		}

		record.insertField({
			tag: '040',
			subfields: [
				{code: 'a', value: isil},
				{code: 'b', value: language},
				{code: 'e', value: 'rda'},
				{code: 'd', value: 'FI-NL'}
			]
		});

		record.insertField({
			tag: '042',
			subfields: [
				{code: 'a', value: 'finb'}
			]
		});

		record.insertField({
			tag: 'LOW',
			subfields: [
				{code: 'a', value: 'FIKKA'}
			]
		});

		record.insertField({
			tag: '506',
			ind1: '1',
			subfields: [
				{code: 'a', value: 'Aineisto on käytettävissä vapaakappalekirjastoissa'},
				{code: 'f', value: 'Online access with authorization.'},
				{code: '2', value: 'star'},
				{code: '5', value: 'FI-Vapaa'},
				{code: '9', value: 'FENNI<KEEP>'}
			]
		});

		record.insertField({
			tag: '540',
			subfields: [
				{code: 'a', value: 'Aineisto on käytettävissä tutkimus- ja muihin tarkoituksiin;'},
				{code: 'b', value: 'Kansalliskirjasto;'},
				{code: 'c', value: 'Laki kulttuuriaineistojen tallettamisesta ja säilyttämisestä'},
				{code: 'u', value: 'http://www.finlex.fi/fi/laki/ajantasa/2007/20071433 '},
				{code: '5', value: 'FI-Vapaa'},
				{code: '9', value: 'FENNI<KEEP>'}
			]
		});

		(async () => {
			record.insertField({
				tag: '856',
				ind1: '4',
				ind2: '0',
				subfields: [
					{code: 'u', value: await createURN()},
					{code: 'z', value: 'Käytettävissä vapaakappalekirjastoissa'},
					{code: '5', value: 'FI-Vapaa'}
				]
			});
		})();

		record.insertField({
			tag: '884',
			subfields: [
				{code: 'a', value: 'ONIX3 to MARC transformation'},
				{code: 'g', value: moment().format('YYYYMMDD')},
				{code: 'k', value: isil},
				{code: 'q', value: 'FI-NL'}

			]
		});

		return record;

		function createURN() {
			if (isbn) {
				return Promise.resolve('http://urn.fi/URN:ISBN:' + isbn);
			}

			return fetch(URN_GENERATOR_URL)
				.then(res => res.text())
				.then(body => body);
		}

		function parseProductIdentifiers() {
			return getNodes('ProductIdentifier').reduce((acc, n) => {
				const value = getNodeValue('IDValue', n);

				switch (getNodeValue('ProductIDType', n)) {
					case '03':
						return Object.assign(acc, {gtin: value});
					case '01':
						return Object.assign(acc, {proprietaryId: value});
					case '15':
						return Object.assign(acc, {isbn: value});
					case '02':
						/* Prefer ISBN-13 */
						if ('isbn' in acc) {
							return acc;
						}

						return Object.assign(acc, {isbn: value});
					default:
						return acc;
				}
			}, {});
		}

		function parseCollateralDetail() {
			return {
				summary: getNodeValue(['CollateralDetail', 'TextContent', 'Text']),
				textType: getNodeValue([
					'CollateralDetail',
					'TextContent',
					'TextType'
				])
			};
		}

		function parseProductForm() {
			return {
				form: getNodeValue(['DescriptiveDetail', 'ProductForm']),
				formDetail: getNodeValue(['DescriptiveDetail', 'ProductFormDetail'])
			};
		}

		function parseTitleDetail() {
			return {
				titleType: getNodeValue([
					'DescriptiveDetail', 'TitleDetail', 'TitleType'
				]),
				title: getNodeValue([
					'DescriptiveDetail', 'TitleDetail', 'TitleElement', 'TitleText'
				]),
				titleLevel: getNodeValue([
					'DescriptiveDetail', 'TitleDetail', 'TitleElement', 'TitleElementLevel'
				])
			};
		}

		function parseContributors() {
			const list = getNodes(['DescriptiveDetail', 'Contributor'])
				.filter(n => n)
				.map(n => {
					return {
						name: getNodeValue('PersonNameInverted', n),
						role: getNodeValue('ContributorRole', n),
						sequence: getNodeValue('SequenceNumber', n)
					};
				})
				.filter(n => n.name);

			list.sort((a, b) => Number(a.sequence) - Number(b.sequence));
			return list;
		}

		function parsePublishingDetail() {
			return {
				publisher: getNodeValue([
					'PublishingDetail', 'Publisher', 'PublisherName'
				]),
				publishingDate: getNodeValue([
					'PublishingDetail', 'PublishingDate', 'Date'
				]),
				publishingStatus: getNodeValue([
					'PublishingDetail', 'PublishingStatus'
				]),
				publicationCountry: getNodeValue([
					'PublishingDetail', 'CountryOfPublication'
				])
			};
		}

		function create245() {
			const field = {tag: '245', ind1: '1', ind2: '0'};
			/* First searched pattern is [space][en dash|em dash|dash][space] */
			const results = [/\s+[\u2013\u2014-]\s+/.exec(title), /:\s+|\.+/.exec(title), /!+|\?+/.exec(title)];
			const slices = {start: '', end: ''};

			if (results[0]) {
				/* Space dash space found */
				slices.start = title.slice(0, results[0].index);
				slices.end = title.slice(results[0].index + results[0][0].length);
			} else if (results[1]) {
				/* . or : found */
				slices.start = title.slice(0, results[1].index);
				slices.end = title.slice(results[1].index + results[1][0].length);
			} else if (results[2]) {
				/* ? or ! found */
				slices.start = title.slice(0, results[2].index + 1);
				slices.end = title.slice(results[2].index + 1 + results[2][0].length);
			}

			if (slices.end.replace(/\s+$/, '').length > 0) {
				/* End is not empty, slice the title */
				field.subfields = [
					{code: 'a', value: `${slices.start} :`},
					{code: 'b', value: slices.end}
				];
				return field;
			}

			field.subfields = [{code: 'a', value: title}];
			return field;
		}

		function create246() {
			const field = {tag: '246', subfields: [{code: 'a', value: title}]};
			switch (titleType) {
				case '04':
					field.ind1 = '1';
					field.ind2 = '3';
					break;
				case '05':
				case '07':
					field.ind1 = '3';
					field.ind2 = '0';
					break;
				case '10':
					field.ind1 = '1';
					field.ind2 = '8';
					break;
				case '11':
					field.ind1 = '1';
					field.ind2 = '4';
					break;
				case '12':
				case '13':
					field.ind1 = '1';
					break;
				default:
					break;
			}

			return field;
		}

		function handleAudio() {
			record.leader = createLeader({6: 'i', 7: 'm'});
			record.insertField({tag: '007', value: 'sr|uunnnnnuneu'});
			record.insertField({tag: '007', value: 'cr|nnannnuuuuu'});

			update008({0: 'm', 23: 'o', 26: 'z'});

			record.insertField({
				tag: '336',
				subfields: [
					{code: 'a', value: 'puhe'},
					{code: 'b', value: 'spw'},
					{code: '2', value: 'rdacontent'}
				]
			});

			record.insertField({
				tag: '655',
				ind2: '7',
				subfields: [
					{code: 'a', value: 'äänikirjat'},
					{code: '2', value: 'slm/fin'},
					{code: '0', value: 'http://urn.fi/URN:NBN:fi:au:slm:s579'}
				]
			});
		}

		function handleContributors() {
			const pattern = /\s?\(toim\.\)|Toimittanut /;
			contributors
				.filter(c => ['A01', 'E07'].includes(c.role))
				.map(c => {
					if (pattern.test(c.name)) {
						return {
							name: c.name.replace(pattern, ''),
							role: 'toimittaja'
						};
					}

					return {
						name: c.name,
						role: c.role === 'A01' ? 'kirjoittaja' : 'lukija'
					};
				})
				.forEach((contributor, index) => {
					const {name, role} = contributor;

					/* Not a actual name */
					if (/, Useita/i.test(name)) {
						const f245 = record.get(/^245$/).shift();

						if (f245) {
							f245.ind1 = '0';
						}
					} else if (index === 0) {
						record.insertField({
							tag: '100',
							ind1: '1',
							subfields: [
								{code: 'a', value: name},
								{code: 'e', value: role}
							]
						});
					} else {
						record.insertField({
							tag: '700',
							ind1: '1',
							subfields: [
								{code: 'a', value: name},
								{code: 'e', value: role}
							]
						});
					}
				});
		}

		function handleText(format) {
			record.leader = createLeader({6: 'a', 7: 'm'});
			record.insertField({tag: '007', value: 'cr||||||||||||'});

			update008({6: 's', 23: 'o'});

			const f020 = record.get(/^020$/).shift();

			if (f020) {
				f020.subfields.push({code: 'q', value: format});
			}

			record.insertField({
				tag: '336',
				subfields: [
					{code: 'a', value: 'teksti'},
					{code: 'b', value: 'txt'},
					{code: '2', value: 'rdacontent'}
				]
			});

			record.insertField({
				tag: '347',
				subfields: [
					{code: 'a', value: 'tekstitiedosto'},
					{code: 'b', value: format},
					{code: '2', value: 'rda'}
				]
			});
		}

		function getEncodingLevel() {
			if ([notificationType] in ENCODING_LEVEL_MAP) {
				return ENCODING_LEVEL_MAP[notificationType];
			}

			return '|';
		}

		function createLeader(mappings) {
			const fixedMappings = {
				5: 'n',
				18: 'i',
				19: '^',
				17: getEncodingLevel()
			};

			return mapValuesToString(
				'00000|||^a22000008i^4500',
				Object.assign(mappings, fixedMappings)
			);
		}

		function create006(mappings) {
			return {
				tag: '006',
				value: mapValuesToString('||||||||||||||||||', mappings)
			};
		}

		function create008() {
			const date = moment().format('YYMMDD');
			const publishingYear = publishingDate ? publishingDate.slice(0, 4) : '^^^^';
			const value = `${date}|${publishingYear}||||^^^|||||^|||||^||||||||||`;

			return {tag: '008', value};
		}

		function update008(mappings) {
			const f008 = record.get(/^008$/).shift();
			f008.value = mapValuesToString(f008.value, mappings);
		}

		function getLanguage() {
			if (summary && /Huom\. kirja on englanninkielinen/.test(summary)) {
				return 'eng';
			}

			return getNodeValue(['DescriptiveDetail', 'Language', 'LanguageCode']);
		}

		// TODO: Fetch ISIL from HTTP service instead (And cache for reuse)
		function getISIL() {
			return ISIL_MAP[supplier];
		}

		function getNodeValue(elements, ctx = node) {
			const target = [].concat(elements).reduce((ptr, name) => {
				if (ptr) {
					if (Array.isArray(ptr) && ptr[0].children) {
						return ptr[0].children[name];
					}

					return ptr.children ? ptr.children[name] : undefined;
				}

				return undefined;
			}, ctx);

			return Array.isArray(target) ? target[0].value : (target ? target.value : undefined);
		}

		function getNodes(elements, ctx = node) {
			const target = [].concat(elements).reduce((ptr, name) => {
				return ptr.children[name];
			}, ctx);
			return Array.isArray(target) ? target : [target];
		}

		function mapValuesToString(str, mappings) {
			return Object.keys(mappings).reduce((buf, index) => {
				buf[index] = mappings[index];
				return buf;
			}, str.split('')).join('');
		}
	}

	function dropRecord(node) {
		return node.children.ProductIdentifier.some(n => {
			const value = n.children.IDValue.value;
			if (n.children.ProductIDType.value === '02') {
				if (!(value.startsWith('951') || value.startsWith('952'))) {
					return true;
				}
			}

			return false;
		});
	}
};
