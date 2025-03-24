package trafficControl

import (
	"fmt"

	"github.com/pb33f/libopenapi/datamodel/high/base"
	v3 "github.com/pb33f/libopenapi/datamodel/high/v3"
	"github.com/pb33f/libopenapi/index"
	"github.com/pb33f/ranch/model"
	"github.com/pb33f/ranch/service"
	"github.com/pb33f/wiretap/shared"
)

const GetAllPaths = ("get-all-paths")

func (ss *TrafficControlService) getAllPaths(request *model.Request, core service.FabricServiceCore) {
	core.SendResponse(request, formPathsForMockIsland(ss.docModel))

}

func NewSchemaFromProxy(schemaProxy *base.SchemaProxy) (*shared.Schema, error) {
	schema, err := schemaProxy.BuildSchema()
	if err != nil {
		return nil, fmt.Errorf("could not build schema! %s", err)
	}

	var schemaBytes []byte
	var ref string
	var OneOfSchemas []*shared.Schema
	// if we have OneOf, create schemas there
	// else, this holds the schema
	if len(schema.OneOf) > 0 {
		for _, subSchema := range schema.OneOf {
			newSubschema, err := NewSchemaFromProxy(subSchema)
			if err != nil {
				return nil, fmt.Errorf("Could not build schema! %s", err)
			}

			// .value.reference
			OneOfSchemas = append(OneOfSchemas, newSubschema)
		}

	} else {
		schemaBytes, err = schemaProxy.Render()
		if err != nil {
			return nil, fmt.Errorf("could not build schema! %s", err)
		}

		// ref is populated for regular schemas, but for subschemas, no
		ref = schemaProxy.GetReference()
	}

	return &shared.Schema{
		Schema: schemaBytes,
		Ref:    ref,
		OneOf:  OneOfSchemas,
	}, nil
}

func NewMediaType(key string, mediaType *v3.MediaType) *shared.MediaType {

	schema, err := NewSchemaFromProxy(mediaType.Schema)
	if err != nil {
		panic(err)
	}

	var examples []string
	for example := mediaType.Examples.First(); example != nil; example = example.Next() {
		examples = append(examples, example.Key())
	}

	return &shared.MediaType{
		Name:     key,
		Schema:   schema,
		Examples: examples,
	}
}

func NewRequestBody(requestBody *v3.RequestBody) *shared.RequestBody {
	if requestBody == nil {
		return &shared.RequestBody{}
	}

	mediaTypeMap := make(map[string]*shared.MediaType)

	for mediaType := requestBody.Content.First(); mediaType != nil; mediaType = mediaType.Next() {
		mediaTypeMap[mediaType.Key()] = NewMediaType(mediaType.Key(), mediaType.Value())
	}

	var required bool
	if requestBody.Required == nil {
		required = false
	} else {
		required = *requestBody.Required
	}

	return &shared.RequestBody{
		Description: requestBody.Description,
		Required:    required,
		Content:     mediaTypeMap,
	}

}

func NewResponseCode(key string, responseCode *v3.Response) *shared.ResponseCode {
	mediaTypeMap := make(map[string]*shared.MediaType)

	for mediaType := responseCode.Content.First(); mediaType != nil; mediaType = mediaType.Next() {
		mediaTypeMap[mediaType.Key()] = NewMediaType(mediaType.Key(), mediaType.Value())
	}

	return &shared.ResponseCode{
		Name:        key,
		Description: responseCode.Description,
		Headers:     nil, // ! nil implemeneted
		Content:     mediaTypeMap,
	}
}

func NewResponses(responses *v3.Responses) *shared.Responses {
	codesMap := make(map[string]*shared.ResponseCode)

	for code := responses.Codes.First(); code != nil; code = code.Next() {
		codesMap[code.Key()] = NewResponseCode(code.Key(), code.Value())

	}

	return &shared.Responses{
		Codes: codesMap,
	}
}

func NewParameter(parameter *v3.Parameter) (*shared.Parameter, error) {
	if parameter == nil {
		return &shared.Parameter{}, fmt.Errorf("no parameter found")
	}

	schema, err := NewSchemaFromProxy(parameter.Schema)
	if err != nil {
		return nil, err
	}

	var required bool
	if parameter.Required == nil {
		required = false
	} else {
		required = *parameter.Required
	}

	return &shared.Parameter{
		Name:            parameter.Name,
		In:              shared.In(parameter.In),
		Description:     parameter.Description,
		Required:        required,
		AllowEmptyValue: parameter.AllowEmptyValue,
		AllowReserverd:  parameter.AllowReserved,
		Schema:          schema,
	}, nil
}

func NewOperation(operation *v3.Operation) (*shared.Operation, error) {
	if operation == nil {
		return &shared.Operation{}, fmt.Errorf("no operation found")
	}

	parameters := []*shared.Parameter{}

	for _, v3Params := range operation.Parameters {
		newParam, err := NewParameter(v3Params)

		if err == nil {
			parameters = append(parameters, newParam)
		}
	}

	return &shared.Operation{
		Tags:        operation.Tags,
		Summary:     operation.Summary,
		OperationID: operation.OperationId,
		Description: operation.Description,
		Parameters:  parameters,
		RequestBody: NewRequestBody(operation.RequestBody),
		Responses:   NewResponses(operation.Responses),
		Security:    &shared.SecurityRequirement{},
	}, nil

}

func NewPathItem(key string, pathItem *v3.PathItem) *shared.PathItem {
	operations := make(map[string]*shared.Operation)

	pi := &shared.PathItem{
		Name:        key,
		Description: pathItem.Description,
		Summary:     pathItem.Summary,
	}
	// Assuming NewOperation is a function that takes an Operation object and returns an *Operation (or nil)
	getOp, err := NewOperation(pathItem.Get)
	if err == nil {
		pi.Get = getOp
		operations["get"] = getOp
	} else {
		err = nil
	}

	putOp, err := NewOperation(pathItem.Put)
	if err == nil {
		pi.Put = putOp
		operations["put"] = putOp
	} else {
		err = nil
	}

	patchOp, err := NewOperation(pathItem.Patch)
	if err == nil {
		pi.Patch = patchOp
		operations["patch"] = patchOp
	} else {
		err = nil
	}

	postOp, err := NewOperation(pathItem.Post)
	if err == nil {
		pi.Post = postOp
		operations["post"] = postOp
	} else {
		err = nil
	}

	deleteOp, err := NewOperation(pathItem.Delete)
	if err == nil {
		pi.Delete = deleteOp
		operations["delete"] = deleteOp
	} else {
		err = nil
	}

	optionsOp, err := NewOperation(pathItem.Options)
	if optionsOp == nil {
		pi.Options = optionsOp
		operations["options"] = optionsOp
	} else {
		err = nil
	}

	pi.Operations = operations

	return pi
}

// the issue is that we need
func NewSchema(currentSchema *shared.Schema, newSchema *shared.Schema) {

	currentSchema.Schema = newSchema.Schema
	for index, newOneOfSchema := range newSchema.OneOf {
		NewSchema(currentSchema.OneOf[index], newOneOfSchema)
	}
}

// ! We do not want to have this function. We want a fix in libopenapi. This is a workaround. It will do for now.
func populateSchemasWithRefs(docModel *v3.Document, pathItems map[string]*shared.PathItem) {
	for path := docModel.Paths.PathItems.First(); path != nil; path = path.Next() {
		currentPathItem := pathItems[path.Key()]
		for operation := path.Value().GetOperations().First(); operation != nil; operation = operation.Next() {
			currentOperation := currentPathItem.Operations[operation.Key()]
			// & Responses

			if operation.Value().Responses != nil {
				for responseCode := operation.Value().Responses.Codes.First(); responseCode != nil; responseCode = responseCode.Next() {
					for content := responseCode.Value().Content.First(); content != nil; content = content.Next() {
						schemaProxy := content.Value().Schema
						newSchema, err := NewSchemaFromProxy(schemaProxy)
						if err != nil {
							panic(err)
						}
						NewSchema(currentOperation.Responses.Codes[responseCode.Key()].Content[content.Key()].Schema, newSchema)

					}
				}
			}

			// & requestBody
			if operation.Value().RequestBody != nil {
				for content := operation.Value().RequestBody.Content.First(); content != nil; content = content.Next() {
					schemaProxy := content.Value().Schema
					newSchema, err := NewSchemaFromProxy(schemaProxy)
					if err != nil {
						panic(err)
					}
					NewSchema(currentOperation.RequestBody.Content[content.Key()].Schema, newSchema)
				}
			}

			// & parameters
			if operation.Value().Parameters != nil {
				for index, parameter := range operation.Value().Parameters {
					schemaProxy := parameter.Schema
					newSchema, err := NewSchemaFromProxy(schemaProxy)
					if err != nil {
						panic(err)
					}
					NewSchema(currentOperation.Parameters[index].Schema, newSchema)
				}
			}
		}
	}
}

func formPathsForMockIsland(docModel *v3.Document) map[string]*shared.PathItem {
	pathItems := make(map[string]*shared.PathItem)

	for path := docModel.Paths.PathItems.First(); path != nil; path = path.Next() {
		pathItem := path.Value()

		pathItems[path.Key()] = NewPathItem(path.Key(), pathItem)
	}

	// ! we lose the ref property for polymorphic schemas, so we have to go through the schema a second time
	indexConfig := index.CreateClosedAPIIndexConfig()
	rolodex := index.NewRolodex(indexConfig)
	rolodex.SetRootNode(docModel.Index.GetRootNode())
	rolodex.IndexTheRolodex()
	rolodex.GetConfig().IgnorePolymorphicCircularReferences = true
	rolodex.Resolve()

	populateSchemasWithRefs(docModel, pathItems)

	return pathItems
}
