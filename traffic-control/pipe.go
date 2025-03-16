package trafficControl

import (
	"encoding/json"

	"github.com/pb33f/ranch/model"
	"github.com/pb33f/ranch/service"
	"github.com/pb33f/wiretap/shared"
)

const (
	UpdatePipe = "update-pipe"
	DeletePipe = "delete-pipe"
)

type PipePayload struct {
	WorkflowID string       `json:"workflowID"`
	Pipe       *shared.Pipe `json:"Pipe"`
}

type DeletePipePayload struct {
	WorkflowID string `json:"workflowID"`
}

func (ss *TrafficControlService) deletePipe(request *model.Request, core service.FabricServiceCore) {
	pipePayload := &DeletePipePayload{}

	rq, _ := request.Payload.(string)

	err := json.Unmarshal([]byte(rq), &pipePayload)

	if err != nil {
		panic("fuck")
	}

}

func (ss *TrafficControlService) updatePipe(request *model.Request, core service.FabricServiceCore) {
	pipePayload := &PipePayload{}

	rq, _ := request.Payload.(string)

	err := json.Unmarshal([]byte(rq), &pipePayload)

	if err != nil {
		panic("fuck")
	}

	ss.mutex.Lock()
	ss.mockboard.WorkflowMetadata[pipePayload.WorkflowID].Pipes[pipePayload.Pipe.ID] = pipePayload.Pipe
	ss.mutex.Unlock()
}
