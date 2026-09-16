import {StoriesDispatch, StoriesState, Story} from '../../stories.types';
import {fakePassage, fakeStory} from '../../../../test-util';
import {deletePassage, deletePassages} from '../delete-passage';

describe('deletePassage action creator', () => {
	let dispatch: StoriesDispatch;
	let dispatchMock: jest.Mock;
	let getState: () => StoriesState;
	let story: Story;

	beforeEach(() => {
		dispatch = jest.fn();
		dispatchMock = dispatch as jest.Mock;
		story = fakeStory();
		getState = jest.fn(() => [story]);
	});

	it('dispatches a deletePassage action', () => {
		deletePassage(story, story.passages[0])(dispatch, getState);
		expect(dispatchMock.mock.calls).toEqual([
			[
				{
					type: 'deletePassage',
					passageId: story.passages[0].id,
					storyId: story.id
				}
			]
		]);
	});

	it("throws an error if the passage doesn't belong to the story", () => {
		expect(() => deletePassage(story, fakePassage())).toThrow();
	});

	it('removes tag links to a deleted data node from other passages', () => {
		story = fakeStory(2);
		story.passages[0].name = 'My Trigger';
		story.passages[0].type = 'data';
		story.passages[0].dataTemplate = 'trigger';
		story.passages[1].tags = ['trigger:My-Trigger', 'unrelated'];
		deletePassage(story, story.passages[0])(dispatch, getState);
		expect(dispatchMock.mock.calls).toEqual([
			[
				{
					type: 'updatePassage',
					passageId: story.passages[1].id,
					props: {tags: ['unrelated']},
					storyId: story.id
				}
			],
			[
				{
					type: 'deletePassage',
					passageId: story.passages[0].id,
					storyId: story.id
				}
			]
		]);
	});

	it('removes the negation tag belonging to a deleted data node', () => {
		story = fakeStory(2);
		story.passages[0].name = 'My Trigger';
		story.passages[0].type = 'data';
		story.passages[0].dataTemplate = 'trigger';
		story.passages[1].tags = [
			'trigger:My-Trigger',
			'not:My-Trigger',
			'unrelated'
		];
		deletePassage(story, story.passages[0])(dispatch, getState);
		expect(dispatchMock.mock.calls[0]).toEqual([
			{
				type: 'updatePassage',
				passageId: story.passages[1].id,
				props: {tags: ['unrelated']},
				storyId: story.id
			}
		]);
	});
});

describe('deletePassages action creator', () => {
	let dispatch: StoriesDispatch;
	let dispatchMock: jest.Mock;
	let getState: () => StoriesState;
	let story: Story;

	beforeEach(() => {
		dispatch = jest.fn();
		dispatchMock = dispatch as jest.Mock;
		story = fakeStory(3);
		getState = jest.fn(() => [story]);
	});

	it('dispatches a deletePassages action', () => {
		deletePassages(story, [story.passages[0], story.passages[1]])(
			dispatch,
			getState
		);
		expect(dispatchMock.mock.calls).toEqual([
			[
				{
					type: 'deletePassages',
					passageIds: [story.passages[0].id, story.passages[1].id],
					storyId: story.id
				}
			]
		]);
	});

	it('removes tag links to deleted data nodes from surviving passages only', () => {
		story.passages[0].name = 'My Trigger';
		story.passages[0].type = 'data';
		story.passages[0].dataTemplate = 'trigger';
		story.passages[1].tags = ['trigger:My-Trigger'];
		story.passages[2].tags = ['trigger:My-Trigger', 'kept'];
		deletePassages(story, [story.passages[0], story.passages[1]])(
			dispatch,
			getState
		);
		expect(dispatchMock.mock.calls).toEqual([
			[
				{
					type: 'updatePassage',
					passageId: story.passages[2].id,
					props: {tags: ['kept']},
					storyId: story.id
				}
			],
			[
				{
					type: 'deletePassages',
					passageIds: [story.passages[0].id, story.passages[1].id],
					storyId: story.id
				}
			]
		]);
	});
});

describe('deletePassage action creator with field tags', () => {
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
		story.passages[2].tags = ['unrelated'];
		getState = jest.fn(() => [story]);
	});

	it('removes the field tags a deleted text modifier justified', () => {
		deletePassage(story, story.passages[0])(dispatch, getState);
		expect(dispatchMock.mock.calls[0]).toEqual([
			{
				type: 'updatePassage',
				passageId: story.passages[1].id,
				props: {tags: ['unrelated']},
				storyId: story.id
			}
		]);
	});

	it("doesn't touch passages that weren't linked to the deleted node", () => {
		deletePassage(story, story.passages[0])(dispatch, getState);
		expect(dispatchMock.mock.calls).toHaveLength(2);
		expect(dispatchMock.mock.calls[1][0].type).toBe('deletePassage');
	});
});
