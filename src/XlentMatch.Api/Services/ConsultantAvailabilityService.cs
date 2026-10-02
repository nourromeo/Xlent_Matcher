using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Services;

public sealed class ConsultantAvailabilityService(AppDbContext db)
{
    public async Task ResolveExpiredAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var expired = await db.Consultants
            .Where(consultant => consultant.Availability == ConsultantAvailability.Unavailable &&
                consultant.AvailableAgainDate.HasValue && consultant.AvailableAgainDate.Value <= today)
            .ToListAsync(ct);

        if (expired.Count == 0) return;

        foreach (var consultant in expired)
        {
            consultant.Availability = ConsultantAvailability.Available;
            consultant.AvailableAgainDate = null;
        }

        await db.SaveChangesAsync(ct);
    }
}
