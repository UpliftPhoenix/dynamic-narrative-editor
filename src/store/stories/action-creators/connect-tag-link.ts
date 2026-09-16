import {Thunk} from 'react-hook-thunk-reducer';
import {dataNodeTemplate} from '../../../util/data-node-templates';
import {
	passagePriority,
	priorityTag,
	tagLinkName,
	tagsWithFieldTags,
	tagsWithoutCompetingLinks,
	tagsWithoutOrphanedNegation,
	tagsWithoutOrphanedPriority
} from '../../../util/tag-link';
import {colorString} from '../../../util/color';
import {isDataNode, storyPassageTags} from '../getters';
import {Passage, StoriesAction, StoriesState, Story} from '../stories.types';

/**
 * Connects a tag-linkable data node to a passage by adding the node's tag link
 * to it (see util/tag-link.ts). If the node's template ranks its links by
 * priority and the passage doesn't have a priority yet, it also gets a
 * priority tag--initially one past the node's last linked passage. If the
 * template's links are exclusive, the passage's existing link to another node
 * of that template is broken, and if the template mirrors its fields as tags,
 * the passage's field tags are brought up to date.
 */
export function connectTagLink(
	story: Story,
	node: Passage,
	target: Passage
): Thunk<StoriesState, StoriesAction> {
	const tag = tagLinkName(node);

	if (!tag) {
		throw new Error("This data node's template doesn't allow tag links.");
	}

	if (target.tags.includes(tag)) {
		throw new Error('This passage is already linked to this data node.');
	}

	const keptTags = tagsWithoutCompetingLinks(target.tags, tag);
	const newTags = [tag];

	if (
		dataNodeTemplate(node.dataTemplate)?.linkPriority &&
		passagePriority(target) === undefined
	) {
		const linkedCount = story.passages.filter(
			passage => !isDataNode(passage) && passage.tags.includes(tag)
		).length;

		newTags.push(priorityTag(linkedCount + 1));
	}

	let tags = [...keptTags, ...newTags];

	// Breaking a competing link may orphan the priority and negation tags it
	// justified.

	if (keptTags.length !== target.tags.length) {
		tags = tagsWithoutOrphanedNegation(tagsWithoutOrphanedPriority(tags));
	}

	tags = tagsWithFieldTags(tags, story.passages);

	return dispatch => {
		// If the tag link is new to the story, assign it a color, the same way
		// addPassageTag() does. Priority tags don't get colors--their value
		// changes their name, so a color would only stick to one value.

		if (!storyPassageTags(story).includes(tag)) {
			dispatch({
				type: 'updateStory',
				storyId: story.id,
				props: {
					tagColors: {...story.tagColors, [tag]: colorString(tag)}
				}
			});
		}

		dispatch({
			type: 'updatePassage',
			passageId: target.id,
			storyId: story.id,
			props: {tags}
		});
	};
}
