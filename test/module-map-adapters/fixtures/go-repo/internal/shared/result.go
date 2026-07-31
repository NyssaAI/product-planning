package shared

type Result struct {
	OK bool
}

type Validator interface {
	Validate() bool
}
