package daemon

import (
	"fmt"
	"net/http"
)

type TrafficControl string

const (
	proxy TrafficControl = "proxy"
	refs                 = '$'
)

func directTrafficToMockModeOverride(trafficControl TrafficControl) bool {
	if len(trafficControl) == 0 {
		return true
	}

	if trafficControl[0] == refs {
		return true
	}

	return false
}

func (ws *WiretapService) handleTrafficControl(request *http.Request) TrafficControl {
	trafficControl := TrafficControl(request.Header.Get("Wiretap-Traffic-Control"))
	if len(trafficControl) == 0 {
		return trafficControl
	}

	if trafficControl == "proxy" {
		fmt.Println("proxying endpoint")
	} else if trafficControl[0] == refs {
		fmt.Println("choosing a certain variable")
	} else {
		ws.config.Logger.Error("Incorrectly set traffic control, not rerouting your endpoint to anywhere")
	}

	return trafficControl

}
