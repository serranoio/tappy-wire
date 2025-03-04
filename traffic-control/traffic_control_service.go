// Copyright 2023 Princess B33f Heavy Industries / Dave Shanley
// SPDX-License-Identifier: AGPL

package trafficControl

import (
	"encoding/json"

	"github.com/pb33f/libopenapi"
	v3 "github.com/pb33f/libopenapi/datamodel/high/v3"
	"github.com/pb33f/ranch/bus"
	"github.com/pb33f/ranch/model"
	"github.com/pb33f/ranch/service"
	"github.com/pb33f/wiretap/shared"
)

// todo: TrafficControlPath type needs to be moved to shared so that it can be used here
// then we can access the data here

const (
	TrafficControlServiceChan = "traffic-control"
	SetPathToMockMode         = "set-path-to-mock-mode"
	SetPathPolymorphicSchema  = "set-path-polymorphic-schema"
	SetPathPreferenceExample  = "set-path-preference-example"
	GetAllPaths               = "get-all-paths"
	SetPathVariables          = "set-path-variables-command"
	SetPathRQVariables        = "set-path-request-body-variables-command"
)

type PathRequest struct {
	PathName          string `json:"path_name,omitempty"`
	MockType          string `json:"mock_type,omitempty"`
	ExamplePreference string `json:"example_preference,omitempty"`
	MockMode          bool   `json:"mock_mode,omitempty"`
}

type VariableRequest struct {
	PathName  string                           `json:"path_name,omitempty"`
	Variables []*shared.TrafficControlVariable `json:"variables,omitempty"`
}

type Path struct {
	PathName             string                           `json:"path_name"`
	MockType             string                           `json:"mock_type"`
	MockMode             bool                             `json:"mock_mode"`
	ExamplePreference    string                           `json:"example_preference"`
	RequestBodyVariables []*shared.TrafficControlVariable `json:"request_body_variables"`
	Variables            []*shared.TrafficControlVariable `json:"variables"`
}

type ControlResponse struct {
	Config *shared.WiretapConfiguration `json:"config,omitempty"`
}

type TrafficControlService struct {
	document            libopenapi.Document
	docModel            *v3.Document
	paths               []*shared.TrafficControlPath
	trafficControlStore bus.BusStore
	serviceCore         service.FabricServiceCore
}

func NewTrafficControlService(document libopenapi.Document) *TrafficControlService {
	tcs := &TrafficControlService{}
	if document == nil {
		return tcs
	}

	storeManager := bus.GetBus().GetStoreManager()
	trafficControlStore := storeManager.CreateStore(TrafficControlServiceChan)
	tcs.trafficControlStore = trafficControlStore

	m, _ := document.BuildV3Model()
	tcs.document = document
	tcs.docModel = &m.Model

	controls := tcs.trafficControlStore.GetValue(shared.ConfigKey)
	config := controls.(*shared.WiretapConfiguration)

	tcs.paths = config.TrafficControlRoutesOverride

	return tcs
}

func (ss *TrafficControlService) handleSetPathVariables(request *model.Request, core service.FabricServiceCore) {
	rq, _ := request.Payload.(string)
	var pr VariableRequest
	_ = json.Unmarshal([]byte(rq), &pr)

	for _, path := range ss.paths {
		if path.Path.Key() == pr.PathName {
			path.Variables = pr.Variables
		}
	}

	ss.updateState(request, ss.paths, core)

}

func (ss *TrafficControlService) handleSetPathRQVariables(request *model.Request, core service.FabricServiceCore) {
	rq, _ := request.Payload.(string)
	var pr VariableRequest
	_ = json.Unmarshal([]byte(rq), &pr)

	for _, path := range ss.paths {
		if path.Path.Key() == pr.PathName {
			path.RequestBodyVariables = pr.Variables
		}
	}

	ss.updateState(request, ss.paths, core)

}

func (ss *TrafficControlService) HandleServiceRequest(request *model.Request, core service.FabricServiceCore) {
	switch request.RequestCommand {
	case SetPathVariables:
		ss.handleSetPathVariables(request, core)
	case SetPathRQVariables:
		ss.handleSetPathRQVariables(request, core)
	case GetAllPaths:
		ss.handleGetAllPaths(request, core)
	case SetPathToMockMode:
		ss.handleSetPathToMockMode(request, core)
	case SetPathPolymorphicSchema:
		ss.handleSetPathPolymorphicSchema(request, core)
	case SetPathPreferenceExample:
		ss.handleSetPathPreferenceExample(request, core)
	default:
		core.HandleUnknownRequest(request)
	}
}

func (ss *TrafficControlService) handleGetAllPaths(request *model.Request, core service.FabricServiceCore) {
	paths := []*Path{}
	for _, tcp := range ss.paths {
		paths = append(paths, &Path{
			PathName:             tcp.Path.Key(),
			MockType:             tcp.MockType,
			ExamplePreference:    tcp.ExamplePreference,
			MockMode:             tcp.MockMode,
			Variables:            tcp.Variables,
			RequestBodyVariables: tcp.RequestBodyVariables,
		})
	}

	if ss.document != nil {
		core.SendResponse(request, paths)
	} else {
		core.SendResponse(request, []byte("no-spec"))
	}
}

func (ss *TrafficControlService) handleSetPathToMockMode(request *model.Request, core service.FabricServiceCore) {

	rq, _ := request.Payload.(string)
	var pr PathRequest
	_ = json.Unmarshal([]byte(rq), &pr)

	for _, path := range ss.paths {
		if path.Path.Key() == pr.PathName {
			path.MockMode = pr.MockMode
		}
	}

	ss.updateState(request, ss.paths, core)

}
func (ss *TrafficControlService) handleSetPathPolymorphicSchema(request *model.Request, core service.FabricServiceCore) {

	rq, _ := request.Payload.(string)
	var pr PathRequest
	_ = json.Unmarshal([]byte(rq), &pr)

	for _, path := range ss.paths {
		if path.Path.Key() == pr.PathName {
			path.MockType = pr.MockType
		}
	}

	ss.updateState(request, ss.paths, core)
}

func (ss *TrafficControlService) updateState(request *model.Request, paths []*shared.TrafficControlPath, core service.FabricServiceCore) {
	// extract state from store.
	controls := ss.trafficControlStore.GetValue(shared.ConfigKey)
	config := controls.(*shared.WiretapConfiguration)

	config.TrafficControlRoutesOverride = paths
	ss.trafficControlStore.Put(shared.ConfigKey, config, nil)

	// core.SendResponse(request, convertTrafficControlPathsToPaths(paths))
}

func convertTrafficControlPathsToPaths(paths []shared.TrafficControlPath) []*PathRequest {
	pathResponses := []*PathRequest{}

	for _, path := range paths {
		pathResponses = append(pathResponses, &PathRequest{
			PathName:          path.Path.Key(),
			ExamplePreference: path.ExamplePreference,
			MockType:          path.MockType,
			MockMode:          path.MockMode,
		})
	}

	return pathResponses
}

func (ss *TrafficControlService) handleSetPathPreferenceExample(request *model.Request, core service.FabricServiceCore) {

	rq, _ := request.Payload.(string)
	var pr PathRequest
	_ = json.Unmarshal([]byte(rq), &pr)

	for _, path := range ss.paths {
		if path.Path.Key() == pr.PathName {
			path.ExamplePreference = pr.ExamplePreference
		}
	}

	ss.updateState(request, ss.paths, core)
}
