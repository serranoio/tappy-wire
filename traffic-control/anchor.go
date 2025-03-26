package trafficControl

import (
	"encoding/json"

	"github.com/pb33f/ranch/model"
	"github.com/pb33f/ranch/service"
	"github.com/pb33f/wiretap/shared"
)

const (
	UpdateAnchor = "update-anchor"
	DeleteAnchor = "delete-anchor"
)

type AnchorPayload struct {
	WorkflowID string         `json:"workflowID"`
	PipeID     string         `json:"pipeID"`
	Anchor     *shared.Anchor `json:"Anchor"`
}

type DeleteAnchorPayload struct {
	WorkflowID string `json:"workflowID"`
}

func (ss *TrafficControlService) deleteAnchor(request *model.Request, core service.FabricServiceCore) {
	anchorPayload := &DeleteAnchorPayload{}

	rq, _ := request.Payload.(string)

	err := json.Unmarshal([]byte(rq), &anchorPayload)

	if err != nil {
		panic("fuck")
	}

}

func (ss *TrafficControlService) updateAnchor(request *model.Request, core service.FabricServiceCore) {
	anchorPayload := &AnchorPayload{}

	rq, _ := request.Payload.(string)

	err := json.Unmarshal([]byte(rq), &anchorPayload)

	if err != nil {
		panic("fuck")
	}

	ss.mutex.Lock()
	// I am sending in the
	workflow := ss.mockboard.WorkflowMetadata[anchorPayload.WorkflowID]

	foundNum := -1
	for num, anchor := range workflow.Anchors {
		if anchor.ID == anchorPayload.Anchor.ID {
			foundNum = num
			break
		}
	}
	workflow.Anchors[foundNum] = anchorPayload.Anchor

	ss.mutex.Unlock()
}
