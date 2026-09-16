import * as React from 'react';
import {Thunk} from 'react-hook-thunk-reducer';
import {
	tagLinkName,
	tagsWithFieldTags,
	tagsWithoutOrphanedNegation,
	tagsWithoutOrphanedPriority
} from '../../../util/tag-link';
import {Passage, StoriesAction, StoriesState, Story} from '../stories.types';

/**
 * Deleting a tag-linked data node orphans its tag on every linked passage, so
 * remove those tags first--along with priority, negation and field tags that
 * no remaining link justifies. See util/tag-link.ts.
 */
function cleanUpTagLinks(
	story: Story,
	deletedPassages: Passage[],
	dispatch: React.Dispatch<StoriesAction>
) {
	const orphanedTags = deletedPassages
		.map(tagLinkName)
		.filter((tag): tag is string => tag !== undefined);

	if (orphanedTags.length === 0) {
		return;
	}

	const deletedIds = new Set(deletedPassages.map(passage => passage.id));
	const survivors = story.passages.filter(
		passage => !deletedIds.has(passage.id)
	);

	survivors.forEach(passage => {
		if (passage.tags.some(tag => orphanedTags.includes(tag))) {
			dispatch({
				type: 'updatePassage',
				passageId: passage.id,
				storyId: story.id,
				props: {
					tags: tagsWithFieldTags(
						tagsWithoutOrphanedNegation(
							tagsWithoutOrphanedPriority(
								passage.tags.filter(tag => !orphanedTags.includes(tag))
							)
						),
						survivors
					)
				}
			});
		}
	});
}

/**
 * Deletes a passage.
 */
export function deletePassage(
	story: Story,
	passage: Passage
): Thunk<StoriesState, StoriesAction> {
	if (!story.passages.some(p => p.id === passage.id)) {
		throw new Error('This passage does not belong to this story.');
	}

	return dispatch => {
		cleanUpTagLinks(story, [passage], dispatch);
		dispatch({type: 'deletePassage', storyId: story.id, passageId: passage.id});
	};
}

/**
 * Deletes multiple passages.
 */
export function deletePassages(
	story: Story,
	passages: Passage[]
): Thunk<StoriesState, StoriesAction> {
	return dispatch => {
		cleanUpTagLinks(story, passages, dispatch);
		dispatch({
			type: 'deletePassages',
			storyId: story.id,
			passageIds: passages.map(passage => passage.id)
		});
	};
}
