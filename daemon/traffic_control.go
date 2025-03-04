package daemon

import (
	"net/http"
	"regexp"

	"github.com/gobwas/glob"
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
