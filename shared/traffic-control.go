package shared

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/gobwas/glob"
	v3 "github.com/pb33f/libopenapi/datamodel/high/v3"
	"github.com/speakeasy-api/openapi/arazzo"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	v8 "rogchap.com/v8go"
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
	Value string
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

func (mb *Mockboard) GetActivatedWorkflows() []*WorkflowMetadata {
	activatedWorkflows := []*WorkflowMetadata{}

	for _, v := range mb.WorkflowMetadata {
		if v.IsActivated {
			activatedWorkflows = append(activatedWorkflows, v)
		}

	}

	return activatedWorkflows
}

// AnchorType Enum
type AnchorType string

const (
	RequestBody  AnchorType = "request-body"
	ResponseBody AnchorType = "response-body"
	Parameter    AnchorType = "parameter"
	Workflow     AnchorType = "workflow"
	Custom       AnchorType = "custom"
)

// Polymorphism Enum
type Polymorphism string

const (
	AnyOf Polymorphism = "anyOf"
	AllOf Polymorphism = "allOf"
	Not   Polymorphism = "not"
	OneOf Polymorphism = "oneOf"
	Empty Polymorphism = ""
)

// ResponseBodyProperty Struct
type ResponseBodyProperty struct {
	MediaTypeName    string `json:"mediaTypeName"`
	ResponseCodeName string `json:"responseCodeName"`
	Example          string `json:"example,omitempty"`
	Examples         string `json:"examples,omitempty"`
	Property         string `json:"property"`
}

func (rbp *ResponseBodyProperty) PopulateAnchor(mock []byte) (interface{}, *Message, error) {
	mockString := string(mock)
	result := gjson.Get(mockString, rbp.Property)

	if result.Exists() {
		var value interface{}
		value = result.Raw

		return value, &Message{message: fmt.Sprintf("Successfully got response body property %s", rbp.Property)}, nil
	}

	return nil, nil, fmt.Errorf("failed to get response body property %s", rbp.Property)
}

func (r *ResponseBodyProperty) GetProperty() string {
	return r.Property
}

// RequestBodyProperty Struct
type RequestBodyProperty struct {
	MediaTypeName string `json:"mediaTypeName"`
	Example       string `json:"example,omitempty"`
	Examples      string `json:"examples,omitempty"`
	Property      string `json:"property"`
}

func (rbp *RequestBodyProperty) PopulateAnchor(request *http.Request, pathName string, operation *v3.Operation) (interface{}, *Message, error) {
	body, err := io.ReadAll(request.Body)
	if err != nil {

		return nil, nil, fmt.Errorf("could not read response body %s", err)
	}
	defer request.Body.Close()

	bodyString := string(body)

	result := gjson.Get(bodyString, rbp.Property)

	if result.Exists() {
		var value interface{}
		value = result.Raw

		return value, &Message{message: fmt.Sprintf("Successfully got request body property %s", rbp.Property)}, nil
	}

	return nil, nil, fmt.Errorf("failed to get request body property %s", rbp.Property)
}

func (r *RequestBodyProperty) GetProperty() string {
	return r.Property
}

// ParameterProperty Struct
type ParameterProperty struct {
	Type     In     `json:"type"`
	Property string `json:"property"`
}

func (p *ParameterProperty) GetProperty() string {
	return p.Property
}

// in a path with a spec of /users/{id}/hello/ok, get id variable

// replace specific variable {id} with *
func (p *ParameterProperty) extractVariableFromPath(request *http.Request, pathName string) (interface{}, error) {
	// var errors []error
	// get all variable names, match with this one
	// users/*/hello/ok

	specPath := pathName

	noMoney := regexp.MustCompile(`\{[^}]*\}`)

	// getting all variables in the string
	// [{var}, {var2}]
	allSlugs := noMoney.FindAllString(specPath, -1)
	for _, slug := range allSlugs {
		specPath = strings.Replace(specPath, slug, `(.*)`, 1)
	}

	pathInRegex := regexp.MustCompile(specPath)

	allMatches := pathInRegex.FindStringSubmatch(request.URL.Path)

	if len(allMatches) == 0 {
		return "", fmt.Errorf("could not find variable '%s' in the path", p.Property)
	}
	if len(allMatches) > 2 {
		return allMatches[1], fmt.Errorf("You have more than one variable set as '%s' in the path, I can only use the first one. Please update your spec", p.Property)
	}
	return allMatches[1], nil
}

func (p *ParameterProperty) extractVariableFromQuery(request *http.Request) (interface{}, error) {
	queryParams := request.URL.Query()

	if q, ok := queryParams[p.Property]; ok {
		return q, nil
	}

	return nil, fmt.Errorf("there requested query param %s was not found in the request", p.Property)
}

func (p *ParameterProperty) extractVariableFromHeader(request *http.Request) (interface{}, error) {
	headers := request.Header

	if h, ok := headers[p.Property]; ok {
		return h, nil
	}

	return nil, fmt.Errorf("the requested header %s was not found in the request", p.Property)
}

func (p *ParameterProperty) PopulateAnchor(request *http.Request, pathName string, operation *v3.Operation) (interface{}, *Message, error) {

	var variable interface{}
	var err error

	switch p.Type {
	case QUERY:
		variable, err = p.extractVariableFromQuery(request)
		break
	case PATH:
		variable, err = p.extractVariableFromPath(request, pathName)
		break
	case HEADER:
		variable, err = p.extractVariableFromHeader(request)
		break
	case COOKIE:
		err = fmt.Errorf("I have no idea how you fucking got here lmao.")
	}

	if err != nil {
		return nil, nil, err
	}

	return variable, &Message{message: fmt.Sprintf("Successfully extracted $%s.%s=%s", p.Type, p.Property, variable)}, nil
}

// Property Interface
type Property interface {
	GetProperty() string
}

type AnchorReference struct {
	ID       string `json:"id"`
	Property string `json:"property"`
}

// Anchor Struct
type Anchor struct {
	ReferenceType        AnchorType            `json:"referenceType"`
	ID                   string                `json:"id"`
	ResponseBodyProperty *ResponseBodyProperty `json:"responseBodyProperty,omitempty"`
	RequestBodyProperty  *RequestBodyProperty  `json:"requestBodyProperty,omitempty"`
	ParameterProperty    *ParameterProperty    `json:"parameterProperty,omitempty"`
	Expression           string                `json:"expression"`
	PathName             string                `json:"pathName,omitempty"`
	PathMethod           string                `json:"pathMethod,omitempty"`
	StepID               string                `json:"stepID"`
	Value                interface{}           `json:"value"`
	ExpressionValue      interface{}           `json:"expressionValue"`
	ReceiverPipes        []string              `json:"receiverPipes"`
	SenderPipes          []string              `json:"senderPipes"`
	AnchorReferences     []AnchorReference     `json:"anchorReferences"`
}

func (a *Anchor) IsResponse() bool {

	switch a.ReferenceType {
	case ResponseBody:
		return true
	case Workflow:
		return true
	case Custom:
		return true
	}

	return false
}

func (a *Anchor) PopulateAnchorRequest(request *http.Request, operation *v3.Operation) (*Message, error) {
	var err error
	var message *Message
	var value interface{}

	switch a.ReferenceType {
	case Parameter:
		value, message, err = a.ParameterProperty.PopulateAnchor(request, a.PathName, operation)
	case RequestBody:
		value, message, err = a.RequestBodyProperty.PopulateAnchor(request, a.PathName, operation)
	case Workflow:
	case Custom:
	}

	a.Value = value

	return message, err
}

func (a *Anchor) InjectAnchorValueIntoMock(mock []byte) ([]byte, *Message, error) {
	// ! todo: please please resolve 'property' ambiguity
	j, _ := a.ExpressionValue.([]byte)

	updatedMock, err := sjson.SetRawBytes(mock, a.GetPropertyForMock(), j)
	if err != nil {
		return mock, nil, fmt.Errorf("tried inserting %s at property %s into the mock, returning original mock", j, a.GetProperty())
	}

	return updatedMock, &Message{message: fmt.Sprintf("successfully inserted %s at property %s into the mock", j, a.GetProperty())}, nil
}

func (a *Anchor) PopulateAnchorResponse(mock []byte) (*Message, error) {
	var err error
	var message *Message
	var value interface{}

	switch a.ReferenceType {
	case ResponseBody:
		value, message, err = a.ResponseBodyProperty.PopulateAnchor(mock)
	case Workflow:
	case Custom:
	}

	a.Value = value

	return message, err
}

// !! for now, we will match by name. There will be collisons if different properties contain the same name.
// feed pipes
func (a *Anchor) receiveDataFromPipes(mb *Mockboard) ([]AnchorReference, []interface{}, []*Message) {
	foundThisWorkflow := false

	// ^ 1. get all values THAT ARE IN THE EXPRESSION STRING!!!!
	// match properties in expression string
	// get their anchor ID's,
	// get their expression values
	var values []interface{}
	var ars []AnchorReference
	var messages []*Message

	for _, rp := range a.ReceiverPipes {
		for _, wf := range mb.GetActivatedWorkflows() {
			for pipeID, pipe := range wf.Pipes {
				if pipeID == rp {
					for _, ar := range a.AnchorReferences {
						// $query.name + 4 + 6 + $properties.id
						// $query.name
						if ar.ID == pipe.Input.ID && strings.Contains(a.Expression, ar.Property) {
							values = append(values, pipe.Input.ExpressionValue)
							ars = append(ars, ar)
							messages = append(messages, &Message{
								message: fmt.Sprintf("anchor %s (id: %s) is sending %s", pipe.Input.GetProperty(), pipe.Input.ID, pipe.Input.ExpressionValue),
							})
						}
					}
					foundThisWorkflow = true
				}
			}
			if foundThisWorkflow {
				break
			}
		}
	}

	// get this anchor reference if it is within expression
	if strings.Contains(a.Expression, a.GetProperty()) {
		values = append(values, a.Value)
		ars = append(ars, AnchorReference{
			ID:       a.ID,
			Property: a.GetProperty(),
		})
	}

	return ars, values, messages
}

func (a *Anchor) formFunctionCall(anchorReferences []AnchorReference, values []interface{}) string {

	var variablesString string

	evalExpression := a.Expression
	// form variables
	for i, value := range values {
		varName := fmt.Sprintf("var%d", i)
		if v, success := value.(string); success {
			variablesString += fmt.Sprintf("\tconst %s = JSON.parse('%s');\n", varName, v)
		} else if v, success := value.(int); success {
			variablesString += fmt.Sprintf("\tconst %s = JSON.parse('%d');\n", varName, v)
		}
		// replace the expression with the variable names too!
		//
		evalExpression = strings.ReplaceAll(evalExpression, anchorReferences[i].Property, varName)
	}

	javaScript := fmt.Sprintf(`
%s
	const run = () => {


		return JSON.stringify(%s);
	}

	`, variablesString, evalExpression)

	return javaScript
}

func (a *Anchor) executeJS(ars []AnchorReference, values []interface{}) (*Message, error) {

	js := a.formFunctionCall(ars, values)
	ctx := v8.NewContext()

	_, err := ctx.RunScript(js, "main.js")
	if err != nil {
		return nil, fmt.Errorf("error in creating your js expression %s", err)
	}

	val, err := ctx.RunScript("run()", "main.js")
	if err != nil {
		return nil, fmt.Errorf("error in creating js response %s", err)
	}

	a.ExpressionValue = fmt.Sprintf("%s", val)

	return &Message{message: fmt.Sprintf("js executed: %s", js)}, nil
}

// I think I need to add scripting.
// each one is actually a variable.
// update: I added scripteing
func (a *Anchor) ComputeAnchorExpession(mb *Mockboard) (*Message, error) {
	// get all receiver pipes
	ars, values, messages := a.receiveDataFromPipes(mb)

	message, err := a.executeJS(ars, values)
	if err != nil {
		return message, err
	} else {
		messages = append(messages, message)
	}

	return message, nil
}

func NewAnchor(id string, referenceType AnchorType, propertyType Property) *Anchor {
	anchor := &Anchor{
		ID:               id,
		ReferenceType:    referenceType,
		Expression:       "",
		PathMethod:       "",
		PathName:         "",
		ReceiverPipes:    []string{},
		SenderPipes:      []string{},
		StepID:           "",
		AnchorReferences: []AnchorReference{},
		ExpressionValue:  "",
	}

	switch v := propertyType.(type) {
	case *ResponseBodyProperty:
		anchor.ResponseBodyProperty = v
	case *RequestBodyProperty:
		anchor.RequestBodyProperty = v
	case *ParameterProperty:
		anchor.ParameterProperty = v
	}

	return anchor
}

func (a *Anchor) GetProperty() string {
	if a.ResponseBodyProperty != nil {
		return a.ResponseBodyProperty.GetProperty()
	}
	if a.RequestBodyProperty != nil {
		return a.RequestBodyProperty.GetProperty()
	}
	if a.ParameterProperty != nil {
		return a.ParameterProperty.GetProperty()
	}
	return ""
}

const prefix = "$properties."

func (a *Anchor) GetPropertyForMock() string {
	return a.GetProperty()[len(prefix):]
}

func (a *Anchor) GetFullProperty() string {
	return fmt.Sprintf("%s | %s | %s", a.PathName, a.PathMethod, a.GetProperty())
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
