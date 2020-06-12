/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Publication archives record transformer for the Melinda record batch import system
*
* Copyright (C) 2019-2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-import-transformer-publication-archives
*
* melinda-record-import-transformer-publication-archives program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-import-transformer-publication-archives is distributed in the hope that it will be useful,
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

import {MarcRecord} from '@natlibfi/marc-record';
import moment from 'moment';

export default ({sources}) => {
	return ({Product: record}) => {
		if (isNotSupported()) {
			throw new Error('Unsupported product identifier type & value');
		}

		const marcRecord = new MarcRecord();
		
		const {isAudio, isText, textFormat} = getTypeInformation();
		const authors = getAuthors();		

		marcRecord.leader = generateLeader();
		generateFields().forEach(f => marcRecord.insertField(f));

		return marcRecord;

		function generateLeader() {
			const type = generateType();
			const bibliographicLevel = generateBibliographicLevel();
			const encodingLevel = generateEncodingLevel();

			return `00000n${type}${bibliographicLevel} a2200000${encodingLevel}i 4500`;

			function generateEncodingLevel() {
				const encodingLevels = {
					'01': '3',
					'02': '5',
					'03': '8',
					'04': '8',
					'05': 'J',
					'08': '8',
					'09': '8'
				};

				const notificationType = getValueNew('NotificationType');

				if ([notificationType] in encodingLevels) {
					return encodingLevels[notificationType];
				}

				return '|';
			}

			function generateType() {
				if (isAudio) {
					return 'i';
				}

				if (isText) {
					return 'a';
				}

				return '|';
			}

			function generateBibliographicLevel() {
				return isAudio || isText ? 'm' : '|';
			}
		}

		function generateFields() {
			return [
				generate008(),
				generate006(),
				generate007(),
				generate520(),
				generate040(),
				generate041(),
				generate884(),
				generate337(),
				generate264(),
				generateStandardIdentifiers(),
				generateTitles(),
				generatAuthors(),
				generateStaticFields()
			].flat();

			function generate336() {
				if (isAudio) {
					return [{
						tag: '336',
						subfields: [
							{code: 'a', value: 'puhe'},
							{code: 'b', value: 'spw'},
							{code: '2', value: 'rdacontent'}
						]
					}];
				}

				if (isText) {
					return [{
						tag: '336',
						subfields: [
							{code: 'a', value: 'teksti'},
							{code: 'b', value: 'txt'},
							{code: '2', value: 'rdacontent'}
						]
					}];
				}

				return [];
			}

			function generate347() {
				if (isAudio) {
					return [{
						tag: '347', subfields: [
							{code: 'a', value: 'äänitiedosto'},
							{code: 'b', value: 'MP3'},
							{code: '2', value: 'rda'}
						]
					}];
				}

				if (isText) {
					return [{
						tag: '347',
						subfields: [
							{code: 'a', value: 'tekstitiedosto'},
							{code: 'b', value: format},
							{code: '2', value: 'rda'}
						]
					}];
				}
			}

			function generate500() {
				return isAudio ? [{
					tag: '500', subfields: [
						{code: 'a', value: 'Äänikirja.'},
						{code: '9', value: 'FENNI<KEEP>'}
					]
				}] : [];
			}

			function generate655() {
				return isText ? [{
					tag: '655',
					ind2: '7',
					subfields: [
						{code: 'a', value: 'äänikirjat'},
						{code: '2', value: 'slm/fin'},
						{code: '0', value: 'http://urn.fi/URN:NBN:fi:au:slm:s579'}
					]
				}] : [];
			}

			function generate006() {
				const materialForm = isAudio || isText ? 'm' : '|';
				const itemForm = isAudio || isText ? 'o' : '|';
				const fileType = generateFileType();

				return [{
					tag: '006', value: `${materialForm}|||||${itemForm}||${fileType}||||||||`
				}];

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

			function generate007() {
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

			function generate264() {
				const publisher = getValueNew('PublishingDetail', 'Publisher', 'PublisherName');

				if (publisher) {
					const publishingDate = getValueNew('PublishingDetail', 'PublishingDate', 'Date');

					if (publishingDate) {
						return {
							tag: '264', ind2: '1',
							subfields: [
								{code: 'b', value: publisher},
								{code: 'c', value: publishingDate}
							]
						};
					}

					return {
						tag: '264', ind2: '1',
						subfields: [{code: 'b', value: publisher}]
					};
				}

				return [];
			}

			function generateStaticFields() {
				return [
					{
						tag: '300',
						subfields: [{code: 'a', value: '1 verkkoaineisto'}]
					},
					{
						tag: '337',
						subfields: [
							{code: 'a', value: 'tietokonekäyttöinen'},
							{code: 'b', value: 'c'},
							{code: '2', value: 'rdamedia'}
						]
					},
					{
						tag: '338',
						subfields: [
							{code: 'a', value: 'verkkoaineisto'},
							{code: 'b', value: 'cr'},
							{code: '2', value: 'rdacarrier'}
						]
					},
					{
						tag: '344',
						subfields: [
							{code: 'a', value: 'digitaalinen'},
							{code: '2', value: 'rda'}
						]
					},
					{
						tag: '506', ind1: '1',
						subfields: [
							{code: 'a', value: 'Aineisto on käytettävissä vapaakappalekirjastoissa.'},
							{code: 'f', value: 'Online access with authorization.'},
							{code: '2', value: 'star'},
							{code: '5', value: 'FI-Vapaa'},
							{code: '9', value: 'FENNI<KEEP>'}
						]
					},
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
					},
					{
						tag: '042',
						subfields: [{code: 'a', value: 'finb'}]
					},
					{
						tag: 'LOW',
						subfields: [{code: 'a', value: 'FIKKA'}]
					},
					{
						tag: '500',
						ind1: ' ',
						ind2: ' ',
						subfields: [
							{code: 'a', value: 'Koneellisesti tuotettu tietue.'},
							{code: '9', value: 'FENNI<KEEP>'}
						]
					}
				];
			}

			function generate884() {
				const supplier = record?.ProductSupply?.[0]?.SupplyDetail?.[0]?.Supplier?.[0]?.SupplierName?.[0];

				return [{
					tag: '884',
					subfields: [
						{code: 'a', value: 'ONIX3 to MARC transformation'},
						{code: 'g', value: moment().format('YYYYMMDD')},
						{code: 'k', value: sources[supplier]},
						{code: 'q', value: 'FI-NL'}
					]
				}];
			}

			function generate008() {
				const date = moment().format('YYMMDD');
				const language = generateLanguage();
				const publicationCountry = generatePublicationCountry();
				const publishingYear = generatePublishingYear();
				const value = `${date}s${publishingYear}    ${publicationCountry} |||||o|||||||||||${language}||`;

				return [{tag: '008', value}];

				function generateLanguage() {
					return getLanguageRole() === '01' ? getLanguage() : '|||';
				}

				function generatePublicationCountry() {
					const publicationCountry = record?.PublishingDetail?.[0]?.CountryOfPublication?.[0];
					return publicationCountry ? publicationCountry.slice(0, 2).toLowerCase() : 'xx';
				}

				function generatePublishingYear() {
					const publishingDate = getValueNew('PublishingDetail', 'PublishingDate', 'Date');
					return publishingDate ? publishingDate.slice(0, 4) : '    ';
				}
			}

			function generate520() {
				const summary = getSummary();
				const [textType] = record?.CollateralDetail?.[0]?.TextContent?.[0]?.TextType;

				return summary && textType === '03' ? [{
					tag: '520', subfields: [{code: 'a', value: summary}]
				}] : [];
			}

			function generateStandardIdentifiers() {
				const isbn = getIsbn();

				if (isbn) {
					if (isAudio || isText) {
						return [{
							tag: '020',
							subfields: [
								{code: 'a', value: isbn},
								{code: 'q', value: isAudio ? 'MP3' : textFormat}
							]
						}];
					}

					return [{
						tag: '020',
						subfields: [{code: 'a', value: isbn}]
					}];
				}

				const gtin = record?.ProductIdentifier.find(({ProductIDType: [type]}) => type === '03')?.IDValue?.[0];

				if (gtin) {
					return [{
						tag: '024', ind1: '3',
						subfields: [{code: 'a', value: gtin}]
					}];
				}

				return [];

				function getIsbn() {
					const isbn13 = record?.ProductIdentifier.find(({ProductIDType: [type]}) => type === '15');

					if (isbn13) {
						return isbn13.IDValue[0];
					}

					return record?.ProductIdentifier.find(({ProductIDType: [type]}) => type === '02')?.IDValue?.[0];
				}
			}

			function generate040() {
				return [{
					tag: '040',
					subfields: [
						{code: 'b', value: getLanguage()},
						{code: 'e', value: 'rda'},
						{code: 'd', value: 'FI-NL'}
					]
				}];
			}

			function generate041() {
				return getLanguageRole() === '01' ? [{
					tag: '041', subfields: [{code: 'a', value: getLanguage()}]
				}] : [];
			}

			function generateAuthors() {
			/*

				.forEach((contributor, index) => {
					const {name, role} = contributor;

					// Not a actual name
					if ((/, Useita/i).test(name)) {
						const f245 = marcRecord.get(/^245$/).shift();

						if (f245) {
							f245.ind1 = '0';
						}
					} else if (index === 0) {
						marcRecord.insertField({
							tag: '100',
							ind1: '1',
							subfields: [
								{code: 'a', value: name},
								{code: 'e', value: role}
							]
						});
						const f245 = marcRecord.get(/^245$/).shift();

						if (f245) {
							f245.ind1 = '1';
						}
					} else {
						marcRecord.insertField({
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
		*/
			}

			function generateTitles() {				
				const titleType = record?.DescriptiveDetail?.[0]?.TitleDetail?.[0]?.TitleType?.[0];
				const title = record?.DescriptiveDetail?.[0]?.TitleDetail?.[0]?.TitleElement?.[0]?.TitleText?.[0];

				if (['00', '02', '01', '03'].includes(titleType)) {
					if (titleType === '02') {
						return [
							generate245(),
							{
								tag: '222', ind2: '0',
								subfields: [{code: 'x', value: title}]
							}
						];
					}

					return [generate245()];
				}

				if (['04', '05', '10', '11', '12', '13'].includes(titleType)) {
					return [generate246()];
				}

				if (titleType === '06') {
					return [{
						tag: '242', ind1: '1',
						subfields: [{code: 'a', value: title}]
					}];
				}

				if (titleType === '07') {
					return [generate245(), generate246()];
				}

				if (titleType === '08') {
					return [{
						tag: '257', ind1: '1', ind2: '0',
						subfields: [{code: 'a', value: title}]
					}];
				}

				return [];

				function generate245() {
					const generateInd1 = generateInd1();
					const {mainTitle, remainder} = formatTitle();

					if (remainder) {
						return {
							tag: '245', ind1, ind2: '0',
							subfields: [
								{code: 'a', value: `${mainTitle} :`},
								{code: 'b', value: remainder}
							]
						};
					}

					return {
						tag: '245', ind1, ind2: '0',
						subfields: [{code: 'a', value: mainTitle}]
					};

					function generateInd1() {
						return hasMultipleAuthors() ? '0' : '1';

						function hasMultipleAuthors() {
							return authors.some(({name}) => /, Useita/i.test(name));
						}
					}

					function formatTitle() {
						const lengths = calculateLengths();

						if (lengths) {
							const {mainLength, remainderLength} = lengths;

							return {
								mainTitle: title.slice(0, mainLength),
								remainder: title.slice(remainderLength).trimEnd()
							};
						}

						return {mainTitle: title};

						function calculateLengths() {
							const firstResult = /(s+[\u2013\u2014-]\s+|:\s+|[^.]\.[^.])/.exec(title);

							if (firstResult) {
								const [matched] = firstResult;
								const {index} = firstResult;

								return {
									titleSpec: index,
									remainderSpec: index + matched.length
								};
							}

							const secondResult = /!+|\?+/.exec(title);

							if (secondResult) {
								const [matched] = secondResult;
								const {index} = secondResult;

								return {
									titleSpec: index + 1,
									remainderSpec: index + 1 + matched.length
								};
							}
						}
					}
				}

				function generate246() {
					const {ind1, ind2} = generateIndicators();

					return {
						tag: '246', ind1, ind2,
						subfields: [{code: 'a', value: title}]
					};

					function generateIndicators() {
						if (titleType === '04') {
							return {ind1: '1', ind2: '3'};
						}

						if (['05', '07'].includes(titleType)) {
							return {ind1: '3', ind2: '0'};
						}

						if (titleType === '10') {
							return {ind1: '1', ind2: '8'};
						}

						if (titleType === '11') {
							return {ind1: '1', ind2: '4'};
						}

						if (['12', '13'].includes(titleType)) {
							return {ind1: '1', ind2: ' '};
						}

						return {ind1: ' ', ind2: ' '};
					}
				}
			}

			function getTypeInformation() {
				const form = getValueNew('DescriptiveDetail', 'ProductForm');
				const formDetail = getValueNew('DescriptiveDetail', 'ProductFormDetail');

				if (form === 'AJ' && formDetail === 'A103') {
					return {isAudio: true};
				}

				if (['EB', 'ED'].includes(form) && ['E101', 'E107'].includes(formDetail)) {
					return {isText: true, textFormat: formDetail === 'E101' ? 'EPUB' : 'PDF'};
				}
			}
		}

		function getAuthors() {
			/*function parseContributors() {
				const list = getValue('DescriptiveDetail', 'Contributor')
					.map(n => ({
						name: n.PersonNameInverted[0],
						role: n.ContributorRole[0],
						sequence: n?.SequenceNumber?.[0]
					}))
					.filter(n => n.name);
	
				list.sort((a, b) => Number(a.sequence) - Number(b.sequence));
				return list;
			}
	
			function handleContributors() {
				const pattern = /\s?\(toim\.\)|Toimittanut /;
				contributors
					.filter(c => [
						'A01',
						'E07'
					].includes(c.role))
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
					})*/
		}

		function getLanguageRole() {
			return record?.DescriptiveDetail?.[0]?.Language?.[0]?.LanguageRole?.[0];
		}

		function getSummary() {
			const value = record?.CollateralDetail?.[0]?.TextContent?.[0]?.Text?.[0];
			return typeof value === 'object' ? value._ : value;
		}

		function getLanguage() {
			const summary = getSummary();

			if (summary && (/Huom\. kirja on englanninkielinen/).test(summary)) {
				return 'eng';
			}

			return record?.DescriptiveDetail?.[0]?.Language?.[0]?.LanguageCode?.[0];
		}

		function isNotSupported() {
			return record?.ProductIdentifier.some(({ProductIDType: [type], IDValue: [value]}) => {
				return type === '02' && /^(?<def>951|952)/u.test(value) === false;
			});
		}

		function getValue(...path) {
			return recurse(path);

			function recurse(props, context = record) {
				const [prop] = props;

				if (prop) {
					return recurse(props.slice(1), context?.[prop]?.[0]);
				}

				return typeof context === 'object' ? context._ : context;
			}
		}
	}
};
