package daemon

import (
	"github.com/pb33f/wiretap/shared"
)

// now that we have the step, let's go extract all of the data we need and categorize

// or let's grab the anchors on the step...
// if we have anchors on the step, we will see what we need

// * this is for EVERY SINGLE WORKFLOW!
func (ws *WiretapService) getAllAnchorsOnThisPath(config *shared.WiretapConfiguration, path string) ([]*string, []*shared.Anchor, bool) {
	ids := []*string{}
	allAnchors := []*shared.Anchor{}
	for _, workflow := range config.Mockboard.GetActivatedWorkflows() {
		stepMetadata, anchors, foundStep := workflow.MatchRequestedPath(path)
		if foundStep {
			ids = append(ids, stepMetadata.ID)
			allAnchors = append(allAnchors, anchors...)
		}
	}
	if len(ids) > 0 {
		return ids, allAnchors, true
	}

	return []*string{}, nil, false
}

func (ws *WiretapService) updateMockboardState() {
	controls := ws.controlsStore.GetValue(shared.ConfigKey)
	config := controls.(*shared.WiretapConfiguration)

	config.Mockboard = ws.config.Mockboard
	ws.controlsStore.Put(shared.ConfigKey, config, nil)

}
