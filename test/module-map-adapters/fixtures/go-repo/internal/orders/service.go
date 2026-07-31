package orders

import (
	"example.com/shop/internal/shared"
	"example.com/shop/internal/users"
	_ "example.com/shop/internal/util"
)

type Service struct {
	store shared.Result
}

func CreateOrder(s *Service, u users.User) shared.Result {
	return s.Create(u)
}

func (s *Service) Create(u users.User) shared.Result {
	return shared.Result{}
}
