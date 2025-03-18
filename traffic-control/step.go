package trafficControl

import "github.com/pb33f/wiretap/shared"

func formStepMap(stepMetadatas []*shared.StepMetadata) map[string]*shared.StepMetadata {
	stepMap := make(map[string]*shared.StepMetadata)
	for _, stepMetadata := range stepMetadatas {
		stepMap[*stepMetadata.OperationID] = stepMetadata
	}

	return stepMap

}
