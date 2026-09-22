using System.Text;
using UglyToad.PdfPig;
using XlentMatch.Api.Application;

namespace XlentMatch.Api.Infrastructure;

public class PdfTextExtractor : IPdfTextExtractor
{
    public string Extract(Stream pdfStream)
    {
        // PdfPig requires a seekable stream. Uploaded file streams are not always seekable.
        using var buffer = new MemoryStream();
        pdfStream.CopyTo(buffer);
        buffer.Position = 0;

        using var document = PdfDocument.Open(buffer);
        var sb = new StringBuilder();
        foreach (var page in document.GetPages())
            sb.AppendLine(page.Text);
        return sb.ToString();
    }
}
