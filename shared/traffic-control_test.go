package shared

import (
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMatchActivatedWorkflows(t *testing.T) {
	// Create mock data

	workflow1 := &WorkflowMetadata{
		WorkflowID:   "workflow-1",
		IsActivated:  true,
		WorkflowName: "Test Workflow 1",
	}

	workflow2 := &WorkflowMetadata{
		WorkflowID:   "workflow-2",
		IsActivated:  false,
		WorkflowName: "Test Workflow 2",
	}

	workflow3 := &WorkflowMetadata{
		WorkflowID:   "workflow-3",
		IsActivated:  true,
		WorkflowName: "Test Workflow 3",
	}

	// Create Mockboard instance with mock data
	mb := &Mockboard{
		WorkflowMetadata: map[string]*WorkflowMetadata{
			"workflow-1": workflow1,
			"workflow-2": workflow2,
			"workflow-3": workflow3,
		},
	}

	activatedWorkflows := mb.GetActivatedWorkflows()

	// Assert that we have exactly two activated workflows
	assert.Equal(t, 2, len(activatedWorkflows), "The number of activated workflows should be 2")

	// Assert that the activated workflows are the ones with IsActivated = true
	assert.Equal(t, "workflow-1", activatedWorkflows[0].WorkflowID, "The first activated workflow should be workflow-1")
	assert.Equal(t, "workflow-3", activatedWorkflows[1].WorkflowID, "The second activated workflow should be workflow-3")

}

// Helper function to simulate HTTP request paths
func newRequest(path string) *http.Request {
	req, err := http.NewRequest("GET", path, nil)
	if err != nil {
		panic(err)
	}
	return req
}

// Test for matchRequestedPath
func TestMatchRequestedPath(t *testing.T) {

	anchor1 := &Anchor{
		ID:         "anchor-1",
		StepID:     "1",
		Expression: "$query.id",
		PathName:   "/users/{id}",
	}

	anchor2 := &Anchor{
		ID:         "anchor-2",
		StepID:     "1",
		Expression: "$query.name",
		PathName:   "/users/{name}",
	}
	// Create a sample StepMetadata with a PathName containing a pattern
	stepMetadata := &StepMetadata{
		ID:          "1",
		Description: "Test step",
		StepName:    "Step 1",
		OperationID: "op1",
		Position:    Position{},
		PathName:    "/users/{id}",
	}

	// Create a WorkflowMetadata with this step
	workflowMetadata := &WorkflowMetadata{
		StepMetadatas: map[string]*StepMetadata{
			"step-1": stepMetadata,
		},
		Pipes: map[string]*Pipe{
			"pipes": &Pipe{
				Input:   anchor1,
				Outputs: []*Anchor{anchor2},
			},
		},
	}

	// Test a matching path
	reqPath1 := "/users/123"  // This should match
	reqPath2 := "/users/xyz"  // This should match
	reqPath3 := "/orders/123" // This should NOT match

	// Create HTTP requests
	req1 := newRequest(reqPath1)
	req2 := newRequest(reqPath2)
	req3 := newRequest(reqPath3)

	// Use matchRequestedPath to match the requested paths
	step1, anchors1, matched1 := workflowMetadata.MatchRequestedPath(req1.URL.Path)
	step2, anchors2, matched2 := workflowMetadata.MatchRequestedPath(req2.URL.Path)
	step3, anchors3, matched3 := workflowMetadata.MatchRequestedPath(req3.URL.Path)

	// Assertions for matching paths
	assert.True(t, matched1, "Path %s should match", reqPath1)
	assert.True(t, len(anchors1) == 2)
	assert.Equal(t, "Step 1", step1.StepName, "Step should match for path %s", reqPath1)

	assert.True(t, matched2, "Path %s should match", reqPath2)
	assert.True(t, len(anchors2) == 2)

	assert.False(t, matched3, "Path %s should NOT match", reqPath3)
	assert.True(t, len(anchors3) == 2)
	assert.Equal(t, "Step 1", step2.StepName, "Step should match for path %s", reqPath2)
	assert.Nil(t, step3, "Step should be nil for path %s", reqPath3)
}

// Test for extractVariableFromPath
// ! variable should always exist in the path
func TestExtractVariableFromPath(t *testing.T) {
	stepMetadata := &StepMetadata{
		PathName: "/users/{id}/hello/ok",
	}

	req, err := http.NewRequest("GET", "/users/123/hello/ok", nil)
	assert.NoError(t, err, "Error creating request")

	// Create ParameterProperty instance
	paramProperty := &ParameterProperty{
		Property: "id",
	}

	// Call extractVariableFromPath method
	variable, err := paramProperty.extractVariableFromPath(req, stepMetadata.PathName)

	// Assertions
	assert.NoError(t, err, "Expected no error")
	assert.Equal(t, "123", variable.(string))
}
func TestExtractVariableFromPathSameName(t *testing.T) {
	stepMetadata := &StepMetadata{
		PathName: "/users/{id}/hello/ok/{id}",
	}

	req, err := http.NewRequest("GET", "/users/123/hello/ok/39888", nil)
	assert.NoError(t, err, "Error creating request")

	// Create ParameterProperty instance
	paramProperty := &ParameterProperty{
		Property: "id",
	}

	// Call extractVariableFromPath method
	variable, err := paramProperty.extractVariableFromPath(req, stepMetadata.PathName)

	// Assertions
	assert.Error(t, err, "More than one variable 'id' is set in the path, using first one")
	assert.Equal(t, "123", variable.(string))
}

// & I love AI
func TestExtractVariableFromQuery(t *testing.T) {
	// Test case 1: When the query parameter is present in the request
	t.Run("WithQueryParam", func(t *testing.T) {
		// Create a new HTTP request with query parameters
		req, err := http.NewRequest("GET", "http://localhost:8080/?name=John&age=30", nil)
		assert.NoError(t, err, "Error creating request")

		// Create a ParameterProperty instance for the 'name' query parameter
		paramProperty := &ParameterProperty{
			Property: "name",
		}

		// Call the function that extracts the query parameter
		result, err := paramProperty.extractVariableFromQuery(req)

		// Assert that no error occurred and the result is the expected query value
		assert.NoError(t, err, "Expected no error extracting query parameter")
		assert.Equal(t, []string{"John"}, result, "Expected query parameter 'name' to have value 'John'")
	})

	// Test case 2: When the query parameter is not present in the request
	t.Run("NoQueryParam", func(t *testing.T) {
		// Create a new HTTP request without the 'name' query parameter
		req, err := http.NewRequest("GET", "http://localhost:8080/?age=30", nil)
		assert.NoError(t, err, "Error creating request")

		// Create a ParameterProperty instance for the 'name' query parameter
		paramProperty := &ParameterProperty{
			Property: "name",
		}

		// Call the function that extracts the query parameter
		result, err := paramProperty.extractVariableFromQuery(req)

		// Assert that an error occurred and no result is returned
		assert.Error(t, err, "Expected error when query parameter 'name' is missing")
		assert.Nil(t, result, "Expected no result for missing query parameter")
	})
}

func TestExtractVariableFromHeader(t *testing.T) {
	// Test case 1: When the header is present in the request
	t.Run("WithHeader", func(t *testing.T) {
		// Create a new HTTP request with custom headers
		req, err := http.NewRequest("GET", "http://localhost:8080/", nil)
		assert.NoError(t, err, "Error creating request")

		// Add headers to the request
		req.Header.Add("X-Auth-Token", "123456")
		req.Header.Add("Content-Type", "application/json")

		// Create a ParameterProperty instance for the 'X-Auth-Token' header
		paramProperty := &ParameterProperty{
			Property: "X-Auth-Token",
		}

		// Call the function that extracts the header
		result, err := paramProperty.extractVariableFromHeader(req)

		// Assert that no error occurred and the result is the expected header value
		assert.NoError(t, err, "Expected no error extracting header")
		assert.Equal(t, []string{"123456"}, result, "Expected header 'X-Auth-Token' to have value '123456'")
	})

	// Test case 2: When the header is not present in the request
	t.Run("NoHeader", func(t *testing.T) {
		// Create a new HTTP request without the 'X-Auth-Token' header
		req, err := http.NewRequest("GET", "http://localhost:8080/", nil)
		assert.NoError(t, err, "Error creating request")

		// Create a ParameterProperty instance for the 'X-Auth-Token' header
		paramProperty := &ParameterProperty{
			Property: "X-Auth-Token",
		}

		// Call the function that extracts the header
		result, err := paramProperty.extractVariableFromHeader(req)

		// Assert that an error occurred and no result is returned
		assert.Error(t, err, "Expected error when header 'X-Auth-Token' is missing")
		assert.Nil(t, result, "Expected no result for missing header")
	})
}

// Unit test
func TestPopulateAnchor(t *testing.T) {

	// Test case 1: QUERY type
	t.Run("QUERY", func(t *testing.T) {

		req, err := http.NewRequest("GET", "http://localhost:8080/?id=123&name=John", nil)
		assert.NoError(t, err)

		paramProperty := &ParameterProperty{
			Type:     QUERY,
			Property: "id",
		}

		variable, msg, err := paramProperty.PopulateAnchor(req, "", nil)

		assert.NoError(t, err)
		assert.Equal(t, []string{"123"}, variable)
		assert.Equal(t, "Successfully extracted $query.id=[123]", msg.message)
	})

	// Test case 2: PATH type
	t.Run("PATH", func(t *testing.T) {
		req, err := http.NewRequest("GET", "http://localhost:8080/users/123/hello", nil)
		assert.NoError(t, err)

		paramProperty := &ParameterProperty{
			Type:     PATH,
			Property: "id",
		}

		variable, msg, err := paramProperty.PopulateAnchor(req, "users/{id}/hello", nil)

		assert.NoError(t, err)
		assert.Equal(t, "123", variable) // In this mock, we are returning a hardcoded path variable
		assert.Equal(t, "Successfully extracted $path.id=123", msg.message)
	})

	// Test case 3: HEADER type
	t.Run("HEADER", func(t *testing.T) {
		req, err := http.NewRequest("GET", "http://localhost:8080/", nil)
		assert.NoError(t, err)
		req.Header.Add("X-Auth-Token", "123456")

		paramProperty := &ParameterProperty{
			Type:     HEADER,
			Property: "X-Auth-Token",
		}

		variable, msg, err := paramProperty.PopulateAnchor(req, "", nil)

		assert.NoError(t, err)
		assert.Equal(t, []string{"123456"}, variable)
		assert.Equal(t, "Successfully extracted $header.X-Auth-Token=[123456]", msg.message)
	})

	// Test case 4: COOKIE type (which should return an error)
	t.Run("COOKIE", func(t *testing.T) {
		req, err := http.NewRequest("GET", "http://localhost:8080/", nil)
		assert.NoError(t, err)

		paramProperty := &ParameterProperty{
			Type:     COOKIE,
			Property: "session_id",
		}

		variable, msg, err := paramProperty.PopulateAnchor(req, "", nil)

		assert.Error(t, err)
		assert.Nil(t, variable)
		assert.Nil(t, msg)
		assert.Equal(t, "I have no idea how you fucking got here lmao.", err.Error())
	})
}

// Test for formFunctionCall
func TestFormFunctionCall(t *testing.T) {
	// Prepare mock data for the anchor
	anchor := &Anchor{
		Expression: "$query.name.map((val) => val + $query.path)",
	}

	// the order here should not matter, as long as they are in unison
	anchorReferences := []AnchorReference{
		{ID: "1", Property: "$query.name"},
		{ID: "3", Property: "$query.path"},
	}

	values := []interface{}{"[1, 2, 3]", "5"}

	// Call formFunctionCall to get the JavaScript code
	result := anchor.formFunctionCall(anchorReferences, values)

	// Expected JavaScript result after function call
	expect := `
	const var0 = JSON.parse('[1, 2, 3]');
	const var1 = JSON.parse('5');

	const run = () => {


		return JSON.stringify(var0.map((val) => val + var1));
	}

	`

	assert.Equal(t, result, expect)
}

// Test for formFunctionCall
func TestExecuteJS(t *testing.T) {
	// Prepare mock data for the anchor
	anchor := &Anchor{
		Expression: "$query.name.map((val) => val + $query.path)",
	}

	// the order here should not matter, as long as they are in unison
	anchorReferences := []AnchorReference{
		{ID: "1", Property: "$query.name"},
		{ID: "3", Property: "$query.path"},
	}

	values := []interface{}{"[1, 2, 3]", "5"}

	// Call formFunctionCall to get the JavaScript code
	_, err := anchor.executeJS(anchorReferences, values)
	assert.Equal(t, err, nil)
	assert.Equal(t, anchor.ExpressionValue, "[6,7,8]")

	anchor = &Anchor{
		Expression: "$query.name.map((val) => { val.first = val.first + $query.path; return val })",
	}

	// the order here should not matter, as long as they are in unison
	anchorReferences = []AnchorReference{
		{ID: "1", Property: "$query.name"},
		{ID: "3", Property: "$query.path"},
	}

	values = []interface{}{`[{"first": 1}, {"first": 2}, {"first": 3}]`, "5"}

	// Call formFunctionCall to get the JavaScript code

	_, err = anchor.executeJS(anchorReferences, values)

	assert.Equal(t, err, nil)
	assert.Equal(t, "[{\"first\":6},{\"first\":7},{\"first\":8}]", anchor.ExpressionValue)
}

// Test case for InjectAnchorValueIntoMock
func TestInjectAnchorValueIntoMock(t *testing.T) {
	// Create a mock Anchor with ExpressionValue
	anchor := &Anchor{
		Expression: "myExpression",
		RequestBodyProperty: &RequestBodyProperty{
			Property: "$properties.testProperty",
		},
		ExpressionValue: []byte(`"new_value"`), // The value to insert into the mock
		StepID:          "step1",
	}

	// Create mock JSON data
	mock := []byte(`{
		"testProperty": "old_value"
	}`)

	// Call InjectAnchorValueIntoMock
	updatedMock, _, err := anchor.InjectAnchorValueIntoMock(mock)

	assert.Equal(t, nil, err)

	assert.True(t, strings.Contains(string(updatedMock), `"testProperty": "new_value"`))
}
