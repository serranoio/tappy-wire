package daemon

import (
	"net/http"
	"regexp"

	"github.com/gobwas/glob"
	v3 "github.com/pb33f/libopenapi/datamodel/high/v3"
	"github.com/pb33f/libopenapi/orderedmap"
	"github.com/pb33f/wiretap/shared"
)

type TrafficControl string

const (
	proxy TrafficControl = "proxy"
)

func getAllVariables(config *shared.WiretapConfiguration) []*shared.TrafficControlVariable {
	variables := []*shared.TrafficControlVariable{}

	for _, path := range config.TrafficControlRoutesOverride {
		for _, variable := range path.Variables {
			variables = append(variables, variable)
		}
	}

	return variables
}

func convertPathToGlob(path string) glob.Glob {
	re := regexp.MustCompile(`\{[^}]*\}`)

	path = re.ReplaceAllString(path, "*")

	return glob.MustCompile(path)
}

func insertMockHeaders(path *shared.TrafficControlPath, request *http.Request) {
	if len(request.Header.Get(shared.WiretapTrafficControlHeader)) == 0 {
		request.Header.Set(shared.WiretapTrafficControlHeader, path.MockType)
	}

	if len(request.Header.Get("Preferred")) == 0 {
		request.Header.Set("Preferred", path.MockType)
	}

}

func requestPathHasMockModeSet(config *shared.WiretapConfiguration, request *http.Request) bool {
	for _, path := range config.TrafficControlRoutesOverride {
		globbedPath := convertPathToGlob(path.Path.Key())

		if globbedPath.Match(request.URL.Path) && path.MockMode {
			insertMockHeaders(path, request)
			return true
		}
	}
	return false
}

func directTrafficToMockModeOverride(config *shared.WiretapConfiguration, request *http.Request) bool {
	if requestPathHasMockModeSet(config, request) {
		return true
	}

	trafficControl := TrafficControl(request.Header.Get(shared.WiretapTrafficControlHeader))

	// if traffic control is not set, or if it is set to proxy, then it does not override anything
	if len(trafficControl) == 0 || trafficControl == proxy {
		return false
	}

	return true
}

func matchRequestedPathAgainstSchema(compiledRequestPath glob.Glob, pathItems *orderedmap.Map[string, *v3.PathItem], variable *shared.Variable) (*v3.Operation, bool) {
	for pathItem := pathItems.First(); pathItem != nil; pathItem = pathItem.Next() {
		if compiledRequestPath.Match(pathItem.Key()) {
			id := (*variable.LevelID)[1:]
			if id == pathItem.Value().Get.OperationId {
				return pathItem.Value().Get, true

			} else if id == pathItem.Value().Put.OperationId {
				return pathItem.Value().Put, true

			} else if id == pathItem.Value().Post.OperationId {
				return pathItem.Value().Post, true

			} else if id == pathItem.Value().Delete.OperationId {
				return pathItem.Value().Delete, true

			} else if id == pathItem.Value().Patch.OperationId {
				return pathItem.Value().Patch, true

			} else if id == pathItem.Value().Options.OperationId {
				return pathItem.Value().Options, true
			}
			// random request now fits this, but is it also
			// extract the
		}

	}

	return nil, false
}
