import {StoriesDispatch, StoriesState, Story} from '../../stories.types';
import {fakeStory} from '../../../../test-util';
import {colorString} from '../../../../util/color';
import {connectTagLink} from '../connect-tag-link';

describe('connectTagLink action creator', () => {
	let dispatch: StoriesDispatch;
	let dispatchMock: jest.Mock;
	let getState: () => StoriesState;
	let story: Story;

	beforeEach(() => {
		dispatch = jest.fn();
		dispatchMock = dispatch as jest.Mock;
		story = fakeStory(3);
		story.passages[0].name = 'My Trigger';
		story.passages[0].type = 'data';
		story.passages[0].dataTemplate = 'trigger';
		story.passages[0].text = '{}';
		story.passages[1].tags = ['unrelated'];
		story.passages[2].tags = [];
		getState = jest.fn(() => [story]);
	});

	it("adds the node's tag link to the passage and assigns the tag a color if it's new", () => {
		connectTagLink(story, story.passages[0], story.passages[1])(
			dispatch,
			getState
		);
		expect(dispatchMock.mock.calls).toEqual([
			[
				{
					type: 'updateStory',
					storyId: story.id,
					props: {
						tagColors: {
							...story.tagColors,
							'trigger:My-Trigger': colorString('trigger:My-Trigger')
						}
					}
				}
			],
			[
				{
					type: 'updatePassage',
					passageId: story.passages[1].id,
					storyId: story.id,
					props: {tags: ['unrelated', 'trigger:My-Trigger']}
				}
			]
		]);
	});

	it("doesn't assign a color if the tag is already in use", () => {
		story.passages[2].tags = ['trigger:My-Trigger'];
		connectTagLink(story, story.passages[0], story.passages[1])(
			dispatch,
			getState
		);
		expect(dispatchMock.mock.calls).toEqual([
			[
				{
					type: 'updatePassage',
					passageId: story.passages[1].id,
					storyId: story.id,
					props: {tags: ['unrelated', 'trigger:My-Trigger']}
				}
			]
		]);
	});

	it('adds a priority tag one past the last linked passage for priority-ranked templates', () => {
		story.passages[0].name = 'Shop Keeper';
		story.passages[0].dataTemplate = 'npc';
		story.passages[2].tags = ['npc:Shop-Keeper', 'priority:1'];
		connectTagLink(story, story.passages[0], story.passages[1])(
			dispatch,
			getState
		);
		// The tag is already in use, so no color is assigned first.
		expect(dispatchMock.mock.calls[0]).toEqual([
			{
				type: 'updatePassage',
				passageId: story.passages[1].id,
				storyId: story.id,
				props: {tags: ['unrelated', 'npc:Shop-Keeper', 'priority:2']}
			}
		]);
	});

	it("throws if the node's template doesn't allow tag links", () => {
		story.passages[0].dataTemplate = 'setpiece';
		expect(() =>
			connectTagLink(story, story.passages[0], story.passages[1])
		).toThrow();
	});

	it('throws if the passage is already linked to the node', () => {
		story.passages[1].tags = ['trigger:My-Trigger'];
		expect(() =>
			connectTagLink(story, story.passages[0], story.passages[1])
		).toThrow();
	});

	describe('with a text modifier node', () => {
		beforeEach(() => {
			story.passages[0].name = 'Hint Mod';
			story.passages[0].dataTemplate = 'textmodifier';
			story.passages[0].text = '{"displayType": "hint"}';
		});

		it("mirrors the node's fields onto the passage as tags", () => {
			connectTagLink(story, story.passages[0], story.passages[1])(
				dispatch,
				getState
			);
			expect(dispatchMock.mock.calls[1]).toEqual([
				{
					type: 'updatePassage',
					passageId: story.passages[1].id,
					storyId: story.id,
					props: {
						tags: ['unrelated', 'textmodifier:Hint-Mod', 'displayType:hint']
					}
				}
			]);
		});

		it('adds no field tag when the node holds default values', () => {
			story.passages[0].text = '{"displayType": "default"}';
			connectTagLink(story, story.passages[0], story.passages[1])(
				dispatch,
				getState
			);
			expect(dispatchMock.mock.calls[1]).toEqual([
				{
					type: 'updatePassage',
					passageId: story.passages[1].id,
					storyId: story.id,
					props: {tags: ['unrelated', 'textmodifier:Hint-Mod']}
				}
			]);
		});

		it('replaces an existing link to another text modifier and its field tags', () => {
			story.passages[2].name = 'Bark Mod';
			story.passages[2].type = 'data';
			story.passages[2].dataTemplate = 'textmodifier';
			story.passages[2].text = '{"displayType": "bark"}';
			story.passages[1].tags = [
				'textmodifier:Bark-Mod',
				'displayType:bark',
				'unrelated'
			];
			connectTagLink(story, story.passages[0], story.passages[1])(
				dispatch,
				getState
			);
			expect(dispatchMock.mock.calls[1]).toEqual([
				{
					type: 'updatePassage',
					passageId: story.passages[1].id,
					storyId: story.id,
					props: {
						tags: ['unrelated', 'textmodifier:Hint-Mod', 'displayType:hint']
					}
				}
			]);
		});

		it('leaves links to nodes of other templates alone', () => {
			story.passages[1].tags = ['trigger:Other', 'not:Other'];
			connectTagLink(story, story.passages[0], story.passages[1])(
				dispatch,
				getState
			);
			expect(dispatchMock.mock.calls[1]).toEqual([
				{
					type: 'updatePassage',
					passageId: story.passages[1].id,
					storyId: story.id,
					props: {
						tags: [
							'trigger:Other',
							'not:Other',
							'textmodifier:Hint-Mod',
							'displayType:hint'
						]
					}
				}
			]);
		});
	});
});
