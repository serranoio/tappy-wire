package daemon

import (
	"net/http"

	"github.com/pb33f/wiretap/shared"
)

// now that we have the step, let's go extract all of the data we need and categorize

// or let's grab the anchors on the step...
// if we have anchors on the step, we will see what we need

// ^ this only takes the headers from the LAST
func (ws *WiretapService) setPreferredOnSteps(steps []*shared.StepMetadata, request *http.Request) {
	// how the hell do we know which code it is? ON THE STEP?

	// ^ wiretap does not know which response code to send. it will defaul to 200. Set wireatp-status-code to change codes to select
	for _, step := range steps {
		// we always default to 200
		if *step.SelectedCode == "" {
			*step.SelectedCode = "200"
		}

		// this is needed for the mock generator
		request.Header.Set("wiretap-status-code", *step.SelectedCode)

		for _, content := range step.Operation.Responses.Codes[*step.SelectedCode].Content {
			if content.SelectedExample != "" {
				request.Header.Set("Preferred", content.SelectedExample)
			}

			if content.Schema.IsSchemaPolymorphic() {
				// if there is one selected, then send'er in
				if content.Schema.Ref != "" {
					request.Header.Set(shared.PolymorphicSchema, content.Schema.Ref)
				} else {
					// if none is selected, default to the first one
					request.Header.Set(shared.PolymorphicSchema, content.Schema.OneOf[0].Ref)
				}
			}
		}
	}

}

// * this is for EVERY SINGLE WORKFLOW!
// ^ We are also going to add in selectedRef & selectedExample
func (ws *WiretapService) getAllAnchorsOnThisPath(config *shared.WiretapConfiguration, request *http.Request) ([]*shared.StepMetadata, []*shared.Anchor, bool) {
	stepMetadatas := []*shared.StepMetadata{}
	allAnchors := []*shared.Anchor{}
	for _, workflow := range config.Mockboard.GetActivatedWorkflows() {
		stepMetadata, anchors, foundStep := workflow.MatchRequestedPath(request.URL.Path)
		if foundStep {
			stepMetadatas = append(stepMetadatas, stepMetadata)
			allAnchors = append(allAnchors, anchors...)
		}
	}

	ws.setPreferredOnSteps(stepMetadatas, request)

	if len(stepMetadatas) > 0 {
		return stepMetadatas, allAnchors, true
	}
	return []*shared.StepMetadata{}, nil, false
}

func (ws *WiretapService) updateMockboardState() {
	controls := ws.controlsStore.GetValue(shared.ConfigKey)
	config := controls.(*shared.WiretapConfiguration)

	config.Mockboard = ws.config.Mockboard
	ws.controlsStore.Put(shared.ConfigKey, config, nil)

}
