using Contracts;
using External;
using MyApp.Models;
using RepoAlias = MyApp.Orders.OrderRepository;

namespace MyApp.Orders;

public class OrderService : IOrderConsumer
{
    private readonly RepoAlias _repository = new RepoAlias();

    public Result<DuplicateModel> Create(SharedContract contract)
    {
        // DuplicateModel DuplicateModel ExternalThing should not change edges.
        var ignored = "DuplicateModel ExternalThing";
        var model = new DuplicateModel();
        _repository.Save(model);
        return Result<DuplicateModel>.Ok(model);
    }
}
