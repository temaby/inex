using inex.Services.Models.Records.Transaction;
using inex.Services.Validators.Transaction;

namespace inex.Services.Tests.Validators;

public class CorrectionValidationTests
{
    [Theory]
    [InlineData("increase")]
    [InlineData("decrease")]
    public void ValidCorrection_IsAccepted(string direction)
    {
        Assert.True(new CorrectionCreateValidator().Validate(Valid with { Direction = direction }).IsValid);
    }

    [Theory]
    [InlineData("0", "amount.must_be_positive")]
    [InlineData("-1", "amount.must_be_positive")]
    [InlineData("0.001", "amount.precision")]
    [InlineData("10000000000", "amount.out_of_range")]
    public void InvalidAmount_HasStableError(string amount, string error)
    {
        var result = new CorrectionCreateValidator().Validate(Valid with { Amount = decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture) });
        Assert.Contains(result.Errors, item => item.ErrorMessage == error);
    }

    [Fact]
    public void InvalidFields_HaveStableErrors()
    {
        var result = new CorrectionCreateValidator().Validate(new CreateCorrectionRequest { Comment = "   " });
        foreach (string error in new[] { "account_id.invalid", "created.required", "direction.invalid", "correction.reason_required" })
            Assert.Contains(result.Errors, item => item.ErrorMessage == error);
        Assert.Contains(new CorrectionCreateValidator().Validate(Valid with { Comment = new string('a', 256) }).Errors,
            item => item.ErrorMessage == "correction.reason_too_long");
    }

    private static CreateCorrectionRequest Valid => new()
    {
        AccountId = 1, Amount = 12.34m, Created = new DateTime(2026, 10, 22), Direction = "increase", Comment = "Balance adjustment #review"
    };
}
