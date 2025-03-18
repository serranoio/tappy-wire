package shared

type MessageAnchor struct {
	ID    string      `json:"id,omitempty"`
	Value interface{} `json:"value,omitempty"`
}

// In a message, I want to say that an anchor has been populated
type Message struct {
	Message        string        `json:"message,omitempty"`
	ReceiverAnchor MessageAnchor `json:"receiverAnchor,omitempty"`
	SenderAnchor   MessageAnchor `json:"senderAnchor,omitempty"`
}
