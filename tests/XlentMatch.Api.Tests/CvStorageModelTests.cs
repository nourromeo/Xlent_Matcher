using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Tests;

public class CvStorageModelTests
{
    [Fact]
    public void CvUploadStoresOriginalFileMetadata()
    {
        var record = new CvUploadRecord
        {
            FileName = "consultant.pdf",
            FileSize = 1024,
            StorageKey = "generated-key.pdf",
            ContentType = "application/pdf",
            IsActive = true,
            ConsultantId = 7,
            Status = "Indexed"
        };

        Assert.Equal("generated-key.pdf", record.StorageKey);
        Assert.Equal("application/pdf", record.ContentType);
        Assert.True(record.IsActive);
        Assert.Equal(7, record.ConsultantId);
    }

    [Fact]
    public void ModelDefinesUniqueFilteredActiveCvIndex()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var db = new AppDbContext(options);
        var entity = db.Model.FindEntityType(typeof(CvUploadRecord));
        Assert.NotNull(entity);

        var index = entity!.GetIndexes().Single(x => x.GetDatabaseName() == "IX_CvUploads_OneActivePerConsultant");
        Assert.True(index.IsUnique);
        Assert.Equal("[IsActive] = 1 AND [ConsultantId] IS NOT NULL", index.GetFilter());
    }
}
