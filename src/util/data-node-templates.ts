// Data node templates: named schemas that pre-fill a data node's JSON and
// constrain which fields it may contain. A node's chosen template is stored
// in its `dataTemplate` field. In the text editor, violations surface as lint
// annotations; in the visual builder, the template replaces the free-form
// builder with fixed rows where only optional fields can be toggled.
//
// Validation messages here are plain English rather than localized strings,
// matching the JSON lint messages in codemirror/json-lint.ts.

import {JsonObject, JsonPath, JsonValue} from './json';
import npcPortrait from './npc-portrait.png';
import requirementIcon from './requirement-icon.png';
import triggerIcon from './trigger-icon.png';
import setpieceIcon from './setpiece-icon.png';
import textModifierIcon from './text-modifier-icon.png';

/**
 * A condition on a sibling field: it must either equal or not equal a value.
 */
export type DataTemplateFieldRequirement =
	| {equals: JsonValue; field: string}
	| {field: string; notEqual: JsonValue};

interface DataTemplateFieldBase {
	/**
	 * Object key this field occupies.
	 */
	name: string;
	/**
	 * Optional fields are only present when the user toggles them on.
	 */
	optional?: boolean;
	/**
	 * If set, this field may only be present while a sibling field satisfies a
	 * condition.
	 */
	requires?: DataTemplateFieldRequirement;
}

/**
 * One branch of a conditional enum: the options in effect while a sibling
 * field satisfies a condition.
 */
export interface DataTemplateEnumVariant {
	options: string[];
	when: DataTemplateFieldRequirement;
}

export interface DataTemplateStringField extends DataTemplateFieldBase {
	default?: string;
	/**
	 * If set, the value must be one of these strings. The visual builder shows
	 * a dropdown instead of a free text input, and the field defaults to the
	 * first option unless `default` says otherwise.
	 *
	 * A list of variants makes the options conditional on sibling fields: the
	 * first variant whose `when` is satisfied applies, and if none is, the
	 * field is a free string. See templateFieldEnum().
	 */
	enum?: string[] | DataTemplateEnumVariant[];
	type: 'string';
}

export interface DataTemplateNumberField extends DataTemplateFieldBase {
	default?: number;
	/**
	 * Inclusive bounds.
	 */
	max?: number;
	min?: number;
	type: 'number';
}

export interface DataTemplateBooleanField extends DataTemplateFieldBase {
	default?: boolean;
	type: 'boolean';
}

export interface DataTemplateObjectField extends DataTemplateFieldBase {
	fields: DataTemplateField[];
	type: 'object';
}

export interface DataTemplateArrayField extends DataTemplateFieldBase {
	/**
	 * Template every item in the array must follow. In the visual builder,
	 * users add and remove copies of this item and edit each one individually.
	 */
	item: DataTemplateArrayItem;
	type: 'array';
}

export type DataTemplateField =
	| DataTemplateStringField
	| DataTemplateNumberField
	| DataTemplateBooleanField
	| DataTemplateObjectField
	| DataTemplateArrayField;

/**
 * The template for a single array item: a field definition without a name
 * (position identifies items) and without presence flags--an item is either
 * in the array or it isn't, so `optional` and `requires` don't apply.
 */
export type DataTemplateArrayItem =
	| Omit<DataTemplateStringField, 'name' | 'optional' | 'requires'>
	| Omit<DataTemplateNumberField, 'name' | 'optional' | 'requires'>
	| Omit<DataTemplateBooleanField, 'name' | 'optional' | 'requires'>
	| Omit<DataTemplateObjectField, 'name' | 'optional' | 'requires'>
	| Omit<DataTemplateArrayField, 'name' | 'optional' | 'requires'>;

export interface DataNodeTemplate {
	/**
	 * If set, the node's card on the story map shows this image in place of
	 * the usual excerpt of its text.
	 */
	cardImage?: string;
	/**
	 * If set, a CSS color theming the node on the story map: the stripe on the
	 * card's left edge and the node's tag-link attachments (handle, connection
	 * lines and arrowheads) take this color instead of the default blue.
	 */
	color?: string;
	/**
	 * If true (only meaningful with `tagLink`), a passage can be linked to at
	 * most one node using this template at a time. Linking it to another node
	 * of the same template moves the link there.
	 */
	exclusiveLink?: boolean;
	/**
	 * If true (only meaningful with `tagLink`), the node's data is mirrored
	 * onto the passages linked to it as tags: each top-level string, number or
	 * boolean field becomes a `fieldName:value` tag on every linked passage,
	 * except fields holding their default value, which add no tag. The tags
	 * follow the node's data--they're recomputed whenever the node's data or its
	 * links change. See util/tag-link.ts.
	 */
	fieldTags?: boolean;
	/**
	 * Editable fields, in display order.
	 */
	fields: DataTemplateField[];
	/**
	 * Stable identifier persisted with passages. Don't change existing IDs, or
	 * saved stories will lose their template assignment.
	 */
	id: string;
	/**
	 * If true (only meaningful with `tagLink`), each link from a node using this
	 * template can be negated: a toggle on the connection line adds a
	 * `not:nodeName` tag to the linked passage, marking it as the branch taken
	 * when the node's condition isn't met. See util/tag-link.ts.
	 *
	 * Don't combine this with `linkPriority`--both widgets sit at the midpoint
	 * of the connection and would overlap.
	 */
	linkNegation?: boolean;
	/**
	 * If true (only meaningful with `tagLink`), passages linked to a node using
	 * this template are ranked: each linked passage carries a `priority:N` tag
	 * alongside the tag link, adjustable from a widget on the connection line.
	 * See util/tag-link.ts.
	 */
	linkPriority?: boolean;
	/**
	 * Display name shown in the template menu.
	 */
	name: string;
	/**
	 * If true, the node's only data is its name. The edit dialog hides the
	 * JSON and visual builder views, and the node's text stays an empty
	 * object.
	 */
	nameOnly?: boolean;
	/**
	 * If true, passages can link to nodes using this template with ordinary
	 * `[[link]]` syntax, the same way they link to other passages. These
	 * connections draw in the tag-link style, themed with `color`. Links to
	 * data nodes without this flag are broken links.
	 */
	passageLink?: boolean;
	/**
	 * Values invisibly merged into the node's data when the story is exported
	 * to JSON. They never appear in the editor and override user data with the
	 * same keys.
	 */
	silentValues: JsonObject;
	/**
	 * If true, nodes using this template can be visually linked to passages.
	 * A link is stored as a `templateId:nodeName` tag on the passage, so links
	 * can equally be made or broken by editing tags directly. See
	 * util/tag-link.ts.
	 */
	tagLink?: boolean;
}

export const dataNodeTemplates: DataNodeTemplate[] = [
	{
		id: 'trigger',
		name: 'Trigger',
		silentValues: {},
		passageLink: true,
		tagLink: true,
		linkNegation: true,
		cardImage: triggerIcon,
		color: '#ffd64f',
		fields: [
			{
				name: 'dialog_text',
				type: 'string',
				optional: true,
			},
			{
				name: 'toast',
				type: 'object',
				optional: true,
				fields: [
					{name: 'title', type: 'string', default: ''},
					{
						name: 'color',
						type: 'string',
						enum: ['pink', 'purple', 'blue', 'red', 'green', 'yellow', 'black']
					}
				]
			},
			{
				name: 'reward',
				type: 'object',
				optional: true,
				fields: [
					{
						name: 'category',
						type: 'string',
						enum: ['pets', 'pet_accessories', 'gifts', 'toys', 'transport', 'food', 'stickers', 'currency']
					},
					{
						name: 'kind',
						type: 'string',
						enum: [
							{
								when: {field: 'category', equals: 'currency'},
								options: ['money', 'alt_currency', 'tickets']
							}
						]
					},
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
			}
		]
	},
	{
		id: 'requirement',
		name: 'Requirement',
		silentValues: {},
		tagLink: true,
		linkNegation: true,
		cardImage: requirementIcon,
		color: '#eb28fe',
		fields: [
			{
				name: 'type',
				type: 'string',
				enum: ['item_owned', 'item_discovered', 'item_equipped']
			},
			{
				name: 'items',
				type: 'array',
				item: {
					type: 'object',
					fields: [
						{
							name: 'category',
							type: 'string',
							enum: ['pets', 'pet_accessories', 'gifts', 'toys', 'transport', 'food', 'stickers']
						},
						{
							name: 'kind',
							type: 'string',
						},
						{
							name: 'properties',
							type: 'object',
							optional: true,
							requires: {field: 'category', equals: 'pets'},
							fields: [
								{name: 'neon', type: 'boolean', optional: true, default: true},
								{name: 'mega_neon', type: 'boolean', optional: true, default: true}
							]
						}
					]
				}
			}
		]
	},
	{
		id: 'npc',
		name: 'NPC',
		silentValues: {},
		tagLink: true,
		linkPriority: true,
		cardImage: npcPortrait,
		color: '#18ff50',
		fields: [
			{
				// Label shown on the NPC's interaction prompt in-game. Absent means
				// the game's default prompt.
				name: 'interactText',
				type: 'string',
				optional: true
			},
			{
				// If present, the NPC starts its dialog on its own when the player
				// comes within triggerDistance, and can do so again after
				// retriggerDelay if that's set.
				name: 'proximityTrigger',
				type: 'object',
				optional: true,
				fields: [
					{name: 'triggerDistance', type: 'number', min: 0},
					{name: 'retriggerDelay', type: 'number', optional: true, min: 0}
				]
			}
		]
	},
	{
		id: 'setpiece',
		name: 'Setpiece',
		silentValues: {},
		nameOnly: true,
		cardImage: setpieceIcon,
		color: '#ff5628',
		fields: []
	},
	{
		// Changes how linked passages' text is presented in-game. Linked
		// passages carry e.g. `displayType:hint` and `sequence:oneShotRandom`
		// tags; a "default" value is the same as an unmodified passage, so it
		// adds no tag.
		id: 'textmodifier',
		name: 'Text Modifier',
		silentValues: {},
		tagLink: true,
		exclusiveLink: true,
		fieldTags: true,
		cardImage: textModifierIcon,
		color: '#2ec8ff',
		fields: [
			{
				name: 'displayType',
				type: 'string',
				enum: ['default', 'bark', 'hint', 'dialog']
			},
			{
				name: 'sequence',
				type: 'string',
				enum: ['default', 'oneShotOrdered', 'oneShotRandom']
			},
			{
				// Mirrored as `sequenceRepeatsLast:true` only while on; off or
				// absent adds no tag.
				name: 'sequenceRepeatsLast',
				type: 'boolean',
				optional: true
			}
		]
	}
];

/**
 * Looks up a template by ID, e.g. a passage's `dataTemplate` field. Returns
 * undefined for undefined or unknown IDs, so callers degrade gracefully if a
 * template is ever removed.
 */
export function dataNodeTemplate(
	id: string | undefined
): DataNodeTemplate | undefined {
	return dataNodeTemplates.find(template => template.id === id);
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Is a field's `requires` condition satisfied by the object containing it?
 */
export function templateRequirementMet(
	requires: DataTemplateFieldRequirement,
	container: JsonObject
) {
	return 'equals' in requires
		? container[requires.field] === requires.equals
		: container[requires.field] !== requires.notEqual;
}

/**
 * Resolves a string field's allowed options against the object containing it.
 * A plain list of options always applies; for a list of variants, the first
 * one whose `when` is satisfied applies. Returns undefined--any string is
 * allowed--for fields without an enum and variant lists where nothing
 * matches.
 */
export function templateFieldEnum(
	field: Pick<DataTemplateStringField, 'enum'>,
	container: JsonObject | undefined
): string[] | undefined {
	if (!field.enum?.length) {
		return undefined;
	}

	if (typeof field.enum[0] === 'string') {
		return field.enum as string[];
	}

	return (field.enum as DataTemplateEnumVariant[]).find(variant =>
		templateRequirementMet(variant.when, container ?? {})
	)?.options;
}

function matchesFieldType(
	field: DataTemplateField | DataTemplateArrayItem,
	value: JsonValue | undefined
) {
	switch (field.type) {
		case 'string':
			return typeof value === 'string';
		case 'number':
			return typeof value === 'number';
		case 'boolean':
			return typeof value === 'boolean';
		case 'object':
			return isJsonObject(value);
		case 'array':
			return Array.isArray(value);
	}
}

/**
 * Returns the value a field starts with when it's filled in or toggled on.
 * Object fields start with their required subfields, recursively; array
 * fields start empty. Also used for newly-added array items. `container` is
 * the object the field lives in, used to resolve conditional enums; fields
 * with sibling conditions should be declared after the fields they depend on
 * so their defaults see those values.
 */
export function templateFieldDefault(
	field: DataTemplateField | DataTemplateArrayItem,
	container?: JsonObject
): JsonValue {
	switch (field.type) {
		case 'string':
			return field.default ?? templateFieldEnum(field, container)?.[0] ?? '';
		case 'number':
			return field.default ?? field.min ?? 0;
		case 'boolean':
			return field.default ?? false;
		case 'object':
			return applyTemplateFields(field.fields, undefined);
		case 'array':
			return [];
	}
}

/**
 * Auto-fills a single array item to conform to its template, recursively.
 * Items whose type doesn't match are replaced with the item default.
 */
function applyItemTemplate(
	item: DataTemplateArrayItem,
	value: JsonValue
): JsonValue {
	if (!matchesFieldType(item, value)) {
		return templateFieldDefault(item);
	}

	if (item.type === 'object') {
		return applyTemplateFields(item.fields, value as JsonObject);
	}

	if (item.type === 'array') {
		return (value as JsonValue[]).map(element =>
			applyItemTemplate(item.item, element)
		);
	}

	return value;
}

function applyTemplateFields(
	fields: DataTemplateField[],
	existing: JsonObject | undefined
): JsonObject {
	const result: JsonObject = {};

	for (const field of fields) {
		const existingValue = existing?.[field.name];

		if (matchesFieldType(field, existingValue)) {
			result[field.name] =
				field.type === 'object'
					? applyTemplateFields(field.fields, existingValue as JsonObject)
					: field.type === 'array'
					? (existingValue as JsonValue[]).map(element =>
							applyItemTemplate(field.item, element)
					  )
					: (existingValue as JsonValue);
		} else if (!field.optional) {
			result[field.name] = templateFieldDefault(field, result);
		}
	}

	// Drop optional fields whose requirement isn't met by the merged result.

	for (const field of fields) {
		if (
			field.optional &&
			field.requires &&
			field.name in result &&
			!templateRequirementMet(field.requires, result)
		) {
			delete result[field.name];
		}
	}

	return result;
}

/**
 * Auto-fills a value to conform to a template: required fields are added with
 * their defaults, existing values are kept where the template has a matching
 * field of the same type, and everything else is dropped.
 */
export function applyTemplate(
	template: DataNodeTemplate,
	value: JsonValue
): JsonObject {
	return applyTemplateFields(
		template.fields,
		isJsonObject(value) ? value : undefined
	);
}

export interface DataTemplateError {
	message: string;
	/**
	 * Path to the offending value. For a missing field, this is the path of
	 * the object it's missing from.
	 */
	path: JsonPath;
}

function fieldTypeName(field: DataTemplateField | DataTemplateArrayItem) {
	return field.type === 'object' || field.type === 'array'
		? `an ${field.type}`
		: `a ${field.type}`;
}

/**
 * Checks a single value against a field or array item template. `label` names
 * the value in messages, e.g. `"amount"` or `item 2 of "rewards"`. `container`
 * is the object the value lives in, used to resolve conditional enums; array
 * items have none.
 */
function validateValue(
	field: DataTemplateField | DataTemplateArrayItem,
	value: JsonValue,
	label: string,
	path: JsonPath,
	template: DataNodeTemplate,
	errors: DataTemplateError[],
	container?: JsonObject
) {
	if (!matchesFieldType(field, value)) {
		errors.push({
			message: `${label} must be ${fieldTypeName(field)}`,
			path
		});
		return;
	}

	if (field.type === 'string') {
		const options = templateFieldEnum(field, container);

		if (options && !options.includes(value as string)) {
			errors.push({
				message: `${label} must be one of ${options
					.map(option => JSON.stringify(option))
					.join(', ')}`,
				path
			});
		}
	} else if (field.type === 'number') {
		const number = value as number;

		if (field.min !== undefined && number < field.min) {
			errors.push({
				message: `${label} must be at least ${field.min}`,
				path
			});
		} else if (field.max !== undefined && number > field.max) {
			errors.push({
				message: `${label} must be at most ${field.max}`,
				path
			});
		}
	} else if (field.type === 'object') {
		validateFields(field.fields, value as JsonObject, path, template, errors);
	} else if (field.type === 'array') {
		(value as JsonValue[]).forEach((element, index) => {
			validateValue(
				field.item,
				element,
				`item ${index + 1} of ${label}`,
				[...path, index],
				template,
				errors
			);
		});
	}
}

function validateFields(
	fields: DataTemplateField[],
	container: JsonObject,
	path: JsonPath,
	template: DataNodeTemplate,
	errors: DataTemplateError[]
) {
	for (const field of fields) {
		const value = container[field.name];
		const fieldPath = [...path, field.name];

		if (value === undefined) {
			if (!field.optional) {
				errors.push({
					message: `Missing required field "${field.name}"`,
					path
				});
			}

			continue;
		}

		if (field.requires && !templateRequirementMet(field.requires, container)) {
			errors.push({
				message: `"${field.name}" is only allowed when "${
					field.requires.field
				}" ${
					'equals' in field.requires
						? `is ${JSON.stringify(field.requires.equals)}`
						: `isn't ${JSON.stringify(field.requires.notEqual)}`
				}`,
				path: fieldPath
			});
		}

		validateValue(
			field,
			value,
			`"${field.name}"`,
			fieldPath,
			template,
			errors,
			container
		);
	}

	const known = new Set(fields.map(field => field.name));

	for (const key of Object.keys(container)) {
		if (known.has(key)) {
			continue;
		}

		if (path.length === 0 && key in template.silentValues) {
			errors.push({
				message: `"${key}" is added automatically by the ${template.name} template at export`,
				path: [key]
			});
		} else {
			errors.push({
				message: `"${key}" isn't part of the ${template.name} template`,
				path: [...path, key]
			});
		}
	}
}

/**
 * Checks a value against a template, returning all problems found. An empty
 * array means the value conforms.
 */
export function validateTemplateValue(
	template: DataNodeTemplate,
	root: JsonValue
): DataTemplateError[] {
	if (!isJsonObject(root)) {
		return [
			{message: `${template.name} data must be a JSON object`, path: []}
		];
	}

	const errors: DataTemplateError[] = [];

	validateFields(template.fields, root, [], template, errors);
	return errors;
}

/**
 * Returns a data node's parsed data with the template's silent values merged
 * in, for export. Silent values win over user data with the same keys.
 */
export function mergeSilentValues(
	template: DataNodeTemplate,
	data: unknown
): unknown {
	if (Object.keys(template.silentValues).length === 0) {
		return data;
	}

	if (!isJsonObject(data as JsonValue)) {
		return data;
	}

	return {...(data as JsonObject), ...template.silentValues};
}
