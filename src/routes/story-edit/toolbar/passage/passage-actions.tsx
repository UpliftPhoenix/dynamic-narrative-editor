import * as React from 'react';
import {ButtonBar} from '../../../../components/container/button-bar';
import {RenamePassageButton} from '../../../../components/passage/rename-passage-button';
import {
	Passage,
	Story,
	updatePassage,
	useStoriesContext
} from '../../../../store/stories';
import {dataNodeTemplate} from '../../../../util/data-node-templates';
import {Point} from '../../../../util/geometry';
import {CreateDataNodeButton} from './create-data-node-button';
import {CreatePassageButton} from './create-passage-button';
import {CreateTemplateNodeButton} from './create-template-node-button';
import {DeletePassagesButton} from './delete-passages-button';
import {EditPassagesButton} from './edit-passages-buttons';
import {GoToPassageButton} from './go-to-passage-button';
import {SelectAllPassagesButton} from './select-all-passages-button';
import {DeselectAllPassagesButton} from './deselect-all-passages-button';
import {StartAtPassageButton} from './start-at-passage-button';
import {TestPassageButton} from './test-passage-button';

export interface PassageActionsProps {
	getCenter: () => Point;
	onOpenFuzzyFinder: () => void;
	story: Story;
}

export const PassageActions: React.FC<PassageActionsProps> = props => {
	const {getCenter, onOpenFuzzyFinder, story} = props;
	const {dispatch} = useStoriesContext();
	const selectedPassages = React.useMemo(
		() => story.passages.filter(passage => passage.selected),
		[story.passages]
	);
	const soloSelectedPassage = React.useMemo(
		() => (selectedPassages.length === 1 ? selectedPassages[0] : undefined),
		[selectedPassages]
	);

	// Testing and starting the story only make sense for normal passages, not
	// data nodes.

	const soloSelectedNormalPassage =
		soloSelectedPassage?.type === 'data' ? undefined : soloSelectedPassage;

	function handleRename(name: string, passage?: Passage) {
		if (!passage) {
			throw new Error('Passage is unset');
		}

		// Don't create newly linked passages here because the update action will
		// try to recreate the passage as it's been renamed--it sees new links in
		// existing passages, updates them, but does not see that the passage name
		// has been updated since that hasn't happened yet.

		dispatch(updatePassage(story, passage, {name}, {dontUpdateOthers: true}));
	}

	return (
		<ButtonBar>
			<CreatePassageButton getCenter={getCenter} story={story} />
			{['npc', 'trigger', 'requirement', 'setpiece', 'textmodifier'].map(id => {
				const template = dataNodeTemplate(id);

				return template ? (
					<CreateTemplateNodeButton
						getCenter={getCenter}
						key={id}
						story={story}
						template={template}
					/>
				) : null;
			})}
			<CreateDataNodeButton getCenter={getCenter} story={story} />
			<EditPassagesButton passages={selectedPassages} story={story} />
			<RenamePassageButton
				onRename={name => handleRename(name, soloSelectedPassage)}
				passage={soloSelectedPassage}
				story={story}
			/>
			<DeletePassagesButton passages={selectedPassages} story={story} />
			<TestPassageButton passage={soloSelectedNormalPassage} story={story} />
			<StartAtPassageButton
				passage={soloSelectedNormalPassage}
				story={story}
			/>
			<GoToPassageButton onOpenFuzzyFinder={onOpenFuzzyFinder} />
			<SelectAllPassagesButton story={story} />
			<DeselectAllPassagesButton
				story={story}
				selectedPassages={selectedPassages}
			/>
		</ButtonBar>
	);
};
