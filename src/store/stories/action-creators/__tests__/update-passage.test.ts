import {Story, StoriesState, StoriesDispatch} from '../../stories.types';
import {updatePassage} from '../update-passage';
import {fakeStory} from '../../../../test-util';
import {createNewlyLinkedPassages} from '../create-newly-linked-passages';
import {deleteOrphanedPassages} from '../delete-orphaned-passages';

jest.mock('../create-newly-linked-passages');
jest.mock('../delete-orphaned-passages');

describe('updatePassage action creator', () => {
	const createNewlyLinkedPassagesMock = createNewlyLinkedPassages as jest.Mock;
	const deleteOrphanedPassagesMock = deleteOrphanedPassages as jest.Mock;
	let dispatch: StoriesDispatch;
	let dispatchMock: jest.Mock;
	let getState: () => StoriesState;
	let story: Story;

	beforeEach(() => {
		dispatch = jest.fn();
		dispatchMock = dispatch as jest.Mock;
		story = fakeStory(1);
		getState = jest.fn(() => [story]);
	});

	describe('The thunk it returns', () => {
		it('calls dispatch with an updatePassage action type', () => {
			updatePassage(story, story.passages[0], {name: 'test name'})(
				dispatch,
				getState
			);
			expect(dispatchMock.mock.calls).toEqual([
				[
					{
						passageId: story.passages[0].id,
						props: {name: 'test name'},
						storyId: story.id,
						type: 'updatePassage'
					}
				]
			]);
		});

		it('dispatches update actions to update links to the passage if its name changes', () => {
			story = fakeStory(3);
			story.passages[0].name = 'a';
			story.passages[1].text = '[[a]]';
			story.passages[2].text = 'unlinked';
			updatePassage(
				story,
				story.passages[0],
				{name: 'test name'},
				{dontUpdateOthers: true}
			)(dispatch, getState);
			expect(dispatchMock.mock.calls).toEqual([
				[
					{
						passageId: story.passages[0].id,
						props: {name: 'test name'},
						storyId: story.id,
						type: 'updatePassage'
					}
				],
				[
					{
						passageId: story.passages[1].id,
						props: {text: '[[test name]]'},
						storyId: story.id,
						type: 'updatePassage'
					}
				]
			]);
		});

		it('handles passage name changes where the original name has regular expression characters correctly', () => {
			story = fakeStory(3);
			story.passages[0].name = '.*?\\1$1';
			story.passages[1].text = '[[.*?\\1$1]]';
			story.passages[2].text = 'unlinked';
			updatePassage(
				story,
				story.passages[0],
				{name: 'test name'},
				{dontUpdateOthers: true}
			)(dispatch, getState);
			expect(dispatchMock.mock.calls).toEqual([
				[
					{
						passageId: story.passages[0].id,
						props: {name: 'test name'},
						storyId: story.id,
						type: 'updatePassage'
					}
				],
				[
					{
						passageId: story.passages[1].id,
						props: {text: '[[test name]]'},
						storyId: story.id,
						type: 'updatePassage'
					}
				]
			]);
		});

		it('handles passage name changes where the new name has regular expression characters correctly', () => {
			story = fakeStory(3);
			story.passages[0].name = 'a';
			story.passages[1].text = '[[a]]';
			updatePassage(
				story,
				story.passages[0],
				{name: '.*?\\1$1'},
				{dontUpdateOthers: true}
			)(dispatch, getState);
			expect(dispatchMock.mock.calls).toEqual([
				[
					{
						passageId: story.passages[0].id,
						props: {name: '.*?\\1$1'},
						storyId: story.id,
						type: 'updatePassage'
					}
				],
				[
					{
						passageId: story.passages[1].id,
						props: {text: '[[.*?\\1$1]]'},
						storyId: story.id,
						type: 'updatePassage'
					}
				]
			]);
		});

		it('handles passage name changes where both old and new name has regular expression characters correctly', () => {
			story = fakeStory(3);
			story.passages[0].name = 'old .*?\\1$1';
			story.passages[1].text = '[[old .*?\\1$1]]';
			updatePassage(
				story,
				story.passages[0],
				{name: 'new .*?\\1$1'},
				{dontUpdateOthers: true}
			)(dispatch, getState);
			expect(dispatchMock.mock.calls).toEqual([
				[
					{
						passageId: story.passages[0].id,
						props: {name: 'new .*?\\1$1'},
						storyId: story.id,
						type: 'updatePassage'
					}
				],
				[
					{
						passageId: story.passages[1].id,
						props: {text: '[[new .*?\\1$1]]'},
						storyId: story.id,
						type: 'updatePassage'
					}
				]
			]);
		});

		describe('when a tag-linked data node changes', () => {
			beforeEach(() => {
				story = fakeStory(3);
				story.passages[0].name = 'Old Name';
				story.passages[0].type = 'data';
				story.passages[0].dataTemplate = 'trigger';
				story.passages[0].text = '{}';
				story.passages[1].tags = ['trigger:Old-Name', 'unrelated'];
				story.passages[1].text = 'no links here';
				story.passages[2].tags = [];
				story.passages[2].text = 'no links here';
			});

			it('moves tag links on other passages when the node is renamed', () => {
				updatePassage(
					story,
					story.passages[0],
					{name: 'New Name'},
					{dontUpdateOthers: true}
				)(dispatch, getState);
				expect(dispatchMock.mock.calls).toEqual([
					[
						{
							passageId: story.passages[0].id,
							props: {name: 'New Name'},
							storyId: story.id,
							type: 'updatePassage'
						}
					],
					[
						{
							passageId: story.passages[1].id,
							props: {tags: ['trigger:New-Name', 'unrelated']},
							storyId: story.id,
							type: 'updatePassage'
						}
					]
				]);
			});

			it('moves tag links on other passages when the node changes to another tag-linkable template', () => {
				updatePassage(
					story,
					story.passages[0],
					{dataTemplate: 'requirement'},
					{dontUpdateOthers: true}
				)(dispatch, getState);
				expect(dispatchMock.mock.calls).toEqual([
					[
						{
							passageId: story.passages[0].id,
							props: {dataTemplate: 'requirement'},
							storyId: story.id,
							type: 'updatePassage'
						}
					],
					[
						{
							passageId: story.passages[1].id,
							props: {tags: ['requirement:Old-Name', 'unrelated']},
							storyId: story.id,
							type: 'updatePassage'
						}
					]
				]);
			});

			it('moves negation tags on other passages when the node is renamed', () => {
				story.passages[1].tags = [
					'trigger:Old-Name',
					'not:Old-Name',
					'unrelated'
				];
				updatePassage(
					story,
					story.passages[0],
					{name: 'New Name'},
					{dontUpdateOthers: true}
				)(dispatch, getState);
				expect(dispatchMock.mock.calls[1]).toEqual([
					{
						passageId: story.passages[1].id,
						props: {
							tags: ['trigger:New-Name', 'not:New-Name', 'unrelated']
						},
						storyId: story.id,
						type: 'updatePassage'
					}
				]);
			});

			it("removes negation tags when the node's new template can't negate its links", () => {
				story.passages[1].tags = [
					'trigger:Old-Name',
					'not:Old-Name',
					'unrelated'
				];
				updatePassage(
					story,
					story.passages[0],
					{dataTemplate: 'npc'},
					{dontUpdateOthers: true}
				)(dispatch, getState);
				expect(dispatchMock.mock.calls[1]).toEqual([
					{
						passageId: story.passages[1].id,
						props: {tags: ['npc:Old-Name', 'unrelated']},
						storyId: story.id,
						type: 'updatePassage'
					}
				]);
			});

			it("carries the old tag's color over to the new tag", () => {
				story.tagColors = {'trigger:Old-Name': 'red'};
				updatePassage(
					story,
					story.passages[0],
					{name: 'New Name'},
					{dontUpdateOthers: true}
				)(dispatch, getState);
				expect(dispatchMock.mock.calls).toContainEqual([
					{
						props: {
							tagColors: {
								'trigger:Old-Name': 'red',
								'trigger:New-Name': 'red'
							}
						},
						storyId: story.id,
						type: 'updateStory'
					}
				]);
			});

			it("doesn't touch other passages' tags when the tag link is unchanged", () => {
				updatePassage(
					story,
					story.passages[0],
					{text: '{"changed": true}'},
					{dontUpdateOthers: true}
				)(dispatch, getState);
				expect(dispatchMock.mock.calls).toEqual([
					[
						{
							passageId: story.passages[0].id,
							props: {text: '{"changed": true}'},
							storyId: story.id,
							type: 'updatePassage'
						}
					]
				]);
			});

			it("removes the tag from other passages when the template changes to one that isn't tag-linkable", () => {
				updatePassage(
					story,
					story.passages[0],
					{dataTemplate: 'item-reward'},
					{dontUpdateOthers: true}
				)(dispatch, getState);
				expect(dispatchMock.mock.calls).toEqual([
					[
						{
							passageId: story.passages[0].id,
							props: {dataTemplate: 'item-reward'},
							storyId: story.id,
							type: 'updatePassage'
						}
					],
					[
						{
							passageId: story.passages[1].id,
							props: {tags: ['unrelated']},
							storyId: story.id,
							type: 'updatePassage'
						}
					]
				]);
			});

			it('removes the tag from other passages when the template is cleared', () => {
				updatePassage(
					story,
					story.passages[0],
					{dataTemplate: undefined},
					{dontUpdateOthers: true}
				)(dispatch, getState);
				expect(dispatchMock.mock.calls).toEqual([
					[
						{
							passageId: story.passages[0].id,
							props: {dataTemplate: undefined},
							storyId: story.id,
							type: 'updatePassage'
						}
					],
					[
						{
							passageId: story.passages[1].id,
							props: {tags: ['unrelated']},
							storyId: story.id,
							type: 'updatePassage'
						}
					]
				]);
			});
		});

		it("throws an error if the passage doesn't belong to the story", () =>
			expect(() =>
				updatePassage(
					story,
					{...story.passages[0], id: 'nonexistent'},
					{name: 'test name'}
				)(dispatch, getState)
			).toThrow());

		it('throws an error if the passage is being renamed to a name that already exists', () => {
			story = fakeStory(2);

			expect(() =>
				updatePassage(story, story.passages[0], {
					name: story.passages[1].name
				})(dispatch, getState)
			).toThrow();
		});

		it('calls deleteOrphanedPassages when text is changed', () => {
			const oldText = story.passages[0].text;

			updatePassage(story, story.passages[0], {text: 'new text'})(
				dispatch,
				getState
			);
			expect(deleteOrphanedPassagesMock.mock.calls).toEqual([
				[story, story.passages[0], 'new text', oldText]
			]);
		});

		it("doesn't call deleteOrphanedPassages if text isn't being changed", () => {
			updatePassage(story, story.passages[0], {name: 'new name'})(
				dispatch,
				getState
			);
			expect(deleteOrphanedPassagesMock).not.toBeCalled();
		});

		it("doesn't call deleteOrphanedPassages if the dontUpdateOthers option is true", () => {
			updatePassage(
				story,
				story.passages[0],
				{text: 'new text'},
				{dontUpdateOthers: true}
			)(dispatch, getState);
			expect(deleteOrphanedPassagesMock).not.toBeCalled();
		});

		it('deletes orphans before creating new passages', () => {
			updatePassage(story, story.passages[0], {text: 'new text'})(
				dispatch,
				getState
			);
			expect(
				deleteOrphanedPassagesMock.mock.invocationCallOrder[0]
			).toBeLessThan(createNewlyLinkedPassagesMock.mock.invocationCallOrder[0]);
		});

		it('calls createNewlyLinkedPassages with the most recent state when text is changed', () => {
			const oldText = story.passages[0].text;

			updatePassage(story, story.passages[0], {text: 'new text'})(
				dispatch,
				getState
			);
			expect(getState).toBeCalledTimes(1);
			expect(createNewlyLinkedPassagesMock.mock.calls).toEqual([
				[story, story.passages[0], 'new text', oldText]
			]);
		});

		it("doesn't call createNewlyLinkedPassages if text isn't being changed", () => {
			updatePassage(story, story.passages[0], {name: 'new name'})(
				dispatch,
				getState
			);
			expect(createNewlyLinkedPassagesMock).not.toBeCalled();
		});

		it("doesn't call createNewlyLinkedPassages if the dontUpdateOthers option is true", () => {
			updatePassage(
				story,
				story.passages[0],
				{text: 'new text'},
				{dontUpdateOthers: true}
			)(dispatch, getState);
			expect(createNewlyLinkedPassagesMock).not.toBeCalled();
		});
	});
});

describe('updatePassage action creator with a text modifier node', () => {
	let dispatch: StoriesDispatch;
	let dispatchMock: jest.Mock;
	let getState: () => StoriesState;
	let story: Story;

	beforeEach(() => {
		dispatch = jest.fn();
		dispatchMock = dispatch as jest.Mock;
		story = fakeStory(3);
		story.passages[0].name = 'Hint Mod';
		story.passages[0].type = 'data';
		story.passages[0].dataTemplate = 'textmodifier';
		story.passages[0].text = '{"displayType": "hint"}';
		story.passages[1].tags = [
			'textmodifier:Hint-Mod',
			'displayType:hint',
			'unrelated'
		];
		story.passages[1].text = 'no links here';
		story.passages[2].tags = ['displayType:hint'];
		story.passages[2].text = 'no links here';
		getState = jest.fn(() => [story]);
	});

	it("updates linked passages' field tags when the node's data changes", () => {
		updatePassage(
			story,
			story.passages[0],
			{text: '{"displayType": "bark"}'},
			{dontUpdateOthers: true}
		)(dispatch, getState);
		expect(dispatchMock.mock.calls).toEqual([
			[
				{
					passageId: story.passages[0].id,
					props: {text: '{"displayType": "bark"}'},
					storyId: story.id,
					type: 'updatePassage'
				}
			],
			[
				{
					passageId: story.passages[1].id,
					props: {
						tags: ['textmodifier:Hint-Mod', 'unrelated', 'displayType:bark']
					},
					storyId: story.id,
					type: 'updatePassage'
				}
			]
		]);
	});

	it("removes linked passages' field tags when the node's data returns to defaults", () => {
		updatePassage(
			story,
			story.passages[0],
			{text: '{"displayType": "default"}'},
			{dontUpdateOthers: true}
		)(dispatch, getState);
		expect(dispatchMock.mock.calls[1]).toEqual([
			{
				passageId: story.passages[1].id,
				props: {tags: ['textmodifier:Hint-Mod', 'unrelated']},
				storyId: story.id,
				type: 'updatePassage'
			}
		]);
	});

	it('changes one field tag without disturbing another', () => {
		story.passages[0].text =
			'{"displayType": "hint", "sequence": "oneShotRandom"}';
		story.passages[1].tags = [
			'textmodifier:Hint-Mod',
			'displayType:hint',
			'sequence:oneShotRandom',
			'unrelated'
		];
		updatePassage(
			story,
			story.passages[0],
			{text: '{"displayType": "hint", "sequence": "oneShotOrdered"}'},
			{dontUpdateOthers: true}
		)(dispatch, getState);
		expect(dispatchMock.mock.calls[1]).toEqual([
			{
				passageId: story.passages[1].id,
				props: {
					tags: [
						'textmodifier:Hint-Mod',
						'displayType:hint',
						'unrelated',
						'sequence:oneShotOrdered'
					]
				},
				storyId: story.id,
				type: 'updatePassage'
			}
		]);
	});

	it("doesn't touch linked passages when the data change leaves field tags the same", () => {
		updatePassage(
			story,
			story.passages[0],
			{text: '{\n  "displayType": "hint"\n}'},
			{dontUpdateOthers: true}
		)(dispatch, getState);
		expect(dispatchMock.mock.calls).toHaveLength(1);
	});

	it('keeps field tags on linked passages when the node is renamed', () => {
		updatePassage(
			story,
			story.passages[0],
			{name: 'Renamed'},
			{dontUpdateOthers: true}
		)(dispatch, getState);
		expect(dispatchMock.mock.calls[1]).toEqual([
			{
				passageId: story.passages[1].id,
				props: {
					tags: ['textmodifier:Renamed', 'displayType:hint', 'unrelated']
				},
				storyId: story.id,
				type: 'updatePassage'
			}
		]);
	});

	it("removes field tags when the node's new template doesn't mirror fields", () => {
		updatePassage(
			story,
			story.passages[0],
			{dataTemplate: 'trigger'},
			{dontUpdateOthers: true}
		)(dispatch, getState);
		expect(dispatchMock.mock.calls[1]).toEqual([
			{
				passageId: story.passages[1].id,
				props: {tags: ['trigger:Hint-Mod', 'unrelated']},
				storyId: story.id,
				type: 'updatePassage'
			}
		]);
	});
});
