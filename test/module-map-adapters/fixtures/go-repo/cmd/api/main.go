package main

import "net/http"

func main() {
	http.HandleFunc("GET /health", handler)
}

func handler(w http.ResponseWriter, r *http.Request) {
}
