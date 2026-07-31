package orders

import "example.com/shop/internal/shared"

type Order struct {
	Result shared.Result
}

func NewOrder() Order {
	return Order{}
}
