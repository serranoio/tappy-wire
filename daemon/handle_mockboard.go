package daemon

import (
	"github.com/pb33f/wiretap/shared"
)

// now that we have the step, let's go extract all of the data we need and categorize

// or let's grab the anchors on the step...
// if we have anchors on the step, we will see what we need

func (ws *WiretapService) getAllAnchorsOnThisPath(config *shared.WiretapConfiguration, path string) (string, []*shared.Anchor, bool) {
	for _, workflow := range config.Mockboard.GetActivatedWorkflows() {
		stepMetadata, anchors, foundStep := workflow.MatchRequestedPath(path)
		if foundStep {
			return *stepMetadata.ID, anchors, true
		}
	}

	return "", nil, false
}
