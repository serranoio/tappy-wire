package trafficControl

import (
	"github.com/pb33f/wiretap/shared"
)

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

func (o *Operation) NewOperation() *shared.Operation {
	var parameters []*shared.Parameter
	if o.Parameters != nil {
		for _, parameter := range o.Parameters {
			parameters = append(parameters, parameter.NewParameter())
		}
	}

	return &shared.Operation{
		Tags:        o.Tags,
		Summary:     o.Summary,
		Description: o.Description,
		OperationID: o.OperationID,
		Parameters:  parameters,
		RequestBody: o.RequestBody.NewRequestBody(),
		Responses:   o.Responses.NewResponses(),
	}
}

type Schema struct {
	Schema []byte    `json:"schema"`
	Ref    string    `json:"ref"`
	OneOf  []*Schema `json:"oneOf"`
}

// func (s *Schema) UnmarshalJSON(data []byte) error {
// 	if string(data) == "null" || string(data) == `""` {
// 		return nil
// 	}

// 	var schema *Schema

// 	if err := json.Unmarshal(data, &schema); err != nil {
// 		return err
// 	}

// 	*s = *schema
// 	return nil
// }

func (s *Schema) NewSchema() *shared.Schema {
	if s == nil {
		return nil
	}
	var oneOfs []*shared.Schema

	if s.OneOf != nil {
		for _, oneOf := range s.OneOf {
			oneOfs = append(oneOfs, oneOf.NewSchema())
		}
	}

	return &shared.Schema{
		Schema: s.Schema,
		Ref:    s.Ref,
		OneOf:  oneOfs,
	}
}

type MediaType struct {
	Name            string   `json:"name"`
	Schema          *Schema  `json:"schema"`
	SelectedExample string   `json:"selectedExample"`
	Examples        []string `json:"examples"`
}

func (mt *MediaType) NewMediaType() *shared.MediaType {
	return &shared.MediaType{
		Name:            mt.Name,
		Schema:          mt.Schema.NewSchema(),
		SelectedExample: mt.SelectedExample,
		Examples:        mt.Examples,
	}
}

type RequestBody struct {
	Description string       `json:"description"`
	Required    bool         `json:"required"`
	Content     []*MediaType `json:"content"`
}

func (r *RequestBody) NewRequestBody() *shared.RequestBody {
	mediaTypes := make(map[string]*shared.MediaType)
	if r.Content != nil {
		for _, mediaType := range r.Content {
			mediaTypes[mediaType.Name] = mediaType.NewMediaType()
		}
	}

	return &shared.RequestBody{
		Description: r.Description,
		Required:    r.Required,
		Content:     mediaTypes,
	}
}

type Header struct {
}

type ResponseCode struct {
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Headers     []*Header    `json:"headers"`
	Content     []*MediaType `json:"content"`
}

func (rc *ResponseCode) NewResponseCodes() *shared.ResponseCode {
	// var HeaderMap *shared.Header
	mediaTypes := make(map[string]*shared.MediaType)
	if rc.Content != nil {
		for _, mediaType := range rc.Content {
			mediaTypes[mediaType.Name] = mediaType.NewMediaType()
		}
	}

	return &shared.ResponseCode{
		Name:        rc.Name,
		Description: rc.Description,
		Headers:     nil,
		Content:     mediaTypes,
	}
}

type SecurityRequirement struct {
}

type Responses struct {
	Codes []*ResponseCode `json:"codes"`
}

func (r *Responses) NewResponses() *shared.Responses {
	codeMap := make(map[string]*shared.ResponseCode)
	if r.Codes != nil {
		for _, code := range r.Codes {
			codeMap[code.Name] = code.NewResponseCodes()
		}
	}

	return &shared.Responses{
		Codes: codeMap,
	}
}

type Parameter struct {
	Name            string     `json:"name"`
	In              *shared.In `json:"in"`
	Description     string     `json:"description"`
	Required        bool       `json:"required"`
	AllowEmptyValue bool       `json:"allowEmptyValue"`
	AllowReserverd  bool       `json:"allowReserverd"`
	Schema          *Schema    `json:"schema"`
}

func (p *Parameter) NewParameter() *shared.Parameter {
	return &shared.Parameter{
		Name:            p.Name,
		In:              *p.In,
		Description:     p.Description,
		Required:        p.Required,
		AllowEmptyValue: p.AllowEmptyValue,
		AllowReserverd:  p.AllowReserverd,
		Schema:          p.Schema.NewSchema(),
	}

}
