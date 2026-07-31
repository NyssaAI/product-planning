package dep

import "net/http"

func Register() {
	http.HandleFunc("/vendored", handler)
}

func handler(w http.ResponseWriter, r *http.Request) {
}
