import {
	applyTemplate,
	DataNodeTemplate,
	dataNodeTemplate,
	dataNodeTemplates,
	mergeSilentValues,
	templateFieldDefault,
	validateTemplateValue
} from '../data-node-templates';

// Synthetic reward templates exercising enums, bounded numbers, silent
// values, and a nested optional object gated by `requires`.

const itemReward: DataNodeTemplate = {
	id: 'test-item-reward',
	name: 'Item Reward',
	silentValues: {},
	fields: [
		{
			name: 'category',
			type: 'string',
			enum: ['pets', 'gifts', 'toys', 'transport', 'food', 'stickers']
		},
		{name: 'kind', type: 'string', default: ''},
		{name: 'amount', type: 'number', optional: true, default: 1, min: 1},
		{
			name: 'properties',
			type: 'object',
			optional: true,
			requires: {field: 'category', equals: 'pets'},
			fields: [
				{name: 'age', type: 'number', optional: true, default: 1, min: 1, max: 6},
				{name: 'neon', type: 'boolean', optional: true, default: true},
				{name: 'mega_neon', type: 'boolean', optional: true, default: true}
			]
		}
	]
};

const currencyReward: DataNodeTemplate = {
	id: 'test-currency-reward',
	name: 'Currency Reward',
	silentValues: {category: 'currency'},
	fields: [
		{name: 'kind', type: 'string', enum: ['money', 'alt_currency']},
		{name: 'amount', type: 'number', default: 1, min: 1}
	]
};

// A synthetic template exercising array fields: an array of objects and an
// optional array of bounded numbers.

const arrayTemplate: DataNodeTemplate = {
	id: 'test-array',
	name: 'Test Array',
	silentValues: {},
	fields: [
		{
			name: 'rewards',
			type: 'array',
			item: {
				type: 'object',
				fields: [
					{name: 'kind', type: 'string', enum: ['money', 'gems']},
					{name: 'amount', type: 'number', min: 1, default: 1}
				]
			}
		},
		{
			name: 'scores',
			type: 'array',
			optional: true,
			item: {type: 'number', min: 0, max: 10}
		}
	]
};

// A synthetic template exercising a `notEqual` field requirement: `note` is
// only allowed while `kind` isn't 'money'.

const notEqualTemplate: DataNodeTemplate = {
	id: 'test-not-equal',
	name: 'Test Not Equal',
	silentValues: {},
	fields: [
		{name: 'kind', type: 'string', enum: ['money', 'gems']},
		{
			name: 'note',
			type: 'string',
			optional: true,
			requires: {field: 'kind', notEqual: 'money'}
		}
	]
};

// A synthetic template exercising a conditional enum: `kind` is constrained
// to a dropdown only while `category` is 'currency', and is a free string
// otherwise.

const conditionalEnumTemplate: DataNodeTemplate = {
	id: 'test-conditional-enum',
	name: 'Test Conditional Enum',
	silentValues: {},
	fields: [
		{name: 'category', type: 'string', enum: ['pets', 'currency']},
		{
			name: 'kind',
			type: 'string',
			enum: [
				{
					when: {field: 'category', equals: 'currency'},
					options: ['money', 'gems']
				}
			]
		}
	]
};

describe('dataNodeTemplate()', () => {
	it('finds templates by ID', () => {
		expect(dataNodeTemplate('trigger')?.name).toBe('Trigger');
		expect(dataNodeTemplate('requirement')?.name).toBe('Requirement');
	});

	it('returns undefined for undefined or unknown IDs', () => {
		expect(dataNodeTemplate(undefined)).toBeUndefined();
		expect(dataNodeTemplate('bad')).toBeUndefined();
	});

	it('has unique IDs across all templates', () => {
		const ids = dataNodeTemplates.map(({id}) => id);

		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('templateFieldDefault()', () => {
	it('uses the field default when set', () => {
		const amount = currencyReward.fields.find(({name}) => name === 'amount')!;

		expect(templateFieldDefault(amount)).toBe(1);
	});

	it('defaults enum fields to their first option', () => {
		const category = itemReward.fields.find(({name}) => name === 'category')!;

		expect(templateFieldDefault(category)).toBe('pets');
	});

	it('resolves conditional enum defaults against the containing object', () => {
		const kind = conditionalEnumTemplate.fields.find(
			({name}) => name === 'kind'
		)!;

		expect(templateFieldDefault(kind, {category: 'currency'})).toBe('money');
		expect(templateFieldDefault(kind, {category: 'pets'})).toBe('');
		expect(templateFieldDefault(kind)).toBe('');
	});

	it('defaults booleans to their template default', () => {
		const properties = itemReward.fields.find(
			({name}) => name === 'properties'
		)!;

		if (properties.type !== 'object') {
			throw new Error('properties should be an object field');
		}

		const neon = properties.fields.find(({name}) => name === 'neon')!;

		expect(templateFieldDefault(neon)).toBe(true);
	});

	it('defaults array fields to an empty array', () => {
		const rewards = arrayTemplate.fields.find(({name}) => name === 'rewards')!;

		expect(templateFieldDefault(rewards)).toEqual([]);
	});

	it('defaults array items from their item template', () => {
		const rewards = arrayTemplate.fields.find(({name}) => name === 'rewards')!;

		if (rewards.type !== 'array') {
			throw new Error('rewards should be an array field');
		}

		expect(templateFieldDefault(rewards.item)).toEqual({
			kind: 'money',
			amount: 1
		});
	});

	it('defaults object fields to their required subfields only', () => {
		const properties = itemReward.fields.find(
			({name}) => name === 'properties'
		)!;

		// All of properties' subfields are optional, so it starts empty.

		expect(templateFieldDefault(properties)).toEqual({});
	});
});

describe('applyTemplate()', () => {
	it('fills required fields with defaults from an empty value', () => {
		expect(applyTemplate(itemReward, {})).toEqual({
			category: 'pets',
			kind: ''
		});
		expect(applyTemplate(currencyReward, {})).toEqual({
			kind: 'money',
			amount: 1
		});
	});

	it('treats non-object values as empty', () => {
		expect(applyTemplate(currencyReward, 'oops')).toEqual({
			kind: 'money',
			amount: 1
		});
	});

	it('keeps existing values with matching types and drops unknown fields', () => {
		expect(
			applyTemplate(itemReward, {category: 'pets', kind: 'dog', junk: true})
		).toEqual({category: 'pets', kind: 'dog'});
	});

	it('replaces existing values whose type does not match', () => {
		expect(applyTemplate(currencyReward, {kind: 5, amount: 10})).toEqual({
			kind: 'money',
			amount: 10
		});
	});

	it('keeps optional fields that are present', () => {
		expect(applyTemplate(itemReward, {kind: 'dog', amount: 3})).toEqual({
			category: 'pets',
			kind: 'dog',
			amount: 3
		});
	});

	it('fills conditional enum defaults based on sibling fields', () => {
		expect(
			applyTemplate(conditionalEnumTemplate, {category: 'currency'})
		).toEqual({category: 'currency', kind: 'money'});
		expect(applyTemplate(conditionalEnumTemplate, {category: 'pets'})).toEqual({
			category: 'pets',
			kind: ''
		});
	});

	it('keeps out-of-enum strings so validation can flag them', () => {
		expect(applyTemplate(itemReward, {category: 'misc', kind: 'x'})).toEqual({
			category: 'misc',
			kind: 'x'
		});
	});

	it('keeps optional object fields recursively', () => {
		expect(
			applyTemplate(itemReward, {
				category: 'pets',
				kind: 'dog',
				properties: {age: 2, junk: 1}
			})
		).toEqual({category: 'pets', kind: 'dog', properties: {age: 2}});
	});

	it('fills required array fields with an empty array', () => {
		expect(applyTemplate(arrayTemplate, {})).toEqual({rewards: []});
	});

	it('conforms each array item to the item template', () => {
		expect(
			applyTemplate(arrayTemplate, {
				rewards: [
					{kind: 'gems', amount: 5, junk: true},
					{kind: 'money'},
					'oops'
				]
			})
		).toEqual({
			rewards: [
				{kind: 'gems', amount: 5},
				{kind: 'money', amount: 1},
				{kind: 'money', amount: 1}
			]
		});
	});

	it('keeps optional array fields that are present', () => {
		expect(applyTemplate(arrayTemplate, {scores: [3, 7]})).toEqual({
			rewards: [],
			scores: [3, 7]
		});
	});

	it('drops optional fields whose requirement is not met', () => {
		expect(
			applyTemplate(itemReward, {
				category: 'toys',
				kind: 'ball',
				properties: {age: 2}
			})
		).toEqual({category: 'toys', kind: 'ball'});
	});

	it('drops optional fields whose notEqual requirement is not met', () => {
		expect(
			applyTemplate(notEqualTemplate, {kind: 'money', note: 'hi'})
		).toEqual({kind: 'money'});
		expect(applyTemplate(notEqualTemplate, {kind: 'gems', note: 'hi'})).toEqual(
			{kind: 'gems', note: 'hi'}
		);
	});
});

describe('validateTemplateValue()', () => {
	it('accepts a minimal valid value', () => {
		expect(
			validateTemplateValue(itemReward, {category: 'toys', kind: 'ball'})
		).toEqual([]);
		expect(
			validateTemplateValue(currencyReward, {kind: 'money', amount: 5})
		).toEqual([]);
	});

	it('accepts a fully-populated item reward', () => {
		expect(
			validateTemplateValue(itemReward, {
				category: 'pets',
				kind: 'dog',
				amount: 2,
				properties: {age: 6, neon: true, mega_neon: false}
			})
		).toEqual([]);
	});

	it('rejects non-object roots', () => {
		expect(validateTemplateValue(itemReward, [1])).toEqual([
			{message: 'Item Reward data must be a JSON object', path: []}
		]);
	});

	it('reports missing required fields', () => {
		expect(validateTemplateValue(itemReward, {category: 'toys'})).toEqual([
			{message: 'Missing required field "kind"', path: []}
		]);
	});

	it('reports type mismatches', () => {
		expect(
			validateTemplateValue(currencyReward, {kind: 'money', amount: 'lots'})
		).toEqual([{message: '"amount" must be a number', path: ['amount']}]);
	});

	it('enforces minimums and maximums on numbers', () => {
		expect(
			validateTemplateValue(currencyReward, {kind: 'money', amount: 0})
		).toEqual([{message: '"amount" must be at least 1', path: ['amount']}]);
		expect(
			validateTemplateValue(itemReward, {
				category: 'pets',
				kind: 'dog',
				properties: {age: 7}
			})
		).toEqual([
			{message: '"age" must be at most 6', path: ['properties', 'age']}
		]);
	});

	it('enforces enum fields', () => {
		expect(
			validateTemplateValue(itemReward, {category: 'weapons', kind: 'sword'})
		).toEqual([
			{
				message:
					'"category" must be one of "pets", "gifts", "toys", "transport", "food", "stickers"',
				path: ['category']
			}
		]);
		expect(
			validateTemplateValue(itemReward, {category: 'stickers', kind: 'star'})
		).toEqual([]);
	});

	it('enforces conditional enums only while their condition is met', () => {
		expect(
			validateTemplateValue(conditionalEnumTemplate, {
				category: 'currency',
				kind: 'money'
			})
		).toEqual([]);
		expect(
			validateTemplateValue(conditionalEnumTemplate, {
				category: 'currency',
				kind: 'dog'
			})
		).toEqual([
			{message: '"kind" must be one of "money", "gems"', path: ['kind']}
		]);
		expect(
			validateTemplateValue(conditionalEnumTemplate, {
				category: 'pets',
				kind: 'dog'
			})
		).toEqual([]);
	});

	it('enforces field requirements', () => {
		expect(
			validateTemplateValue(itemReward, {
				category: 'toys',
				kind: 'ball',
				properties: {}
			})
		).toEqual([
			{
				message: '"properties" is only allowed when "category" is "pets"',
				path: ['properties']
			}
		]);
	});

	it('enforces notEqual field requirements', () => {
		expect(
			validateTemplateValue(notEqualTemplate, {kind: 'money', note: 'hi'})
		).toEqual([
			{
				message: `"note" is only allowed when "kind" isn't "money"`,
				path: ['note']
			}
		]);
		expect(
			validateTemplateValue(notEqualTemplate, {kind: 'gems', note: 'hi'})
		).toEqual([]);
	});

	it('reports fields outside the template, including nested ones', () => {
		expect(
			validateTemplateValue(itemReward, {
				category: 'pets',
				kind: 'dog',
				junk: 1,
				properties: {sparkle: true}
			})
		).toEqual(
			expect.arrayContaining([
				{
					message: `"junk" isn't part of the Item Reward template`,
					path: ['junk']
				},
				{
					message: `"sparkle" isn't part of the Item Reward template`,
					path: ['properties', 'sparkle']
				}
			])
		);
	});

	it('accepts valid array fields and items', () => {
		expect(
			validateTemplateValue(arrayTemplate, {
				rewards: [{kind: 'money', amount: 2}],
				scores: [0, 10]
			})
		).toEqual([]);
		expect(validateTemplateValue(arrayTemplate, {rewards: []})).toEqual([]);
	});

	it('rejects non-array values for array fields', () => {
		expect(
			validateTemplateValue(arrayTemplate, {rewards: {kind: 'money'}})
		).toEqual([{message: '"rewards" must be an array', path: ['rewards']}]);
	});

	it('validates each array item against the item template', () => {
		expect(
			validateTemplateValue(arrayTemplate, {
				rewards: [],
				scores: [5, 'high', 20]
			})
		).toEqual([
			{
				message: 'item 2 of "scores" must be a number',
				path: ['scores', 1]
			},
			{
				message: 'item 3 of "scores" must be at most 10',
				path: ['scores', 2]
			}
		]);
	});

	it('validates object array items recursively', () => {
		expect(
			validateTemplateValue(arrayTemplate, {
				rewards: [
					{kind: 'money', amount: 1},
					{amount: 0, junk: true}
				]
			})
		).toEqual(
			expect.arrayContaining([
				{
					message: 'Missing required field "kind"',
					path: ['rewards', 1]
				},
				{
					message: '"amount" must be at least 1',
					path: ['rewards', 1, 'amount']
				},
				{
					message: `"junk" isn't part of the Test Array template`,
					path: ['rewards', 1, 'junk']
				}
			])
		);
	});

	it('flags silent fields entered by hand', () => {
		expect(
			validateTemplateValue(currencyReward, {
				category: 'currency',
				kind: 'money',
				amount: 1
			})
		).toEqual([
			{
				message:
					'"category" is added automatically by the Currency Reward template at export',
				path: ['category']
			}
		]);
	});
});

describe('mergeSilentValues()', () => {
	it('merges silent values over user data', () => {
		expect(
			mergeSilentValues(currencyReward, {
				kind: 'gems',
				amount: 5,
				category: 'oops'
			})
		).toEqual({kind: 'gems', amount: 5, category: 'currency'});
	});

	it('returns data unchanged for templates without silent values', () => {
		const data = {category: 'pets', kind: 'dog'};

		expect(mergeSilentValues(itemReward, data)).toBe(data);
	});

	it('leaves non-object data alone', () => {
		expect(mergeSilentValues(currencyReward, 'raw text')).toBe('raw text');
		expect(mergeSilentValues(currencyReward, [1, 2])).toEqual([1, 2]);
	});
});

describe('NPC template', () => {
	const npc = dataNodeTemplate('npc')!;

	it('starts with no data, so existing name-only NPC nodes stay valid', () => {
		expect(applyTemplate(npc, {})).toEqual({});
		expect(validateTemplateValue(npc, {})).toEqual([]);
	});

	it('fills a toggled-on proximity trigger with its required distance only', () => {
		expect(applyTemplate(npc, {proximityTrigger: {}})).toEqual({
			proximityTrigger: {triggerDistance: 0}
		});
	});

	it('accepts a proximity trigger with or without a retrigger delay', () => {
		expect(
			validateTemplateValue(npc, {proximityTrigger: {triggerDistance: 12}})
		).toEqual([]);
		expect(
			validateTemplateValue(npc, {
				proximityTrigger: {triggerDistance: 12, retriggerDelay: 30}
			})
		).toEqual([]);
	});

	it('rejects negative distances and delays and unknown trigger fields', () => {
		expect(
			validateTemplateValue(npc, {
				proximityTrigger: {triggerDistance: -1, retriggerDelay: -5, junk: 1}
			})
		).toEqual([
			{
				message: '"triggerDistance" must be at least 0',
				path: ['proximityTrigger', 'triggerDistance']
			},
			{
				message: '"retriggerDelay" must be at least 0',
				path: ['proximityTrigger', 'retriggerDelay']
			},
			{
				message: '"junk" isn\'t part of the NPC template',
				path: ['proximityTrigger', 'junk']
			}
		]);
	});

	it('reports a proximity trigger missing its distance', () => {
		expect(
			validateTemplateValue(npc, {proximityTrigger: {retriggerDelay: 3}})
		).toEqual([
			{
				message: 'Missing required field "triggerDistance"',
				path: ['proximityTrigger']
			}
		]);
	});
});
