package trafficControl

import (
	"fmt"
	"os"

	"github.com/pb33f/libopenapi/datamodel/high/base"
	v3 "github.com/pb33f/libopenapi/datamodel/high/v3"
	"github.com/pb33f/libopenapi/index"
	"github.com/pb33f/ranch/model"
	"github.com/pb33f/ranch/service"
	"github.com/pb33f/wiretap/shared"
)

const GetAllPaths = ("get-all-paths")

func (ss *TrafficControlService) getAllPaths(request *model.Request, core service.FabricServiceCore) {
	core.SendResponse(request, formPathsForMockIsland(ss.docModel, ss.docModel.Rolodex, ss.resolvedSchemas))

}

type MediaType struct {
	Name           string `json:"name"`
	Schema         []byte `json:"schema"`
	ResolvedSchema []byte `json:"resolvedSchema"`
}

func resolveSchema(schemaRenderer *base.SchemaProxy, rolodex *index.Rolodex, resolvedSchemas map[string]string) (string, string, error) {
	schemaBytes, err := schemaRenderer.Render()

	// mediaType.
	if err != nil {

		return "", "", fmt.Errorf("there is no schema")
	}

	// set the rolodex root node to the root node of the spec.
	node := schemaRenderer.GetValueNode()

	rolodex.SetRootNode(node)
	rolodex.Resolve()

	resolvedSchemaBytes, err := schemaRenderer.Render()
	if err != nil {
		return "", "", fmt.Errorf("there is no resolved schema")
	}

	// after finally finishing the refactor, I want to get the resolved schema key, see if the schema matches any part, and then replace where it matches
	resolvedSchema := string(resolvedSchemaBytes)
	schema := string(schemaBytes)

	str := ""
	for k, v := range resolvedSchemas {
		str += fmt.Sprintf("%s\n%s\n\n", v, k)
	}
	os.WriteFile("test.txt", []byte(str), 0755)

	// if it is in the map, schema is now unresolved schema
	if s, ok := resolvedSchemas[resolvedSchema]; ok {
		schema = s
	} else {
		// if resolved schema is not in the map
		resolvedSchemas[resolvedSchema] = schema

	}

	// resolved schema = #/components/Pets

	// resolved schema is contained in schema

	// // the key is the "blah blah blah"
	// // unresolved schema
	// for resolvedSchemaInMap, unresolvedSchema := range resolvedSchemas {
	// 	regex := regexp.MustCompile(fmt.Sprintf(".*%s.*", resolvedSchemaInMap))

	// 	if regex.MatchString(schema) {
	// 		schema = regex.ReplaceAllString(schema, unresolvedSchema)
	// 		break
	// 	}
	// }
	// if schema contains resolved schema, replace with unresolved schema

	return schema, resolvedSchema, nil
}

func NewMediaType(key string, mediaType *v3.MediaType, rolodex *index.Rolodex, resolvedSchemas map[string]string) *MediaType {

	schema, resolvedSchema, err := resolveSchema(mediaType.Schema, rolodex, resolvedSchemas)
	if err != nil {
		panic(err)
	}

	return &MediaType{
		Name:           key,
		Schema:         []byte(schema),
		ResolvedSchema: []byte(resolvedSchema),
	}
}

type RequestBody struct {
	Description string                `json:"description"`
	Required    bool                  `json:"required"`
	Content     map[string]*MediaType `json:"content"`
}

func NewRequestBody(requestBody *v3.RequestBody, rolodex *index.Rolodex, resolvedSchemas map[string]string) *RequestBody {
	if requestBody == nil {
		return &RequestBody{}
	}

	mediaTypeMap := make(map[string]*MediaType)

	for mediaType := requestBody.Content.First(); mediaType != nil; mediaType = mediaType.Next() {
		mediaTypeMap[mediaType.Key()] = NewMediaType(mediaType.Key(), mediaType.Value(), rolodex, resolvedSchemas)
	}

	var required bool
	if requestBody.Required == nil {
		required = false
	} else {
		required = *requestBody.Required
	}

	return &RequestBody{
		Description: requestBody.Description,
		Required:    required,
		Content:     mediaTypeMap,
	}

}

type Header struct {
}

type ResponseCode struct {
	Name        string                `json:"name"`
	Description string                `json:"description"`
	Headers     map[string]*Header    `json:"headers"`
	Content     map[string]*MediaType `json:"content"`
}

func NewResponseCode(key string, responseCode *v3.Response, rolodex *index.Rolodex, resolvedSchemas map[string]string) *ResponseCode {
	mediaTypeMap := make(map[string]*MediaType)

	for mediaType := responseCode.Content.First(); mediaType != nil; mediaType = mediaType.Next() {
		mediaTypeMap[mediaType.Key()] = NewMediaType(mediaType.Key(), mediaType.Value(), rolodex, resolvedSchemas)
	}

	return &ResponseCode{
		Name:        key,
		Description: responseCode.Description,
		Headers:     nil, // ! nil implemeneted
		Content:     mediaTypeMap,
	}
}

type Responses struct {
	Codes map[string]*ResponseCode `json:"codes"`
}

func NewResponses(responses *v3.Responses, rolodex *index.Rolodex, resolvedSchemas map[string]string) *Responses {
	codesMap := make(map[string]*ResponseCode)

	for code := responses.Codes.First(); code != nil; code = code.Next() {
		codesMap[code.Key()] = NewResponseCode(code.Key(), code.Value(), rolodex, resolvedSchemas)

	}

	return &Responses{
		Codes: codesMap,
	}
}

type SecurityRequirement struct {
}

type Parameter struct {
	Name            string    `json:"name"`
	In              shared.In `json:"in"`
	Description     string    `json:"description"`
	Required        bool      `json:"required"`
	AllowEmptyValue bool      `json:"allowEmptyValue"`
	AllowReserverd  bool      `json:"allowReserverd"`
	Schema          []byte    `json:"schema"`
	ResolvedSchema  []byte    `json:"resolvedSchema"`
}

func NewParameter(parameter *v3.Parameter, rolodex *index.Rolodex, resolvedSchemas map[string]string) (*Parameter, error) {
	if parameter == nil {
		return &Parameter{}, fmt.Errorf("no parameter found")
	}

	schema, _ := parameter.Schema.Render()
	var resolvedSchemaBytes []byte
	if schema == nil {
		schema = []byte("")
	} else {
		// set the rolodex root node to the root node of the spec.
		node := parameter.GoLow().Schema.ValueNode

		rolodex.SetRootNode(node)
		rolodex.Resolve()

		resolvedSchemaBytes, err := parameter.Schema.Render()

		if err != nil {
			return nil, fmt.Errorf("failed to resolve parameter schema %s", resolvedSchemaBytes)
		}

	}

	var required bool
	if parameter.Required == nil {
		required = false
	} else {
		required = *parameter.Required
	}

	return &Parameter{
		Name:            parameter.Name,
		In:              shared.In(parameter.In),
		Description:     parameter.Description,
		Required:        required,
		AllowEmptyValue: parameter.AllowEmptyValue,
		AllowReserverd:  parameter.AllowReserved,
		Schema:          schema,
		ResolvedSchema:  resolvedSchemaBytes,
	}, nil
}

type Operation struct {
	Tags        []string             `json:"tags"`
	Summary     string               `json:"summary"`
	Description string               `json:"description"`
	OperationID string               `json:"operationId"`
	Parameters  []*Parameter         `json:"parameters,omitempty"`
	RequestBody *RequestBody         `json:"requestBody,omitempty"`
	Responses   *Responses           `json:"responses"`
	Security    *SecurityRequirement `json:"security,omitempty"`
}

func NewOperation(operation *v3.Operation, rolodex *index.Rolodex, resolvedSchemas map[string]string) (*Operation, error) {
	if operation == nil {
		return &Operation{}, fmt.Errorf("no operation found")
	}

	parameters := []*Parameter{}

	for _, v3Params := range operation.Parameters {
		newParam, err := NewParameter(v3Params, rolodex, resolvedSchemas)

		if err == nil {
			parameters = append(parameters, newParam)
		}
	}

	return &Operation{
		Tags:        operation.Tags,
		Summary:     operation.Summary,
		OperationID: operation.OperationId,
		Description: operation.Description,
		Parameters:  parameters,
		RequestBody: NewRequestBody(operation.RequestBody, rolodex, resolvedSchemas),
		Responses:   NewResponses(operation.Responses, rolodex, resolvedSchemas),
		Security:    &SecurityRequirement{},
	}, nil

}

type PathItem struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Summary     string     `json:"summary"`
	Get         *Operation `json:"get,omitempty"`
	Put         *Operation `json:"put,omitempty"`
	Post        *Operation `json:"post,omitempty"`
	Delete      *Operation `json:"delete,omitempty"`
	Patch       *Operation `json:"patch,omitempty"`
	Options     *Operation `json:"options,omitempty"`
}

func NewPathItem(key string, pathItem *v3.PathItem, rolodex *index.Rolodex, resolvedSchemas map[string]string) *PathItem {
	pi := &PathItem{
		Name:        key,
		Description: pathItem.Description,
		Summary:     pathItem.Summary,
	}
	// Assuming NewOperation is a function that takes an Operation object and returns an *Operation (or nil)
	getOp, err := NewOperation(pathItem.Get, rolodex, resolvedSchemas)
	if err == nil {
		pi.Get = getOp
	} else {
		err = nil
	}

	putOp, err := NewOperation(pathItem.Put, rolodex, resolvedSchemas)
	if err == nil {
		pi.Put = putOp
	} else {
		err = nil
	}

	patchOp, err := NewOperation(pathItem.Patch, rolodex, resolvedSchemas)
	if err == nil {
		pi.Patch = patchOp
	} else {
		err = nil
	}

	postOp, err := NewOperation(pathItem.Post, rolodex, resolvedSchemas)
	if err == nil {
		pi.Post = postOp
	} else {
		err = nil
	}

	deleteOp, err := NewOperation(pathItem.Delete, rolodex, resolvedSchemas)
	if err == nil {
		pi.Delete = deleteOp
	} else {
		err = nil
	}

	optionsOp, err := NewOperation(pathItem.Options, rolodex, resolvedSchemas)
	if optionsOp == nil {
		pi.Options = optionsOp
	} else {
		err = nil
	}

	return pi
}

func formPathsForMockIsland(docModel *v3.Document, rolodex *index.Rolodex, resolvedSchemas map[string]string) map[string]*PathItem {
	pathItems := make(map[string]*PathItem)

	for path := docModel.Paths.PathItems.First(); path != nil; path = path.Next() {
		pathItem := path.Value()

		pathItems[path.Key()] = NewPathItem(path.Key(), pathItem, rolodex, resolvedSchemas)
	}

	return pathItems
}
