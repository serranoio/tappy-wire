package trafficControl

import "github.com/pb33f/wiretap/shared"

func formStepMap(stepMetadatas []*shared.StepMetadata) map[string]*shared.StepMetadata {
	stepMap := make(map[string]*shared.StepMetadata)
	for _, stepMetadata := range stepMetadatas {
		stepMap[*stepMetadata.OperationID] = stepMetadata
	}

	return stepMap

}

type StepMetadata struct {
	ID          *string         `json:"id"`
	Description *string         `json:"description"`
	StepName    *string         `json:"stepName"`
	OperationID *string         `json:"operationID"`
	Position    shared.Position `json:"position"`
	PathName    *string         `json:"pathName"`
	Operation   *Operation      `json:"operation"`
}

func (sm *StepMetadata) NewStepMetadata() *shared.StepMetadata {
	return &shared.StepMetadata{
		ID:          sm.ID,
		Description: sm.Description,
		StepName:    sm.StepName,
		OperationID: sm.OperationID,
		Position:    sm.Position,
		PathName:    sm.PathName,
		Operation:   sm.Operation.NewOperation(),
	}

}
