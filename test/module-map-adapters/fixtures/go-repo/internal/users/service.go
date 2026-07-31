package users

import (
	"example.com/shop/internal/shared"
	"example.com/shop/pkg/util"
)

func Greet(u User, r shared.Result) string {
	return util.Title(u.Name)
}
