using inex.Services.Models.Records.Transaction;
using inex.Services.Validators.Transaction;
namespace inex.Services.Tests.Services;

// Pure boundary-policy tests; persistence/lifecycle tests live in inex.Tests.
public class InternalTransferRequestServiceTests
{
    private static CreateLinkedInternalTransferRequest Valid => new() { AccountId = 1, LinkedUserId = 2,
        SubmissionKey = Guid.NewGuid().ToString("D"), Created = new DateTime(2026, 10, 16), Amount = 12.34m, Direction = "outgoing" };
    [Fact] public void ValidTermsAreAccepted() => Assert.True(new LinkedInternalTransferCreateValidator().Validate(Valid).IsValid);
    [Theory] [InlineData(0)] [InlineData(-1)] [InlineData(1.001)] [InlineData(10000000000)]
    public void InvalidAmountIsRejected(decimal amount) => Assert.False(new LinkedInternalTransferCreateValidator().Validate(Valid with { Amount = amount }).IsValid);
    [Theory] [InlineData("")] [InlineData("arbitrary")]
    public void SubmissionKeyMustBeCanonicalUuid(string key) => Assert.False(new LinkedInternalTransferCreateValidator().Validate(Valid with { SubmissionKey = key }).IsValid);
    [Fact] public void RequiredRecipientAndDirectionAreValidated()
    {
        var result = new LinkedInternalTransferCreateValidator().Validate(Valid with { LinkedUserId = 0, Direction = "unknown" });
        Assert.Contains(result.Errors, x => x.ErrorMessage == "linked_user.invalid");
        Assert.Contains(result.Errors, x => x.ErrorMessage == "direction.invalid");
    }
    [Fact] public void CommentLengthIsBounded() => Assert.False(new LinkedInternalTransferCreateValidator().Validate(Valid with { Comment = new string('a', 256) }).IsValid);
    [Fact] public void AcceptanceRequiresAccount() => Assert.False(new AcceptInternalTransferValidator().Validate(new AcceptInternalTransferRequest(0)).IsValid);
    [Fact] public void OperationDatesUseCanonicalMicrosecondPrecision()
    {
        var date = new DateTime(2026, 10, 16, 12, 0, 0, DateTimeKind.Utc).AddTicks(1234567);
        var canonical = inex.Services.Services.InternalTransferRequestPolicy.NormalizeOperationDate(date);
        Assert.Equal(date.Ticks - 7, canonical.Ticks);
        Assert.Equal(DateTimeKind.Utc, canonical.Kind);
        Assert.Equal(canonical, inex.Services.Services.InternalTransferRequestPolicy.NormalizeOperationDate(canonical));
    }

}
