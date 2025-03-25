package trafficControl

import (
	"encoding/json"

	"github.com/pb33f/ranch/model"
	"github.com/pb33f/ranch/service"
	"github.com/pb33f/wiretap/shared"
)

const (
	CreateNewWorkflow  = "create-new-workflow"
	ChangeWorkflowName = "change-workflow-name"
	UpdateWorkflow     = "update-workflow"
	DeleteWorkflow     = "delete-workflow"
	GetWorkflows       = "get-workflows"
)

type WorkflowMetadata struct {
	WorkflowName  string          `json:"workflowName"`
	WorkflowID    string          `json:"workflowID"`
	IsActivated   bool            `json:"isActivated"`
	StepMetadatas []*StepMetadata `json:"stepMetadatas"`
	Pipes         []*shared.Pipe  `json:"pipes"`
	Summary       string          `json:"summary"`
	Description   string          `json:"description"`
}

type DeleteWorkflowPayload struct {
	WorkflowID string `json:"workflowID"`
}

type WorkflowsPayload struct {
	WorkflowMetadatas []WorkflowMetadata `json:"workflowMetadatas"`
}

type WorkflowPayload struct {
	WorkflowMetadata WorkflowMetadata `json:"workflowMetadata"`
}

func NewWorkflowMetadataFromPayload(workflowMetadata WorkflowMetadata) *shared.WorkflowMetadata {
	return &shared.WorkflowMetadata{
		WorkflowID:    &workflowMetadata.WorkflowID,
		IsActivated:   &workflowMetadata.IsActivated,
		StepMetadatas: make(map[string]*shared.StepMetadata),
		Summary:       &workflowMetadata.Summary,
		Description:   &workflowMetadata.Description,
		WorkflowName:  &workflowMetadata.WorkflowName,
		Pipes:         make(map[string]*shared.Pipe),
	}

}

func (ss *TrafficControlService) getWorkflows(request *model.Request, core service.FabricServiceCore) {
	core.SendResponse(request, ss.mockboard)
}

type ChangeWorkflowNamePayload struct {
	OldID string `json:"oldID"`
	NewID string `json:"newID"`
}

func (ss *TrafficControlService) createNewWorkflow(request *model.Request, core service.FabricServiceCore) error {

	var workflowPayload *WorkflowsPayload

	rq, _ := request.Payload.(string)

	err := json.Unmarshal([]byte(rq), &workflowPayload)
	if err != nil {
		panic("fuck")
	}

	for _, workflowMetadata := range workflowPayload.WorkflowMetadatas {

		ss.mutex.Lock()
		ss.mockboard.WorkflowMetadata[workflowMetadata.WorkflowID] = NewWorkflowMetadataFromPayload(workflowMetadata)
		ss.mutex.Unlock()
	}

	ss.updateState()
	return nil
}

func (ss *TrafficControlService) deleteWorkflow(request *model.Request, core service.FabricServiceCore) {
	var deleteWorkflowPayload *DeleteWorkflowPayload
	rq, _ := request.Payload.(string)

	err := json.Unmarshal([]byte(rq), &deleteWorkflowPayload)
	if err != nil {
		panic("fuck")
	}

	ss.mutex.Lock()
	delete(ss.mockboard.WorkflowMetadata, deleteWorkflowPayload.WorkflowID)
	ss.mutex.Unlock()

	ss.updateState()
}

func (ss *TrafficControlService) updateWorkflow(request *model.Request, core service.FabricServiceCore) {
	var workflowPayload *WorkflowPayload

	rq, _ := request.Payload.(string)

	err := json.Unmarshal([]byte(rq), &workflowPayload)
	if err != nil {
		panic("fuck")
	}
	id := workflowPayload.WorkflowMetadata.WorkflowID

	ss.mutex.Lock()
	ss.mockboard.WorkflowMetadata[id].Pipes = make(map[string]*shared.Pipe)
	for _, pipe := range workflowPayload.WorkflowMetadata.Pipes {
		ss.mockboard.WorkflowMetadata[id].Pipes[pipe.ID] = pipe
	}

	ss.mockboard.WorkflowMetadata[id].StepMetadatas = make(map[string]*shared.StepMetadata)
	for _, stepMetadata := range workflowPayload.WorkflowMetadata.StepMetadatas {
		ss.mockboard.WorkflowMetadata[id].StepMetadatas[*stepMetadata.ID] = stepMetadata.NewStepMetadata()
	}

	ss.mockboard.WorkflowMetadata[id].IsActivated = &workflowPayload.WorkflowMetadata.IsActivated
	ss.mockboard.WorkflowMetadata[id].Description = &workflowPayload.WorkflowMetadata.Description
	ss.mockboard.WorkflowMetadata[id].Summary = &workflowPayload.WorkflowMetadata.Summary
	ss.mockboard.WorkflowMetadata[id].WorkflowName = &workflowPayload.WorkflowMetadata.WorkflowName
	ss.mutex.Unlock()

	ss.updateState()
}
