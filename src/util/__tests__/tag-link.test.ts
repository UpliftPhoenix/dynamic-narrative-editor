import {fakePassage} from '../../test-util';
import {
	fieldTag,
	isFieldTag,
	isNegationTag,
	nodeFieldTags,
	nodeNegationTag,
	tagLinkHandleOrigin,
	tagLinkHasNegation,
	tagLinkName,
	tagLinkNegationTag,
	tagLinkNodeName,
	tagsWithFieldTags,
	tagsWithNegation,
	tagsWithoutCompetingLinks,
	tagsWithoutOrphanedNegation
} from '../tag-link';

describe('tagLinkNodeName', () => {
	it('leaves names without whitespace alone', () =>
		expect(tagLinkNodeName('MyTrigger')).toBe('MyTrigger'));

	it('replaces runs of whitespace with dashes', () =>
		expect(tagLinkNodeName('Untitled  Data\tNode')).toBe('Untitled-Data-Node'));

	it('trims leading and trailing whitespace', () =>
		expect(tagLinkNodeName('  spaced out  ')).toBe('spaced-out'));
});

describe('tagLinkName', () => {
	it('returns templateId:nodeName for data nodes with a tag-linkable template', () => {
		expect(
			tagLinkName(
				fakePassage({dataTemplate: 'trigger', name: 'My Trigger', type: 'data'})
			)
		).toBe('trigger:My-Trigger');
		expect(
			tagLinkName(
				fakePassage({dataTemplate: 'requirement', name: 'Req', type: 'data'})
			)
		).toBe('requirement:Req');
		expect(
			tagLinkName(
				fakePassage({dataTemplate: 'npc', name: 'Shop Keeper', type: 'data'})
			)
		).toBe('npc:Shop-Keeper');
	});

	it('returns undefined for regular passages', () => {
		expect(tagLinkName(fakePassage())).toBeUndefined();
		expect(
			tagLinkName(fakePassage({dataTemplate: 'trigger'}))
		).toBeUndefined();
	});

	it('returns undefined for data nodes without a template', () =>
		expect(tagLinkName(fakePassage({type: 'data'}))).toBeUndefined());

	it("returns undefined for data nodes whose template isn't tag-linkable", () =>
		expect(
			tagLinkName(fakePassage({dataTemplate: 'item-reward', type: 'data'}))
		).toBeUndefined());

	it('returns undefined for data nodes with an unknown template', () =>
		expect(
			tagLinkName(fakePassage({dataTemplate: 'nonexistent', type: 'data'}))
		).toBeUndefined());
});

describe('tagLinkHandleOrigin', () => {
	it("returns the center of the node's right edge", () =>
		expect(
			tagLinkHandleOrigin({left: 10, top: 20, width: 100, height: 50})
		).toEqual({left: 110, top: 45}));
});

describe('isNegationTag', () => {
	it('returns true for tags beginning with not:', () => {
		expect(isNegationTag('not:My-Trigger')).toBe(true);
		expect(isNegationTag('not:')).toBe(true);
	});

	it('returns false for other tags', () => {
		expect(isNegationTag('trigger:My-Trigger')).toBe(false);
		expect(isNegationTag('nope')).toBe(false);
		expect(isNegationTag('priority:1')).toBe(false);
	});
});

describe('tagLinkHasNegation', () => {
	it('returns true for tag links to templates that allow negation', () => {
		expect(tagLinkHasNegation('trigger:My-Trigger')).toBe(true);
		expect(tagLinkHasNegation('requirement:Req')).toBe(true);
	});

	it("returns false for tag links to templates that don't", () =>
		expect(tagLinkHasNegation('npc:Shop-Keeper')).toBe(false));

	it("returns false for tags that aren't tag links", () => {
		expect(tagLinkHasNegation('unrelated')).toBe(false);
		expect(tagLinkHasNegation('nonexistent:Thing')).toBe(false);
	});
});

describe('tagLinkNegationTag', () => {
	it('returns the negation tag for a negatable tag link', () => {
		expect(tagLinkNegationTag('trigger:My-Trigger')).toBe('not:My-Trigger');
		expect(tagLinkNegationTag('requirement:Req')).toBe('not:Req');
	});

	it('returns undefined for tags whose links cannot be negated', () => {
		expect(tagLinkNegationTag('npc:Shop-Keeper')).toBeUndefined();
		expect(tagLinkNegationTag('unrelated')).toBeUndefined();
	});
});

describe('nodeNegationTag', () => {
	it('returns the negation tag for a data node whose links can be negated', () =>
		expect(
			nodeNegationTag(
				fakePassage({dataTemplate: 'trigger', name: 'My Trigger', type: 'data'})
			)
		).toBe('not:My-Trigger'));

	it('returns undefined for nodes whose links cannot be negated', () => {
		expect(
			nodeNegationTag(
				fakePassage({dataTemplate: 'npc', name: 'Shop Keeper', type: 'data'})
			)
		).toBeUndefined();
		expect(nodeNegationTag(fakePassage())).toBeUndefined();
	});
});

describe('tagsWithNegation', () => {
	it('adds the negation tag when negating', () =>
		expect(
			tagsWithNegation(['trigger:My-Trigger'], 'not:My-Trigger', true)
		).toEqual(['trigger:My-Trigger', 'not:My-Trigger']));

	it("doesn't add the negation tag twice", () =>
		expect(
			tagsWithNegation(
				['trigger:My-Trigger', 'not:My-Trigger'],
				'not:My-Trigger',
				true
			)
		).toEqual(['trigger:My-Trigger', 'not:My-Trigger']));

	it('removes the negation tag when un-negating', () =>
		expect(
			tagsWithNegation(
				['trigger:My-Trigger', 'not:My-Trigger', 'unrelated'],
				'not:My-Trigger',
				false
			)
		).toEqual(['trigger:My-Trigger', 'unrelated']));

	it('leaves other negation tags alone', () =>
		expect(
			tagsWithNegation(['not:Other'], 'not:My-Trigger', false)
		).toEqual(['not:Other']));
});

describe('tagsWithoutOrphanedNegation', () => {
	it('keeps negation tags justified by a negatable tag link', () =>
		expect(
			tagsWithoutOrphanedNegation([
				'trigger:My-Trigger',
				'not:My-Trigger',
				'unrelated'
			])
		).toEqual(['trigger:My-Trigger', 'not:My-Trigger', 'unrelated']));

	it('removes negation tags with no matching tag link', () =>
		expect(
			tagsWithoutOrphanedNegation(['trigger:My-Trigger', 'not:Other'])
		).toEqual(['trigger:My-Trigger']));

	it("removes negation tags whose tag link can't be negated", () =>
		expect(
			tagsWithoutOrphanedNegation(['npc:Shop-Keeper', 'not:Shop-Keeper'])
		).toEqual(['npc:Shop-Keeper']));

	it('leaves tags without any negation tags alone', () =>
		expect(tagsWithoutOrphanedNegation(['trigger:My-Trigger'])).toEqual([
			'trigger:My-Trigger'
		]));
});

describe('tagsWithoutCompetingLinks', () => {
	it('removes tag links to other nodes of an exclusive template', () =>
		expect(
			tagsWithoutCompetingLinks(
				['textmodifier:Old', 'unrelated', 'trigger:My-Trigger'],
				'textmodifier:New'
			)
		).toEqual(['unrelated', 'trigger:My-Trigger']));

	it('keeps the link itself if already present', () =>
		expect(
			tagsWithoutCompetingLinks(['textmodifier:Same'], 'textmodifier:Same')
		).toEqual(['textmodifier:Same']));

	it("leaves tags alone for templates whose links aren't exclusive", () =>
		expect(
			tagsWithoutCompetingLinks(['trigger:Old', 'unrelated'], 'trigger:New')
		).toEqual(['trigger:Old', 'unrelated']));
});

describe('isFieldTag', () => {
	it('returns true for tags naming a field of a field-tag template', () => {
		expect(isFieldTag('displayType:hint')).toBe(true);
		expect(isFieldTag('displayType:anything')).toBe(true);
	});

	it('recognizes every field of a field-tag template', () => {
		expect(isFieldTag('sequence:oneShotRandom')).toBe(true);
		expect(isFieldTag('sequence:default')).toBe(true);
	});

	it('returns false for other tags', () => {
		expect(isFieldTag('displayType')).toBe(false);
		expect(isFieldTag('trigger:My-Trigger')).toBe(false);
		expect(isFieldTag('dialog_text:hi')).toBe(false);
		expect(isFieldTag('plain')).toBe(false);
	});
});

describe('fieldTag', () => {
	it('joins the field name and value with a colon', () => {
		expect(fieldTag('displayType', 'hint')).toBe('displayType:hint');
		expect(fieldTag('count', 3)).toBe('count:3');
		expect(fieldTag('flag', true)).toBe('flag:true');
	});

	it('replaces whitespace in the value with dashes', () =>
		expect(fieldTag('displayType', ' two  words ')).toBe(
			'displayType:two-words'
		));
});

describe('nodeFieldTags', () => {
	const modifier = (text: string) =>
		fakePassage({
			dataTemplate: 'textmodifier',
			name: 'Mod',
			text,
			type: 'data'
		});

	it('returns a tag for each non-default field', () => {
		expect(nodeFieldTags(modifier('{"displayType": "hint"}'))).toEqual([
			'displayType:hint'
		]);
		expect(nodeFieldTags(modifier('{"displayType": "bark"}'))).toEqual([
			'displayType:bark'
		]);
	});

	it('returns one tag per non-default field, in template order', () => {
		expect(
			nodeFieldTags(
				modifier('{"sequence": "oneShotRandom", "displayType": "bark"}')
			)
		).toEqual(['displayType:bark', 'sequence:oneShotRandom']);
		expect(
			nodeFieldTags(
				modifier('{"displayType": "default", "sequence": "oneShotOrdered"}')
			)
		).toEqual(['sequence:oneShotOrdered']);
	});

	it('omits fields holding their default value', () => {
		expect(nodeFieldTags(modifier('{"displayType": "default"}'))).toEqual(
			[]
		);
		expect(
			nodeFieldTags(
				modifier('{"displayType": "default", "sequence": "default"}')
			)
		).toEqual([]);
	});

	it('omits fields that are missing, empty, or not scalars', () => {
		expect(nodeFieldTags(modifier('{}'))).toEqual([]);
		expect(nodeFieldTags(modifier('{"displayType": ""}'))).toEqual([]);
		expect(nodeFieldTags(modifier('{"displayType": {"a": 1}}'))).toEqual(
			[]
		);
	});

	it("ignores fields that aren't part of the template", () =>
		expect(nodeFieldTags(modifier('{"other": "value"}'))).toEqual([]));

	it("returns nothing when the node's text isn't a JSON object", () => {
		expect(nodeFieldTags(modifier('not json'))).toEqual([]);
		expect(nodeFieldTags(modifier('[1, 2]'))).toEqual([]);
	});

	it("returns nothing for nodes whose template doesn't mirror fields", () => {
		expect(
			nodeFieldTags(
				fakePassage({
					dataTemplate: 'trigger',
					text: '{"dialog_text": "hi"}',
					type: 'data'
				})
			)
		).toEqual([]);
		expect(
			nodeFieldTags(fakePassage({text: '{"displayType": "hint"}'}))
		).toEqual([]);
	});
});

describe('tagsWithFieldTags', () => {
	const hintNode = fakePassage({
		dataTemplate: 'textmodifier',
		name: 'Hint Mod',
		text: '{"displayType": "hint"}',
		type: 'data'
	});
	const barkNode = fakePassage({
		dataTemplate: 'textmodifier',
		name: 'Bark Mod',
		text: '{"displayType": "bark"}',
		type: 'data'
	});
	const defaultNode = fakePassage({
		dataTemplate: 'textmodifier',
		name: 'Default Mod',
		text: '{"displayType": "default"}',
		type: 'data'
	});
	const passages = [hintNode, barkNode, defaultNode, fakePassage()];

	it('adds field tags from linked nodes', () =>
		expect(
			tagsWithFieldTags(['textmodifier:Hint-Mod', 'unrelated'], passages)
		).toEqual(['textmodifier:Hint-Mod', 'unrelated', 'displayType:hint']));

	it('adds nothing for a linked node whose fields are all default', () =>
		expect(tagsWithFieldTags(['textmodifier:Default-Mod'], passages)).toEqual(
			['textmodifier:Default-Mod']
		));

	it('removes field tags no linked node justifies', () => {
		expect(
			tagsWithFieldTags(['displayType:hint', 'unrelated'], passages)
		).toEqual(['unrelated']);
		expect(
			tagsWithFieldTags(['textmodifier:Bark-Mod', 'displayType:hint'], passages)
		).toEqual(['textmodifier:Bark-Mod', 'displayType:bark']);
	});

	it('keeps field tags that still apply in place', () =>
		expect(
			tagsWithFieldTags(
				['displayType:hint', 'textmodifier:Hint-Mod', 'unrelated'],
				passages
			)
		).toEqual(['displayType:hint', 'textmodifier:Hint-Mod', 'unrelated']));

	it('leaves tags alone when no field tags or field-tag links are involved', () => {
		const tags = ['trigger:My-Trigger', 'priority:1', 'unrelated'];

		expect(tagsWithFieldTags(tags, passages)).toBe(tags);
	});
});
