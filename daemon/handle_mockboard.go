package daemon

import (
	"net/http"

	"github.com/pb33f/wiretap/shared"
)

// now that we have the step, let's go extract all of the data we need and categorize

// or let's grab the anchors on the step...
// if we have anchors on the step, we will see what we need

// ^ 0. Responses only deal with ResponseBodyProperty, Requests deal with RequestBodyProperty, Parameters
// ^ 1. every anchor gets populated with the value of the property
// ^ 2. compute the anchor expression
// ^ 3. set the mock to be that expression

func getResponseAnchors(anchors []*shared.Anchor) []*shared.Anchor {
	var filteredAnchors []*shared.Anchor

	for _, anchor := range anchors {
		if anchor.IsResponse() {
			filteredAnchors = append(filteredAnchors, anchor)
		}
	}

	return filteredAnchors
}

func (ws *WiretapService) handleStepResponse(anchors []*shared.Anchor, config *shared.WiretapConfiguration, mock []byte) ([]byte, []*shared.Message, []error) {
	anchors = getResponseAnchors(anchors)

	var errors []error
	var messages []*shared.Message

	// ^ 1. populate anchors that are on this step output with values.
	for _, anchor := range anchors {

		message, err := anchor.PopulateAnchorResponse(mock)
		if err != nil {
			errors = append(errors, err)
		}
		if message != nil {
			messages = append(messages, message)
		}
	}
	// ^ 2. Compute anchor expressions
	for _, anchor := range anchors {
		message, err := anchor.ComputeAnchorExpession(config.Mockboard)
		if err != nil {
			errors = append(errors, err)
		}
		if message != nil {
			messages = append(messages, message)
		}
	}

	// ^ 3. inject anchor into mock
	for _, anchor := range anchors {
		updatedMock, message, err := anchor.InjectAnchorValueIntoMock(mock)
		if err != nil {
			errors = append(errors, err)
		}
		if message != nil {
			messages = append(messages, message)
			mock = updatedMock
		}
	}

	return mock, messages, errors
}

func (ws *WiretapService) getAllAnchorsOnThisPath(config *shared.WiretapConfiguration, path string) ([]*shared.Anchor, bool) {
	for _, workflow := range config.Mockboard.GetActivatedWorkflows() {
		_, anchors, foundStep := workflow.MatchRequestedPath(path)
		if foundStep {
			return anchors, true
		}
	}

	return nil, false
}

func getRequestAnchors(anchors []*shared.Anchor) []*shared.Anchor {
	var filteredAnchors []*shared.Anchor

	for _, anchor := range anchors {
		if !anchor.IsResponse() {
			filteredAnchors = append(filteredAnchors, anchor)
		}
	}

	return filteredAnchors
}

func (ws *WiretapService) handleStepRequest(request *http.Request, config *shared.WiretapConfiguration, anchors []*shared.Anchor) ([]byte, []shared.Message, []error) {
	anchors = getRequestAnchors(anchors)

	var errors []error
	var messages []shared.Message
	for _, workflow := range config.Mockboard.GetActivatedWorkflows() {
		_, anchors, foundStep := workflow.MatchRequestedPath(request.URL.Path)

		if foundStep {
			// ^ 1. populate anchors that are on this step output with values.
			for _, anchor := range anchors {
				operation, err := config.Mockboard.GetOperation(anchor)

				if err != nil {
					errors = append(errors, err)
				}

				anchor.PopulateAnchor(request, operation, mock)
			}
			// ^ 2. Compute anchor expressions
			// 2a. go to anchor reference list
			// 2b. get all reference expressionValues
			// 2c. compute expression in this anchors exprsesion, set expressionValue

			// &

			// now that we have the anchors we need on the step, extract necessary data for each anchor

			// config.Mockboard.docModel
			// populate all anchors

			// then we

		} else {
			break
		}
	}

	return mock, messages, errors
}
