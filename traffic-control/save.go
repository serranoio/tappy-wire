package trafficControl

import (
	"bytes"
	"context"
	"os"
	"path"
	"strings"

	"github.com/pb33f/wiretap/shared"
	"github.com/speakeasy-api/openapi/arazzo"
	"gopkg.in/yaml.v3"
)

// let's setup mockboard metadata
// arazzo
const dir = "traffic-control-config"

const main = "main.yaml"
const spec = "arazzo-spec.yaml"

func setupMockboard() (*shared.Mockboard, error) {
	// when we boot this thing up,
	// I want to get the config
	// define config in the config file

	// get everything from trafficControlConfig

	mockboard := &shared.Mockboard{}
	mainBytes, err := os.ReadFile(path.Join(dir, main))

	if err != nil {
		// if there is nothing defined, let's create it
		if strings.Contains(err.Error(), "no such file or directory") {
			err := os.Mkdir(dir, 0755)
			if err != nil {
				return nil, err
			}
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

		// don't create data unless we have it
	} else {
		// since there is a config, let's construct our data
		var wfm map[string]*shared.WorkflowMetadata
		err := yaml.Unmarshal(mainBytes, wfm)

		if err != nil {
			return nil, err
		}

		specBytes, err := os.ReadFile(path.Join(dir, spec))

		// since there is a config, let's construct our data
		var arazzoSpec *arazzo.Arazzo
		err = yaml.Unmarshal(specBytes, arazzoSpec)

		if err != nil {
			return nil, err
		}

		if arazzoSpec == nil {
			mockboard.Arazzo = &arazzo.Arazzo{}
		} else {
			mockboard.Arazzo = arazzoSpec
		}

		if wfm == nil {
			mockboard.WorkflowMetadata = make(map[string]*shared.WorkflowMetadata)
		} else {
			mockboard.WorkflowMetadata = wfm
		}

	}

	return mockboard, err
}

func writeMockboardMetadata(workflowMetadata []*shared.WorkflowMetadata) error {
	workflowMetadataBytes, err := yaml.Marshal(workflowMetadata)

	if err != nil {
		return err
	}

	os.WriteFile(path.Join(dir, main), workflowMetadataBytes, 0755)

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
