package trafficControl

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"os"
	"path"
	"strings"

	"github.com/pb33f/wiretap/shared"
	"github.com/speakeasy-api/openapi/arazzo"
)

// let's setup mockboard metadata
// arazzo
const dir = "traffic-control-config"

const main = "main.json"
const spec = "arazzo-spec.yaml"

func setupMockboard() (*shared.Mockboard, error) {
	// when we boot this thing up,
	// I want to get the config
	// define config in the config file

	mockboard := &shared.Mockboard{}
	mainBytes, err := os.ReadFile(path.Join(dir, main))

	if err != nil {
		// if there is nothing defined, let's create it
		if strings.Contains(err.Error(), "no such file or directory") {
			err := os.Mkdir(dir, 0755)
			// if err != nil {
			// 	return nil, err
			// }
			_, err = os.Create(path.Join(dir, main))
			if err != nil {
				return nil, err
			}

			_, err = os.Create(path.Join(dir, spec))
			if err != nil {
				return nil, err
			}

		} else {
			return nil, err
		}

		err = nil

		mockboard.WorkflowMetadata = make(map[string]*shared.WorkflowMetadata)
		// don't create data unless we have it
	} else {
		// if there is nothing in the file, return mockboard
		if len(mainBytes) == 0 {
			mockboard.WorkflowMetadata = make(map[string]*shared.WorkflowMetadata)
			return mockboard, nil
		}

		var wfm map[string]*shared.WorkflowMetadata
		// since there is a config, let's construct our data
		err := json.Unmarshal(mainBytes, &wfm)

		if err != nil {

			log.Printf("%s %v", err.Error(), err)
			return nil, err
		}

		mockboard.WorkflowMetadata = wfm

		// specBytes, err := os.ReadFile(path.Join(dir, spec))

		// // since there is a config, let's construct our data
		// var arazzoSpec *arazzo.Arazzo
		// err = yaml.Unmarshal(specBytes, arazzoSpec)

		// if err != nil {
		// 	return nil, err
		// }

		// if arazzoSpec == nil {
		// 	mockboard.Arazzo = &arazzo.Arazzo{}
		// } else {
		// 	mockboard.Arazzo = arazzoSpec
		// }

		// since there is a config, let's construct our data

		// specBytes, err := os.ReadFile(path.Join(dir, spec))

		// // since there is a config, let's construct our data
		// var arazzoSpec *arazzo.Arazzo
		// err = yaml.Unmarshal(specBytes, arazzoSpec)

		// if err != nil {
		// 	return nil, err
		// }

		// if arazzoSpec == nil {
		// 	mockboard.Arazzo = &arazzo.Arazzo{}
		// } else {
		// 	mockboard.Arazzo = arazzoSpec
		// }
	}

	return mockboard, err
}

func writeMockboard(mockboard *shared.Mockboard) error {
	mockboardBytes, err := json.Marshal(mockboard.WorkflowMetadata)

	if err != nil {
		return err
	}

	os.WriteFile(path.Join(dir, main), mockboardBytes, 0755)

	return nil
}

func writeArazzo(arazzo *arazzo.Arazzo) error {
	ctx := context.Background()
	buf := bytes.NewBuffer([]byte{})

	if err := arazzo.Marshal(ctx, buf); err != nil {
		panic(err)
	}

	os.WriteFile(path.Join(dir, spec), buf.Bytes(), 0755)

	return nil
}
