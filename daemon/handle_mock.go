// Copyright 2023-2024 Princess Beef Heavy Industries, LLC / Dave Shanley
// https://pb33f.io
// SPDX-License-Identifier: AGPL

package daemon

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/pb33f/ranch/model"
	configModel "github.com/pb33f/wiretap/config"
	"github.com/pb33f/wiretap/shared"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

// find location of requested variable.
// get the first part of the string and second part

// sluggedPath =
func injectParamsIntoVariable(request *http.Request, sluggedPath string, variable *shared.TrafficControlVariable) error {
	money := regexp.MustCompile(`\$\{.*\}`)
	noMoney := regexp.MustCompile(`\{[^}]*\}`)
	allNumbers := regexp.MustCompile(`\d+`)

	// if the value is only a string, so it is what ${0}
	// v ${}
	if str, ok := variable.Value.(string); ok {

		s := money.FindString(str)
		// match found
		if len(s) > 0 {
			// getting location
			num, err := strconv.Atoi(allNumbers.FindString(s))
			if err != nil {
				return fmt.Errorf("please do not put strings in the array")
			}

			// getting all variables in the string
			// [{var}, {var2}]
			allSlugs := noMoney.FindAllString(sluggedPath, -1)
			for _, slug := range allSlugs {
				sluggedPath = strings.Replace(sluggedPath, slug, `(.*)`, 1)
			}

			pathInRegex := regexp.MustCompile(sluggedPath)

			allMatches := pathInRegex.FindStringSubmatch(request.URL.Path)

			variable.Value = allMatches[num+1]
		}
	}

	return nil
}

// can only inject . into variable
func injectMockValueIntoVariable(variable *shared.TrafficControlVariable, mockBytes []byte) error {
	// Declare a variable of type interface{}
	if v, ok := variable.Value.(string); ok {

		if len(variable.Name) > 0 && v[0] == '.' {
			result := gjson.Get(string(mockBytes), v[1:])

			if result.Exists() {
				variable.Value = result.Raw
				return nil
			}
			return fmt.Errorf("failed to inject mock variable")

		}
	}

	return nil
}

// change mock value from variable
func injectVariableValueIntoMock(variable *shared.TrafficControlVariable, mockBytes []byte) ([]byte, error) {
	if len(variable.Name) > 0 && variable.Name[0] != '.' {
		return nil, fmt.Errorf("did not provide a mockable field")
	}

	value, err := sjson.Set(string(mockBytes), variable.Name[1:], variable.Value)

	if err != nil {
		return nil, err
	}

	return []byte(value), nil
}

func mapVariablesIntoRBVariables(variable *shared.TrafficControlVariable, path *shared.TrafficControlPath) {
	for _, rbVariable := range path.RequestBodyVariables {
		// now we don't support strings, only variables
		if rbVariable.Value == variable.Name {
			rbVariable.Value = variable.Value
		}
	}

}

func injectAndSetMockVariables(request *http.Request, config *shared.WiretapConfiguration, mockBytes []byte) ([]byte, []error) {
	// we need to update the config, eventually, lol
	var errs []error

	// inject all variables
	for _, path := range config.TrafficControlRoutesOverride {
		for _, variable := range path.Variables {
			err := injectParamsIntoVariable(request, path.Path.Key(), variable)
			errs = append(errs, err)
			err = nil
			err = injectMockValueIntoVariable(variable, mockBytes)
			errs = append(errs, err)
			err = nil
		}
	}

	// map all variables first to every rbVariable

	// first, let's get all variables
	allVariables := []*shared.TrafficControlVariable{}
	for _, path := range config.TrafficControlRoutesOverride {
		for _, variable := range path.Variables {
			allVariables = append(allVariables, variable)
		}
	}

	// then we can map them into all rbVariables (preferrably change this to just this path)
	for _, path := range config.TrafficControlRoutesOverride {
		for _, variable := range allVariables {
			mapVariablesIntoRBVariables(variable, path)
		}
	}

	// end

	// inject variables into mock
	for _, path := range config.TrafficControlRoutesOverride {
		for _, variable := range path.RequestBodyVariables {
			newMockBytes, err := injectVariableValueIntoMock(variable, mockBytes)
			if err != nil {
				errs = append(errs, err)
			} else {
				mockBytes = newMockBytes
			}
		}
	}

	return mockBytes, nil
}

func (ws *WiretapService) handleMockRequest(
	request *model.Request, config *shared.WiretapConfiguration, newReq *http.Request) {

	// dip out early if we're in mock mode.
	delay := configModel.FindPathDelay(request.HttpRequest.URL.Path, config)
	if delay > 0 {
		time.Sleep(time.Duration(delay) * time.Millisecond) // simulate a slow response, configured for path.
	} else {
		if config.GlobalAPIDelay > 0 {
			time.Sleep(time.Duration(config.GlobalAPIDelay) * time.Millisecond) // simulate a slow response, all paths.
		}
	}

	// build a mock based on the request.
	mock, mockMetadata, mockErr := ws.mockEngine.GenerateResponse(request.HttpRequest)

	newMock, _ := injectAndSetMockVariables(request.HttpRequest, config, mock)
	mock = newMock

	// validate http request.
	ws.ValidateRequest(request, newReq)

	// sleep for a few ms, this prevents responses from being sent out of order.
	time.Sleep(5 * time.Millisecond)

	// wiretap needs to work from anywhere, so allow everything.
	headers := make(map[string][]string)
	shared.SetCORSHeaders(headers)
	headers["Content-Type"] = []string{"application/json"}

	buff := bytes.NewBuffer(mock)

	// create a simulated response to send up to the monitor UI.
	resp := &http.Response{
		StatusCode: mockMetadata.StatusCode,
		Body:       io.NopCloser(buff),
	}
	header := http.Header{}
	resp.Header = header
	// write headers
	for k, v := range headers {
		for _, j := range v {
			request.HttpResponseWriter.Header().Set(k, fmt.Sprint(j))
			header.Add(k, fmt.Sprint(v))
		}
	}

	for k, v := range mockMetadata.Headers {
		request.HttpResponseWriter.Header().Set(k, fmt.Sprint(v))
		header.Add(k, fmt.Sprint(v))
	}

	// if there was an error building the mock, return a 404
	if mockErr != nil && len(mock) == 0 {
		config.Logger.Error("[wiretap] mock mode request error", "url", newReq.URL.String(), "code", 404, "error", mockErr.Error())
		request.HttpResponseWriter.WriteHeader(404)
		wtError := shared.GenerateError("[mock error] unable to generate mock for request", 404, mockErr.Error(), "", mock)
		_, _ = request.HttpResponseWriter.Write(shared.MarshalError(wtError))

		// validate response async
		resp.StatusCode = mockMetadata.StatusCode
		go ws.broadcastResponse(request, resp)
		return
	}

	// if the mock exists, but there was an error, return the error
	if mockErr != nil && len(mock) > 0 {
		config.Logger.Warn("[wiretap] mock mode request problem", "url", newReq.URL.String(), "code", mockMetadata.StatusCode, "violation", mockErr.Error())
		request.HttpResponseWriter.WriteHeader(mockMetadata.StatusCode)
		wtError := shared.GenerateError("unable to serve mocked response", mockMetadata.StatusCode, mockErr.Error(), "", nil)
		_, _ = request.HttpResponseWriter.Write(shared.MarshalError(wtError))

		// validate response async
		resp.StatusCode = mockMetadata.StatusCode
		go ws.broadcastResponse(request, resp)
		return
	}

	// validate response async
	resp.StatusCode = mockMetadata.StatusCode
	go ws.broadcastResponse(request, resp)

	// if the mock is empty
	request.HttpResponseWriter.WriteHeader(mockMetadata.StatusCode)
	if mock == nil {
		return
	}

	_, errs := request.HttpResponseWriter.Write(mock)
	if errs != nil {
		panic(errs)
	}
}
