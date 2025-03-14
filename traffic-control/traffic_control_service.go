// Copyright 2023 Princess B33f Heavy Industries / Dave Shanley
// SPDX-License-Identifier: AGPL

package trafficControl

import (
	"sync"

	"github.com/pb33f/libopenapi"
	v3 "github.com/pb33f/libopenapi/datamodel/high/v3"
	"github.com/pb33f/libopenapi/index"
	"github.com/pb33f/ranch/bus"
	"github.com/pb33f/ranch/model"
	"github.com/pb33f/ranch/service"
	"github.com/pb33f/wiretap/shared"
)

// todo: TrafficControlPath type needs to be moved to shared so that it can be used here
// then we can access the data here

const (
	TrafficControlServiceChan = "traffic-control"
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
	trafficControlStore bus.BusStore
	serviceCore         service.FabricServiceCore
	mockboard           *shared.Mockboard
	rolodex             *index.Rolodex
	resolvedSchemas     map[string]string
	mutex               *sync.Mutex
}

func NewTrafficControlService(document libopenapi.Document) *TrafficControlService {
	tcs := &TrafficControlService{}
	if document == nil {
		return tcs
	}

	tcs.mutex = &sync.Mutex{}

	storeManager := bus.GetBus().GetStoreManager()
	trafficControlStore := storeManager.CreateStore(TrafficControlServiceChan)
	tcs.trafficControlStore = trafficControlStore

	m, _ := document.BuildV3Model()
	tcs.document = document
	tcs.docModel = &m.Model

	indexConfig := index.CreateClosedAPIIndexConfig()
	// create a new rolodex
	rolodex := index.NewRolodex(indexConfig)
	// * the rolodex is so fucking powerful, what the actual fuck
	rolodex.SetRootNode(tcs.docModel.Index.GetRootNode())
	rolodex.IndexTheRolodex()
	tcs.rolodex = rolodex

	tcs.resolvedSchemas = make(map[string]string)

	mockboard, err := setupMockboard()
	if err != nil {
		panic(err)
	}

	tcs.mockboard = mockboard

	return tcs
}

func (ss *TrafficControlService) HandleServiceRequest(request *model.Request, core service.FabricServiceCore) {
	switch request.RequestCommand {
	case GetWorkflows:
		ss.getWorkflows(request, core)
	case CreateNewWorkflow:
		ss.createNewWorkflow(request, core)
	case UpdateWorkflow:
		ss.updateWorkflow(request, core)
	case DeleteWorkflow:
		ss.deleteWorkflow(request, core)
	case GetAllPaths:
		ss.getAllPaths(request, core)
	default:
		core.HandleUnknownRequest(request)
	}
}

func (ss *TrafficControlService) updateState() {
	// extract state from store.
	controls := ss.trafficControlStore.GetValue(shared.ConfigKey)
	config := controls.(*shared.WiretapConfiguration)

	config.Mockboard = ss.mockboard
	ss.trafficControlStore.Put(shared.ConfigKey, config, nil)
}
