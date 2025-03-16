package shared

import (
	"fmt"
	"net/http"
	"regexp"

	"github.com/gobwas/glob"
	v3 "github.com/pb33f/libopenapi/datamodel/high/v3"
	"github.com/speakeasy-api/openapi/arazzo"
)

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type StepMetadata struct {
	ID          string   `json:"id"`
	Description string   `json:"description"`
	StepName    string   `json:"stepName"`
	OperationID string   `json:"operationID"`
	Position    Position `json:"position"`
	PathName    string   `json:"pathName"`
}

func (sm *StepMetadata) getOperation(doc *v3.Document) *v3.Operation {

	return nil
}

type MessageAnchor struct {
	ID    string
	Value interface{}
}

// in a message, I want to say that an anchor has been populated
type Message struct {
	message        string
	receiverAnchor MessageAnchor
	senderAnchor   MessageAnchor
}

type IO string

const (
	output IO = "output"
	input  IO = "input"
)

type In string

const (
	QUERY  In = "query"
	HEADER In = "header"
	PATH   In = "path"
	COOKIE In = "cookie"
)

type Variable struct {
	LevelID           string      `json:"levelID"`
	IO                IO          `json:"io"`
	Code              string      `json:"code"`
	MediaType         string      `json:"mediaType"`
	Property          string      `json:"property"`
	ID                string      `json:"id"`
	Value             interface{} `json:"value"`
	In                string      `json:"in"`
	ReceiverVariables []*Variable `jsons:"receiverVariables"`
}

func convertPathToGlob(path string) glob.Glob {
	re := regexp.MustCompile(`\{[^}]*\}`)

	path = re.ReplaceAllString(path, "*")

	return glob.MustCompile(path)
}

func (wfm *WorkflowMetadata) getStepMetadataAnchors(stepID string) ([]*Anchor, bool) {
	anchors := []*Anchor{}
	for _, pipe := range wfm.Pipes {
		if pipe.Input.StepID == stepID {
			anchors = append(anchors, pipe.Input)
		}

		for _, output := range pipe.Outputs {
			if output.StepID == stepID {
				anchors = append(anchors, output)
			}
		}

	}
	if len(anchors) > 0 {
		return anchors, true
	}

	return nil, false
}

// & there should only be one path to match if any at all!
func (wfm *WorkflowMetadata) MatchRequestedPath(path string) (*StepMetadata, []*Anchor, bool) {

	for _, stepMetadata := range wfm.StepMetadatas {
		// turn path into glob
		if convertPathToGlob(stepMetadata.PathName).Match(path) {
			anchors, _ := wfm.getStepMetadataAnchors(stepMetadata.ID)
			return stepMetadata, anchors, true
		}
	}

	return nil, nil, false
}

type WorkflowMetadata struct {
	StepMetadatas map[string]*StepMetadata `json:"step_metadata"`
	WorkflowID    string                   `json:"workflow_id"`
	IsActivated   bool                     `json:"is_activated"`
	Variables     map[string]*Variable     `json:"variables"`
	Summary       string                   `json:"summary"`
	Description   string                   `json:"description"`
	WorkflowName  string                   `json:"workflowName"`
	Pipes         map[string]*Pipe         `json:"pipes"`
}

type Mockboard struct {
	Arazzo           *arazzo.Arazzo               `json:"arazzo"`
	WorkflowMetadata map[string]*WorkflowMetadata `json:"workflow_metadata"`
	DocModel         *v3.Document
}

func getRequestAnchors(anchors []*Anchor) []*Anchor {
	var filteredAnchors []*Anchor

	for _, anchor := range anchors {
		if !anchor.IsResponse() {
			filteredAnchors = append(filteredAnchors, anchor)
		}
	}

	return filteredAnchors

}
func getResponseAnchors(anchors []*Anchor) []*Anchor {
	var filteredAnchors []*Anchor

	for _, anchor := range anchors {
		if anchor.IsResponse() {
			filteredAnchors = append(filteredAnchors, anchor)
		}
	}

	return filteredAnchors
}

// the anchors passed in are the for THIS PATH
func (mockboard *Mockboard) HandleStepResponse(anchors []*Anchor, mock []byte) ([]byte, []*Message, []error) {
	anchors = getResponseAnchors(anchors)

	var errors []error
	var messages []*Message

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
		moreMessages, err := anchor.ComputeAnchorExpession(mockboard)
		if err != nil {
			errors = append(errors, err)
		}
		if len(moreMessages) > 0 {
			messages = append(messages, moreMessages...)
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

// the anchors passed in are the for THIS PATH
func (mockboard *Mockboard) HandleStepRequest(request *http.Request, anchors []*Anchor) ([]*Message, []error) {
	anchors = getResponseAnchors(anchors)

	var errors []error
	var messages []*Message

	// ^ 1. populate anchors that are on this step input with values.
	for _, anchor := range anchors {

		message, err := anchor.PopulateAnchorRequest(request)
		if err != nil {
			errors = append(errors, err)
		}
		if message != nil {
			messages = append(messages, message)
		}
	}
	// ^ 2. Compute anchor expressions
	for _, anchor := range anchors {
		moreMessages, err := anchor.ComputeAnchorExpession(mockboard)
		if err != nil {
			errors = append(errors, err)
		}
		if len(moreMessages) > 0 {
			messages = append(messages, moreMessages...)
		}
	}

	// ^ 3. inject anchors into http request
	for _, anchor := range anchors {
		message, err := anchor.InjectAnchorValueIntoRequest(request)
		if err != nil {
			errors = append(errors, err)
		}
		if message != nil {
			messages = append(messages, message)
		}
	}

	return messages, errors
}

func (mb *Mockboard) GetOperation(anchor *Anchor) (*v3.Operation, error) {

	if path, ok := mb.DocModel.Paths.PathItems.Get(anchor.PathName); ok {
		if anchor.PathMethod == http.MethodGet {
			return path.Get, nil
		}
		if anchor.PathMethod == http.MethodPatch {
			return path.Patch, nil
		}
		if anchor.PathMethod == http.MethodPost {
			return path.Post, nil
		}
		if anchor.PathMethod == http.MethodDelete {
			return path.Delete, nil
		}
		if anchor.PathMethod == http.MethodPut {
			return path.Put, nil
		}
		if anchor.PathMethod == http.MethodOptions {
			return path.Options, nil
		}

	}

	return nil, fmt.Errorf("could not find operation for this path")
}

func (mb *Mockboard) MatchPathOnActivatedWorkflows(path string) bool {

	for _, wfm := range mb.WorkflowMetadata {
		if wfm.IsActivated {
			continue
		}
		for _, sm := range wfm.StepMetadatas {
			if convertPathToGlob(sm.PathName).Match(path) {
				return true
			}
		}
	}

	return false
}
func (mb *Mockboard) GetActivatedWorkflows() []*WorkflowMetadata {
	activatedWorkflows := []*WorkflowMetadata{}

	for _, v := range mb.WorkflowMetadata {
		if v.IsActivated {
			activatedWorkflows = append(activatedWorkflows, v)
		}

	}

	return activatedWorkflows
}

// Pipe Struct
type Pipe struct {
	ID                  string    `json:"id"`
	Name                string    `json:"name"`
	Input               *Anchor   `json:"input"`
	Outputs             []*Anchor `json:"outputs"`
	ExposeOutOfWorkflow bool      `json:"exposeOutOfWorkflow"`
	IsPopulated         bool      `json:"isPopulated"`
}

func NewPipe(id string, referenceType AnchorType, propertyType Property) *Pipe {
	return &Pipe{
		ID:                  id,
		Name:                "",
		Input:               NewAnchor(id, referenceType, propertyType),
		Outputs:             []*Anchor{},
		ExposeOutOfWorkflow: false,
		IsPopulated:         false,
	}
}
