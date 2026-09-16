import escapeRegExp from 'lodash/escapeRegExp';
import {Thunk} from 'react-hook-thunk-reducer';
import isEqual from 'lodash/isEqual';
import {dataNodeTemplate} from '../../../util/data-node-templates';
import {
	tagLinkName,
	tagLinkNegationTag,
	tagsWithFieldTags,
	tagsWithoutOrphanedNegation,
	tagsWithoutOrphanedPriority
} from '../../../util/tag-link';
import {storyWithId} from '../getters';
import {Passage, StoriesAction, StoriesState, Story} from '../stories.types';
import {createNewlyLinkedPassages} from './create-newly-linked-passages';
import {deleteOrphanedPassages} from './delete-orphaned-passages';

export interface UpdatePassageOptions {
	dontUpdateOthers?: boolean;
}

/**
 * General update of a passage.
 */
export function updatePassage(
	story: Story,
	passage: Passage,
	props: Partial<Passage>,
	options: UpdatePassageOptions = {}
): Thunk<StoriesState, StoriesAction> {
	if (!story.passages.some(p => p.id === passage.id)) {
		throw new Error('This passage does not belong to this story.');
	}

	if (
		'name' in props &&
		story.passages
			.filter(p => p.name === props.name)
			.some(p => p.id !== passage.id)
	) {
		throw new Error(`There is already a passage named "${props.name}".`);
	}

	return (dispatch, getState) => {
		// Do the passage update itself.

		const oldName = passage.name;
		const oldText = passage.text;

		dispatch({
			props,
			type: 'updatePassage',
			passageId: passage.id,
			storyId: story.id
		});

		// Side effects from changes.

		if (!options.dontUpdateOthers && props.text) {
			dispatch(deleteOrphanedPassages(story, passage, props.text, oldText));

			// We need to get an up-to-date version of the story so placement of new
			// passages is correct.

			const updatedStory = storyWithId(getState(), story.id);

			dispatch(
				createNewlyLinkedPassages(updatedStory, passage, props.text, oldText)
			);
		}

		// If this passage is a tag-linked data node and its tag link changed
		// (because it was renamed or its template changed), move the tag on every
		// linked passage so the links follow the node--or remove it, if the node
		// no longer has a tag link at all. This runs regardless of
		// dontUpdateOthers--that option only concerns story link side effects.

		const updatedPassage = {...passage, ...props};
		const oldTagLink = tagLinkName(passage);
		const newTagLink = tagLinkName(updatedPassage);

		// Field tags on linked passages are derived from this node's data, so
		// recomputing them needs the story as it will be after this update.

		const updatedPassages = story.passages.map(other =>
			other.id === passage.id ? updatedPassage : other
		);

		if (oldTagLink && oldTagLink !== newTagLink) {
			// The negation tag names the node, so a rename moves it along with the
			// tag link itself.

			const oldNegationTag = tagLinkNegationTag(oldTagLink);
			const newNegationTag = newTagLink
				? tagLinkNegationTag(newTagLink)
				: undefined;

			story.passages.forEach(linkedPassage => {
				if (
					linkedPassage.id !== passage.id &&
					linkedPassage.tags.includes(oldTagLink)
				) {
					// Also drop priority, negation and field tags that no remaining link
					// justifies, e.g. when the node's new template doesn't rank or negate
					// its links or mirror its fields.

					const movedTags = newTagLink
						? linkedPassage.tags.map(tag =>
								tag === oldTagLink ? newTagLink : tag
						  )
						: linkedPassage.tags.filter(tag => tag !== oldTagLink);

					dispatch({
						type: 'updatePassage',
						passageId: linkedPassage.id,
						storyId: story.id,
						props: {
							tags: tagsWithFieldTags(
								tagsWithoutOrphanedNegation(
									tagsWithoutOrphanedPriority(
										oldNegationTag && newNegationTag
											? movedTags.map(tag =>
													tag === oldNegationTag ? newNegationTag : tag
											  )
											: movedTags
									)
								),
								updatedPassages
							)
						}
					});
				}
			});

			// Carry the tag's color over to its new name.

			if (
				newTagLink &&
				story.tagColors[oldTagLink] &&
				!story.tagColors[newTagLink]
			) {
				dispatch({
					type: 'updateStory',
					storyId: story.id,
					props: {
						tagColors: {
							...story.tagColors,
							[newTagLink]: story.tagColors[oldTagLink]
						}
					}
				});
			}
		} else if (
			newTagLink &&
			dataNodeTemplate(updatedPassage.dataTemplate)?.fieldTags &&
			props.text !== undefined &&
			props.text !== oldText
		) {
			// The node's data changed while its tag link stayed put, so the field
			// tags mirrored onto its linked passages may be stale. Recompute them
			// and update only the passages where they actually changed.

			story.passages.forEach(linkedPassage => {
				if (
					linkedPassage.id === passage.id ||
					!linkedPassage.tags.includes(newTagLink)
				) {
					return;
				}

				const tags = tagsWithFieldTags(linkedPassage.tags, updatedPassages);

				if (!isEqual(tags, linkedPassage.tags)) {
					dispatch({
						type: 'updatePassage',
						passageId: linkedPassage.id,
						storyId: story.id,
						props: {tags}
					});
				}
			});
		}

		if (props.name) {
			const oldNameEscaped = escapeRegExp(oldName);

			// We only need to escape $ stuff in the new name, because it will be the
			// second argument to replace(). This is a little mindbending, but the
			// purpose of this is to replace $ with $$.

			const newNameEscaped = props.name.replace(/\$/g, '$$$$');

			const simpleLinkRegexp = new RegExp(
				'\\[\\[' + oldNameEscaped + '(\\]\\[.*?)?\\]\\]',
				'g'
			);
			const compoundLinkRegexp = new RegExp(
				'\\[\\[(.*?)(\\||->)' + oldNameEscaped + '(\\]\\[.*?)?\\]\\]',
				'g'
			);
			const reverseLinkRegexp = new RegExp(
				'\\[\\[' + oldNameEscaped + '(<-.*?)(\\]\\[.*?)?\\]\\]',
				'g'
			);

			story.passages.forEach(relinkedPassage => {
				if (
					simpleLinkRegexp.test(relinkedPassage.text) ||
					compoundLinkRegexp.test(relinkedPassage.text) ||
					reverseLinkRegexp.test(relinkedPassage.text)
				) {
					let newText = relinkedPassage.text;

					newText = newText.replace(
						simpleLinkRegexp,
						'[[' + newNameEscaped + '$1]]'
					);
					newText = newText.replace(
						compoundLinkRegexp,
						'[[$1$2' + newNameEscaped + '$3]]'
					);
					newText = newText.replace(
						reverseLinkRegexp,
						'[[' + newNameEscaped + '$1$2]]'
					);

					updatePassage(
						story,
						relinkedPassage,
						{text: newText},
						options
					)(dispatch, getState);
				}
			});
		}
	};
}
