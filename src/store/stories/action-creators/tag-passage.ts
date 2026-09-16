import {
	Passage,
	StoriesAction,
	StoriesState,
	Story,
	UpdatePassageAction
} from '../stories.types';
import {isValidTagName} from '../../../util/tag';
import {
	tagLinkTemplate,
	tagsWithFieldTags,
	tagsWithoutOrphanedNegation
} from '../../../util/tag-link';
import {storyPassageTags} from '../getters';
import {Thunk} from 'react-hook-thunk-reducer';
import {colorString} from '../../../util/color';

/**
 * Adds a tag to a passage. Adding a tag link by hand makes the link, so if the
 * linked node mirrors its fields as tags, those come along--see
 * util/tag-link.ts.
 */
export function addPassageTag(
	story: Story,
	passage: Passage,
	tagName: string
): Thunk<StoriesState, StoriesAction> {
	if (passage.story !== story.id) {
		throw new Error('This passage does not belong to this story.');
	}

	if (!isValidTagName(tagName)) {
		throw new Error(`"${tagName}" is not a valid tag name.`);
	}

	if (passage.tags.includes(tagName)) {
		throw new Error(`This passage already has the tag "${tagName}".`);
	}

	return dispatch => {
		// If this is the first time a tag is being added to this story, assign it a
		// color.

		if (!storyPassageTags(story).includes(tagName)) {
			dispatch({
				type: 'updateStory',
				storyId: story.id,
				props: {
					tagColors: {
						...story.tagColors,
						[tagName]: colorString(tagName)
					}
				}
			});
		}

		dispatch({
			type: 'updatePassage',
			passageId: passage.id,
			storyId: story.id,
			props: {
				tags: tagLinkTemplate(tagName)?.fieldTags
					? tagsWithFieldTags([...passage.tags, tagName], story.passages)
					: [...passage.tags, tagName]
			}
		});
	};
}

/**
 * Removes a tag from a passage. Removing a tag link this way breaks the link,
 * so any negation or field tags it justified go with it--see
 * util/tag-link.ts.
 */
export function removePassageTag(
	story: Story,
	passage: Passage,
	tagName: string
): UpdatePassageAction {
	if (passage.story !== story.id) {
		throw new Error('This passage does not belong to this story.');
	}

	if (!isValidTagName(tagName)) {
		throw new Error(`"${tagName}" is not a valid tag name.`);
	}

	if (!passage.tags.includes(tagName)) {
		throw new Error(`This passage does not have the tag "${tagName}".`);
	}

	const remaining = tagsWithoutOrphanedNegation(
		passage.tags.filter(t => t !== tagName)
	);

	return {
		type: 'updatePassage',
		passageId: passage.id,
		storyId: story.id,
		props: {
			tags: tagLinkTemplate(tagName)?.fieldTags
				? tagsWithFieldTags(remaining, story.passages)
				: remaining
		}
	};
}
