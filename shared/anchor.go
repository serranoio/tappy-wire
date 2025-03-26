package shared

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	v8 "rogchap.com/v8go"
)

// AnchorType Enum
type AnchorType string

const (
	RequestBodyAnchorType  AnchorType = "request-body"
	ResponseBodyAnchorType AnchorType = "response-body"
	ParameterAnchorType    AnchorType = "parameter"
	Workflow               AnchorType = "workflow"
	Custom                 AnchorType = "custom"
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

func (rbp *ResponseBodyProperty) ripOffPrefix() string {
	return rbp.Property[len(prefix):]
}

func (rbp *RequestBodyProperty) ripOffPrefix() string {
	return rbp.Property[len(prefix):]
}

func (rbp *ResponseBodyProperty) PopulateAnchor(mock []byte) (string, *Message, error) {
	mockString := string(mock)
	result := gjson.Get(mockString, rbp.ripOffPrefix())

	if result.Exists() {
		var value string
		value = result.Raw

		return value, &Message{Message: fmt.Sprintf("Response body property %s=%s", rbp.ripOffPrefix(), value)}, nil
	}

	return "", nil, fmt.Errorf("failed to get response body property %s", rbp.ripOffPrefix())
}

func (r *ResponseBodyProperty) GetProperty() string {
	return r.Property
}

type RequestBodyProperty struct {
	MediaTypeName string `json:"mediaTypeName"`
	Example       string `json:"example,omitempty"`
	Examples      string `json:"examples,omitempty"`
	Property      string `json:"property"`
}

func (rbp *RequestBodyProperty) InjectAnchorIntoRequstBody(request *http.Request, expressionValue string) (*Message, error) {
	body, err := io.ReadAll(request.Body)
	defer request.Body.Close()
	if err != nil {

		return nil, fmt.Errorf("could not read response body %s", err)
	}
	updatedBody, message, err := injectJSONEncodedInterfaceIntoByeString(expressionValue, rbp.ripOffPrefix(), body, "request body")

	// did not update shit
	if err != nil {
		return nil, err
	}
	request.Body = io.NopCloser(bytes.NewBuffer(updatedBody))

	return message, nil
}

func (rbp *RequestBodyProperty) PopulateAnchor(request *http.Request, pathName string) (string, *Message, error) {
	body, err := io.ReadAll(request.Body)
	if err != nil {

		return "", nil, fmt.Errorf("could not read response body %s", err)
	}
	defer request.Body.Close()

	bodyString := string(body)

	result := gjson.Get(bodyString, rbp.ripOffPrefix())

	if result.Exists() {
		var value string
		value = result.Raw

		return value, &Message{Message: fmt.Sprintf("Successfully got request body property %s", rbp.ripOffPrefix())}, nil
	}

	return "", nil, fmt.Errorf("failed to get request body property %s", rbp.ripOffPrefix())
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
	return fmt.Sprintf("%s.%s", p.Type, p.Property)
}

func (p *ParameterProperty) injectVariableIntoPath(request *http.Request, pathName string, expressionValue interface{}) (*Message, error) {
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
		return nil, fmt.Errorf("could not find variable '%s' in the path", p.Property)
	}
	if len(allMatches) > 2 {
		return nil, fmt.Errorf("You have more than one variable set as '%s' in the path, I can only use the first one. Please update your spec", p.Property)
	}

	oldPath := request.URL.Path
	if ev, ok := expressionValue.(string); ok {
		newPath := strings.ReplaceAll(request.URL.Path, allMatches[1], ev)
		request.URL.Path = newPath
		return &Message{Message: fmt.Sprintf("successfully replaced path:\n\told path: %s\n\tnew path:%s", oldPath, newPath)}, nil
	}

	return nil, fmt.Errorf("cannot insert %s into path due to type", expressionValue)
	// parameter property is found in the path, let's go put it back in
}

func (p *ParameterProperty) extractVariableFromPath(request *http.Request, pathName string) (string, error) {
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

func (p *ParameterProperty) injectVariableIntoQuery(request *http.Request, expressionValue interface{}) (*Message, error) {
	queryParams := request.URL.Query()
	oldURL := request.URL.String()

	if ev, ok := expressionValue.(string); ok {
		queryParams.Del(p.GetProperty())
		queryParams.Set(p.GetProperty(), ev)

		request.URL.RawQuery = queryParams.Encode()

		newURL := request.URL.String()

		return &Message{Message: fmt.Sprintf("old path: %s\nnew path: %s", oldURL, newURL)}, nil
	} else if ev, ok := expressionValue.([]string); ok {
		queryParams.Del(p.GetProperty())
		for _, value := range ev {
			queryParams.Add(p.GetProperty(), fmt.Sprintf("%s", value))
		}

		request.URL.RawQuery = queryParams.Encode()

		newURL := request.URL.String()

		return &Message{Message: fmt.Sprintf("old path: %s\nnew path: %s", oldURL, newURL)}, nil

	} else if ev, ok := expressionValue.([]int); ok {
		queryParams.Del(p.GetProperty())

		for _, value := range ev {
			queryParams.Add(p.GetProperty(), fmt.Sprintf("%d", value))
		}

		request.URL.RawQuery = queryParams.Encode()

		newURL := request.URL.String()

		return &Message{Message: fmt.Sprintf("old path: %s\nnew path: %s", oldURL, newURL)}, nil

	}

	return nil, fmt.Errorf("Cannot insert %s into query", expressionValue)

}

func (p *ParameterProperty) extractVariableFromQuery(request *http.Request) (string, error) {
	queryParams := request.URL.Query()

	if q, ok := queryParams[p.Property]; ok {
		json, err := json.Marshal(q)
		if err != nil {
			return "", err
		}

		return string(json), nil
	}

	return "", fmt.Errorf("there requested query param %s was not found in the request", p.Property)
}

func (p *ParameterProperty) injectVariableIntoHeader(request *http.Request, expressionValue interface{}) (*Message, error) {
	headers := request.Header
	oldHeaders := headers

	if ev, ok := expressionValue.(string); ok {
		headers.Del(p.GetProperty())
		headers.Set(p.GetProperty(), ev)

		request.Header = headers

		return &Message{Message: fmt.Sprintf("old headers %s\nnew headers %s", oldHeaders, headers)}, nil
	} else if ev, ok := expressionValue.([]string); ok {
		headers.Del(p.GetProperty())
		for _, value := range ev {
			headers.Add(p.GetProperty(), fmt.Sprintf("%s", value))
		}

		request.Header = headers

		return &Message{Message: fmt.Sprintf("old headers %s\nnew headers %s", oldHeaders, headers)}, nil

	} else if ev, ok := expressionValue.([]int); ok {
		headers.Del(p.GetProperty())

		for _, value := range ev {
			headers.Add(p.GetProperty(), fmt.Sprintf("%d", value))
		}

		request.Header = headers

		return &Message{Message: fmt.Sprintf("old headers %s\nnew headers %s", oldHeaders, headers)}, nil

	}

	return nil, fmt.Errorf("Cannot insert %s into query", expressionValue)
}

func (p *ParameterProperty) extractVariableFromHeader(request *http.Request) (string, error) {
	headers := request.Header

	if h, ok := headers[p.Property]; ok {
		json, err := json.Marshal(h)
		if err != nil {
			return "", err
		}

		return string(json), nil
	}

	return "", fmt.Errorf("the requested header %s was not found in the request", p.Property)
}

func (p *ParameterProperty) InjectVariableIntoParameter(request *http.Request, pathName string, expressionValue interface{}) (*Message, error) {
	var err error
	var message *Message

	switch p.Type {
	case QUERY:
		message, err = p.injectVariableIntoQuery(request, expressionValue)
		break
	case PATH:
		message, err = p.injectVariableIntoPath(request, pathName, expressionValue)
		break
	case HEADER:
		message, err = p.injectVariableIntoHeader(request, expressionValue)
		break
	case COOKIE:
		err = fmt.Errorf("I have no idea how you fucking got here lmao.")
	}

	if err != nil {
		return nil, err
	}

	return message, nil
}

func (p *ParameterProperty) PopulateAnchor(request *http.Request, pathName string) (string, *Message, error) {

	var variable string
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
		return "", nil, err
	}

	return variable, &Message{Message: fmt.Sprintf("Successfully extracted $%s.%s=%s", p.Type, p.Property, variable)}, nil
}

type Property interface {
	GetProperty() string
}

type AnchorReference struct {
	ID       string `json:"id"`
	Property string `json:"property"`
	PathName string `json:"pathName"`
}

// in a path with a spec of /users/{id}/hello/ok, get id variable

// replace specific variable {id} with *

// Property Interface

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
	Value                string                `json:"value"`
	ExpressionValue      string                `json:"expressionValue"`
	ReceiverPipes        []string              `json:"receiverPipes"`
	SenderPipes          []string              `json:"senderPipes"`
	AnchorReferences     []AnchorReference     `json:"anchorReferences"`
}

func (a *Anchor) IsResponse() bool {

	switch a.ReferenceType {
	case ResponseBodyAnchorType:
		return true
	case Workflow:
		return true
	case Custom:
		return true
	}

	return false
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

const prefix = "properties."

func (a *Anchor) GetPropertyForMock() string {
	return a.GetProperty()[len(prefix):]
}

func (a *Anchor) GetFullProperty() string {
	return fmt.Sprintf("$%s-%s", a.ID, a.GetProperty())
}

func (a *Anchor) PopulateAnchorRequest(request *http.Request) (*Message, error) {
	var err error
	var message *Message
	var value string

	switch a.ReferenceType {
	case ParameterAnchorType:
		value, message, err = a.ParameterProperty.PopulateAnchor(request, a.PathName)
	case RequestBodyAnchorType:
		value, message, err = a.RequestBodyProperty.PopulateAnchor(request, a.PathName)
	case Workflow:
	case Custom:
	}

	a.Value = value

	message.ReceiverAnchor = MessageAnchor{
		ID:    a.ID,
		Value: a.Value,
	}

	return message, err
}

func injectJSONEncodedInterfaceIntoByeString(ev string, property string, byteString []byte, name string) ([]byte, *Message, error) {
	if ev == "" {
		return byteString, &Message{Message: fmt.Sprintf("there is no value in the expression, taking random mock value for property %s", property)}, nil
	}

	updatedByteString, err := sjson.SetRawBytes(byteString, property, []byte(ev))
	if err != nil {
		return updatedByteString, nil, fmt.Errorf("tried inserting %s at property %s into the %s, returning original %s", ev, property, name, name)
	}

	return updatedByteString, &Message{Message: fmt.Sprintf("successfully inserted %s at property %s into the %s", ev, property, name)}, nil
}

func (a *Anchor) InjectAnchorValueIntoMock(mock []byte) ([]byte, *Message, error) {
	return injectJSONEncodedInterfaceIntoByeString(a.ExpressionValue, a.GetPropertyForMock(), mock, "mock")
	// j, err := json.Marshal(a.ExpressionValue)
	// if err != nil {
	// 	return mock, nil, fmt.Errorf("could not decode %s", err)
	// }

	// updatedMock, err := sjson.SetRawBytes(mock, a.GetPropertyForMock(), j)
	// if err != nil {
	// 	return mock, nil, fmt.Errorf("tried inserting %s at property %s into the mock, returning original mock", j, a.GetProperty())
	// }

	// return updatedMock, &Message{Message: fmt.Sprintf("successfully inserted %s at property %s into the mock", j, a.GetProperty())}, nil
}

func (a *Anchor) InjectAnchorValueIntoRequest(request *http.Request) (*Message, error) {
	var message *Message
	var err error
	switch a.ReferenceType {
	case RequestBodyAnchorType:
		message, err = a.RequestBodyProperty.InjectAnchorIntoRequstBody(request, a.ExpressionValue)
	case ParameterAnchorType:
		message, err = a.ParameterProperty.InjectVariableIntoParameter(request, a.PathName, a.ExpressionValue)
	}

	return message, err
}

func (a *Anchor) PopulateAnchorResponse(mock []byte) (*Message, error) {
	var err error
	var message *Message
	var value string

	switch a.ReferenceType {
	case ResponseBodyAnchorType:
		value, message, err = a.ResponseBodyProperty.PopulateAnchor(mock)
	case Workflow:
	case Custom:
	}

	a.Value = value

	message.ReceiverAnchor = MessageAnchor{
		ID:    a.ID,
		Value: a.Value,
	}

	return message, err
}

// !! for now, we will match by name. There will be collisons if different properties contain the same name.
// feed pipes
func (a *Anchor) receiveDataFromPipes(mb *Mockboard) ([]AnchorReference, []string, []*Message) {

	// ^ 1. get all values THAT ARE IN THE EXPRESSION STRING!!!!
	// match properties in expression string
	// get their anchor ID's,
	// get their expression values
	var values []string
	var ars []AnchorReference
	var messages []*Message

	for _, rp := range a.ReceiverPipes {
		for _, wf := range mb.GetActivatedWorkflows() {
			for pipeID, _ := range wf.Pipes {
				if pipeID == rp {
					// $query.name + 4 + 6 + $properties.id
					inputAnchor, _ := mb.GetPipeAnchors(pipeID)
					// $query.name
					// if the expression contains the full property
					if inputAnchor.ExpressionValue == "" {
						messages = append(messages, &Message{
							Message: fmt.Sprintf("anchor %s (id: %s) has no value, not sending %s", inputAnchor.GetFullProperty(), inputAnchor.ID, inputAnchor.ExpressionValue),
							SenderAnchor: MessageAnchor{
								ID:    inputAnchor.ID,
								Value: inputAnchor.ExpressionValue,
							},
						})

						continue
					}
					if strings.Contains(a.Expression, inputAnchor.GetFullProperty()) {
						values = append(values, inputAnchor.ExpressionValue)
						ars = append(ars, AnchorReference{
							ID:       inputAnchor.ID,
							Property: inputAnchor.GetFullProperty(),
							PathName: inputAnchor.PathName,
						})
						messages = append(messages, &Message{
							Message: fmt.Sprintf("anchor %s (id: %s) is sending %s", inputAnchor.GetFullProperty(), inputAnchor.ID, inputAnchor.ExpressionValue),
							ReceiverAnchor: MessageAnchor{
								ID: a.ID,
							},
							SenderAnchor: MessageAnchor{
								ID:    inputAnchor.ID,
								Value: inputAnchor.ExpressionValue,
							},
						})
					}
				}
			}
		}
	}

	// get this anchor reference if it is within expression
	if strings.Contains(a.Expression, a.GetFullProperty()) {
		// & already json encoded
		if a.ReferenceType == RequestBodyAnchorType || a.ReferenceType == ResponseBodyAnchorType {
			values = append(values, a.Value)
		} else {
			j, _ := json.Marshal(a.Value)
			values = append(values, string(j))
		}

		ars = append(ars, AnchorReference{
			ID:       a.ID,
			Property: a.GetFullProperty(),
			PathName: a.PathName,
		})
	}

	// empty string case
	// 1. the sender is not populated & it is ONLY in the expression, then there is no value produced. then we want to take the old mock property

	return ars, values, messages
}

func (a *Anchor) formFunctionCall(anchorReferences []AnchorReference, values []string) string {

	var variablesString string

	evalExpression := a.Expression
	// form variables
	for i, value := range values {
		varName := fmt.Sprintf("var%d", i)
		variablesString += fmt.Sprintf("\tconst %s = JSON.parse('%s');\n", varName, value)

		// replace the expression with the variable names too!
		evalExpression = strings.ReplaceAll(evalExpression, anchorReferences[i].Property, varName)
	}

	// if len(variablesString) == 0 {
	// 	num, err := strconv.Atoi(evalExpression)
	// 	if err != nil {
	// 		evalExpression = fmt.Sprintf("\"%s\"", evalExpression)
	// 	} else {
	// 		evalExpression = fmt.Sprintf("\"%d\"", num)
	// 	}
	// }

	javaScript := fmt.Sprintf(`
%s
	const run = () => {


		return JSON.stringify(%s);
	}

	`, variablesString, evalExpression)

	return javaScript
}

func (a *Anchor) executeJS(ars []AnchorReference, values []string) (*Message, error) {

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

	if val.IsString() {
		a.ExpressionValue = fmt.Sprintf("%s", val)
	} else if val.IsNumber() {
		a.ExpressionValue = fmt.Sprintf("%d", val)
	}

	return &Message{Message: fmt.Sprintf("js executed: %s, giving expressionValue of %s", js, val)}, nil
}

// I think I need to add scripting.
// each one is actually a variable.
// update: I added scripteing
func (a *Anchor) ComputeAnchorExpession(mb *Mockboard) ([]*Message, error) {
	// get all receiver pipes
	ars, values, messages := a.receiveDataFromPipes(mb)

	message, err := a.executeJS(ars, values)
	if err != nil {
		return messages, err
	} else {
		messages = append(messages, message)
	}

	return messages, nil
}

func NewAnchor(id string, referenceType AnchorType, propertyType Property) *Anchor {
	expression := ""
	pathMethod := ""
	pathName := ""
	stepID := ""
	anchor := &Anchor{
		ID:               id,
		ReferenceType:    referenceType,
		Expression:       expression,
		PathMethod:       pathMethod,
		PathName:         pathName,
		ReceiverPipes:    []string{},
		SenderPipes:      []string{},
		StepID:           stepID,
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
