package daemon

import (
	"net/http"
)

type TrafficControl string

const (
	proxy TrafficControl = "proxy"
)

func directTrafficToMockModeOverride(request *http.Request) bool {
	trafficControl := TrafficControl(request.Header.Get("Wiretap-Traffic-Control"))
	// if traffic control is not set, or if it is set to proxy, then it does not override anything
	if len(trafficControl) == 0 || trafficControl == proxy {
		return false
	}

	return true
}
