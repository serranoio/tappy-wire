package daemon

import (
	"net/http"
	"strings"
	"testing"

	"github.com/pb33f/libopenapi"
	"github.com/pb33f/wiretap/shared"
	"github.com/stretchr/testify/assert"
)

func TestConvertPathToGlob(t *testing.T) {

	path := convertPathToGlob("/saloon/{ranger}")

	assert.True(t, path.Match(`/saloon/asodfijpasdpfoahsefouhjwpfhwpfojh`))
	assert.True(t, path.Match(`/saloon/ball`))
	assert.True(t, path.Match(`/saloon/sack`))

}

var openapiDoc = `
openapi: 3.0.0
info:
  title: Cowboy API
  description: A rugged API for all things cowboy.
  version: 1.0.0
  contact:
    name: The Cowboy Team
    email: cowboy@example.com
    url: https://cowboyapi.com
paths:
  /cowboys/{id}/are-awesome/{second-id}/last:
    get:
      summary: Get a cowboy's details
      description: Fetch the details of a specific cowboy, including his trusty steed, weapons, and more.
      operationId: getCowboy
      parameters:
        - name: id
          in: path
          description: The ID of the cowboy.
          required: true
          schema:
            type: integer
            example: 101
      responses:
        '200':
          description: A cowboy's profile
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                    description: The cowboy's unique ID
                    example: 101
                  name:
                    type: string
                    description: The cowboy's name
                    example: "Tex McGraw"
                  age:
                    type: integer
                    description: The cowboy's age
                    example: 34
                  occupation:
                    type: string
                    description: The cowboy's occupation
                    example: "Cowboy"
                  horse:
                    type: object
                    properties:
                      name:
                        type: string
                        description: The horse's name
                        example: "Thunder"
                      breed:
                        type: string
                        description: The breed of the horse
                        example: "Mustang"
                      color:
                        type: string
                        description: The color of the horse
                        example: "Chestnut"
                  weapons:
                    type: array
                    items:
                      type: object
                      properties:
                        type:
                          type: string
                          description: The type of weapon
                          example: "Revolver"
                        brand:
                          type: string
                          description: The weapon's brand (if applicable)
                          example: "Colt"
                        caliber:
                          type: string
                          description: The weapon's caliber (if applicable)
                          example: "0.45"
                        condition:
                          type: string
                          description: The condition of the weapon (if applicable)
                          example: "Well-maintained"
                        material:
                          type: string
                          description: The material of the weapon (if applicable)
                          example: "Rope"
                        length:
                          type: string
                          description: The length of the weapon (if applicable)
                          example: "30 feet"
                  home:
                    type: object
                    properties:
                      town:
                        type: string
                        description: The cowboy's hometown
                        example: "Dodge City"
                      state:
                        type: string
                        description: The state the cowboy resides in
                        example: "Kansas"
                      country:
                        type: string
                        description: The country the cowboy resides in
                        example: "USA"
                  favoriteDrink:
                    type: string
                    description: The cowboy's favorite drink
                    example: "Whiskey"
                  quote:
                    type: string
                    description: A famous quote from the cowboy
                    example: "This town ain't big enough for the both of us."
        '404':
          description: Cowboy not found
        '500':
          description: Internal server error

`

var jsonString = `{
		"id": 101,
		"name": "Tex McGraw",
		"age": 34,
		"occupation": "Cowboy",
		"horse": {
			"name": "Thunder",
			"breed": "Mustang",
			"color": "Chestnut"
		},
		"weapons": [
			{
				"type": "Revolver",
				"brand": "Colt",
				"caliber": "0.45",
				"condition": "Well-maintained"
			},
			{
				"type": "Lasso",
				"material": "Rope",
				"length": "30 feet"
			}
		],
		"home": {
			"town": "Dodge City",
			"state": "Kansas",
			"country": "USA"
		},
		"favoriteDrink": "Whiskey",
		"quote": "This town ain't big enough for the both of us."
	}
	`

// 2 cases

// case 1:

// I am setting a variable. Injecting into variable
// value is already in variable if it doesn't have '.' or ${}
// inject . into variable
// inject ${} into variable

// case 2:

// variable gets injected into mock.
// name of variable .id = variable value

// .id = variable

// id = .id
// id = ${0}
// id = 1234

func TestInjectAndSetMockVariables(t *testing.T) {
	d, _ := libopenapi.NewDocument([]byte(openapiDoc))

	compiled, _ := d.BuildV3Model()

	path := compiled.Model.Paths.PathItems.First()

	const testValue = "69lol"
	const secondParam = "OOGA_BOOGA"

	request, _ := http.NewRequest(http.MethodGet, "/cowboys/"+testValue+"/are-awesome/"+secondParam+"/last", nil)
	variable := &shared.TrafficControlVariable{
		Name:  "id",
		Value: "${0}",
		Id:    "oasdijoaisjf",
	}

	variable4 := &shared.TrafficControlVariable{
		Name:  "variable4",
		Value: "${1}",
		Id:    "oasdijoaisjf",
	}

	variable2 := &shared.TrafficControlVariable{
		Name:  "name",
		Value: ".name",
		Id:    "oasdijoaisjf",
	}

	variable3 := &shared.TrafficControlVariable{
		Name:  "hi",
		Value: "hello",
		Id:    "oasdijoaisjf",
	}
	rbVariable := &shared.TrafficControlVariable{
		Name:  ".id",
		Value: "id",
		Id:    "oasdijoaisjf",
	}
	rbVariable2 := &shared.TrafficControlVariable{
		Name:  ".horse.name",
		Value: "name",
		Id:    "oasdijoaisjf",
	}
	rbVariable3 := &shared.TrafficControlVariable{
		Name:  ".horse.breed",
		Value: "hi",
		Id:    "oasdijoaisjf",
	}
	rbVariable4 := &shared.TrafficControlVariable{
		Name:  ".horse.color",
		Value: "variable4",
		Id:    "oasdijoaisjf",
	}

	config := &shared.WiretapConfiguration{
		TrafficControlRoutesOverride: []*shared.TrafficControlPath{
			&shared.TrafficControlPath{
				Path:                 path,
				Variables:            []*shared.TrafficControlVariable{variable, variable2, variable3, variable4},
				RequestBodyVariables: []*shared.TrafficControlVariable{rbVariable, rbVariable2, rbVariable3, rbVariable4},
			},
			// &shared.TrafficControlPath{
			// 	RequestBodyVariables: []*shared.TrafficControlVariable{rbVariable},
			// },
		},
	}

	newMock, _ := injectAndSetMockVariables(request, config, []byte(jsonString))
	assert.True(t, strings.Contains(string(newMock), testValue))
	// the horse should have the owners name, lol
	assert.True(t, strings.Contains(string(newMock), testValue))
	// inserting regular text into .horse.breed
	assert.True(t, strings.Contains(string(newMock), "hello"))

	assert.True(t, strings.Contains(string(newMock), secondParam))
}

func TestMapVariablesIntoRBVariables(t *testing.T) {
	variable := &shared.TrafficControlVariable{
		Name:  "variable",
		Value: "${0}",
		Id:    "oasdijoaisjf",
	}
	rbVariable := &shared.TrafficControlVariable{
		Name:  ".id",
		Value: "variable",
		Id:    "oasdijoaisjf",
	}

	path := &shared.TrafficControlPath{
		RequestBodyVariables: []*shared.TrafficControlVariable{rbVariable},
	}

	mapVariablesIntoRBVariables(variable, path)

	assert.Equal(t, rbVariable.Value, "${0}")

}

func TestInjectParamsIntoVariable(t *testing.T) {
	request, _ := http.NewRequest(http.MethodGet, "/welcome-to-the-/rodeo/mother-fucker/{id-2}/so", nil)
	variable := &shared.TrafficControlVariable{
		Name:  "",
		Value: "${0}",
		Id:    "oasdijoaisjf",
	}

	injectParamsIntoVariable(request, "/welcome-to-the-/{id}/mother-fucker/{id-2}/so", variable)

	assert.Equal(t, variable.Value, "rodeo")

}

func TestInjectMockIntoVariable(t *testing.T) {
	variable := &shared.TrafficControlVariable{
		Name:  "id",
		Value: ".id",
		Id:    "oasdijoaisjf",
	}

	err := injectMockValueIntoVariable(variable, []byte(jsonString))

	assert.Nil(t, err)
	assert.Equal(t, variable.Value.(string), "101")
}

func TestInjectVariableValueIntoMock(t *testing.T) {
	const value = "VALUEEE"
	variable := &shared.TrafficControlVariable{
		Name:  "id",
		Value: value,
		Id:    "oasdijoaisjf",
	}

	newMock, err := injectVariableValueIntoMock(variable, []byte(jsonString))

	assert.Nil(t, err)
	assert.True(t, strings.Contains(string(newMock), value))
}

func TestVariables(t *testing.T) {

	variable := &shared.Variable{
		ID:        "$updatePetWithForm.query.name",
		LevelID:   "$findPetsByStatus",
		IO:        "input",
		Code:      "200",
		MediaType: "application/json",
		Property:  "query.name",
		ReceiverVariables: []*shared.Variable{
			&shared.Variable{
				Code:      "200",
				ID:        "$findPetsByStatus.items.properties.id",
				IO:        "output",
				LevelID:   "findPetsByStatus",
				MediaType: "application/json",
				Property:  "items.properties.id",
			},
		},
	}

}

func TestMatchPath() {

	// Anchor 1 setup
	anchor1 := &shared.Anchor{
		ID:              "anchor1",
		ReferenceType:   shared.ResponseBody,
		Expression:      "$properties.testProperty",
		ExpressionValue: []byte(`"newValue"`),
		ReceiverPipes:   []string{"pipe1"},
	}

	// Anchor 2 setup
	anchor2 := &shared.Anchor{
		ID:              "anchor2",
		ReferenceType:   shared.Parameter,
		Expression:      "$properties.paramProperty",
		ExpressionValue: []byte(`"anotherValue"`),
		ReceiverPipes:   []string{"pipe2"},
	}

	// Pipe 1 setup for anchor1
	pipe1 := &shared.Pipe{
		ID:      "pipe1",
		Input:   anchor1,
		Outputs: []*shared.Anchor{anchor2},
	}

	// Pipe 2 setup for anchor2
	pipe2 := &shared.Pipe{
		ID:      "pipe2",
		Input:   anchor2,
		Outputs: []*shared.Anchor{anchor1},
	}

	// Mockboard setup
	mockboard := &shared.Mockboard{
		WorkflowMetadata: make(map[string]*shared.WorkflowMetadata),
		DocModel:         nil, // You can set this to any document model if needed
	}

	// Fill the Mockboard with Pipes
	mockboard.WorkflowMetadata["workflow1"] = &shared.WorkflowMetadata{
		StepMetadatas: map[string]*shared.StepMetadata{},
		Pipes: map[string]*shared.Pipe{
			"pipe1": pipe1,
			"pipe2": pipe2,
		},
	}

	// Test mock (initial value)
	mock := []byte(`{
		"testProperty": "initialValue",
		"paramProperty": "initialParam"
	}`)

	// Initialize WiretapService
	service := &WiretapService{}

	// Call the handleStepResponse function
	resultMock, messages, errors := service.handleStepResponse([]*shared.Anchor{anchor1, anchor2}, mockboard, mock)

	// Assertions
	assert.Nil(t, errors)                                                     // Assert that there are no errors
	assert.NotNil(t, resultMock)                                              // Ensure the mock is updated
	assert.Contains(t, string(resultMock), `"testProperty": "newValue"`)      // Assert the mock was updated with the anchor expression values
	assert.Contains(t, string(resultMock), `"paramProperty": "anotherValue"`) // Assert the second anchor's expression value

	assert.Len(t, messages, 2)                                                                           // Assert that two messages were generated
	assert.Equal(t, "successfully inserted newValue at property testProperty", messages[0].message)      // Assert message content for anchor1
	assert.Equal(t, "successfully inserted anotherValue at property paramProperty", messages[1].message) // Assert message content for anchor2

}
