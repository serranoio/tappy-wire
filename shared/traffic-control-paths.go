package shared

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
	Operations  map[string]*Operation
}

func (p *PathItem) GetAllOperations() []*Operation {
	return []*Operation{p.Get, p.Put, p.Post, p.Delete, p.Patch, p.Options}
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

type Schema struct {
	Schema []byte    `json:"schema"`
	Ref    string    `json:"ref"`
	OneOf  []*Schema `json:"oneOf"`
}

func (s *Schema) IsSchemaPolymorphic() bool {
	if s.OneOf == nil || len(s.OneOf) == 0 {
		return false
	}
	return true

}

type MediaType struct {
	Name            string   `json:"name"`
	Schema          *Schema  `json:"schema"`
	Examples        []string `json:"examples"`
	SelectedExample string   `json:"selectedExample"`
}
type RequestBody struct {
	Description string                `json:"description"`
	Required    bool                  `json:"required"`
	Content     map[string]*MediaType `json:"content"`
}
type Header struct {
}

type ResponseCode struct {
	Name        string                `json:"name"`
	Description string                `json:"description"`
	Headers     map[string]*Header    `json:"headers"`
	Content     map[string]*MediaType `json:"content"`
}
type SecurityRequirement struct {
}

type Responses struct {
	Codes map[string]*ResponseCode `json:"codes"`
}
type Parameter struct {
	Name            string  `json:"name"`
	In              In      `json:"in"`
	Description     string  `json:"description"`
	Required        bool    `json:"required"`
	AllowEmptyValue bool    `json:"allowEmptyValue"`
	AllowReserverd  bool    `json:"allowReserverd"`
	Schema          *Schema `json:"schema"`
}
