using System.Text;
using UglyToad.PdfPig;

namespace XlentMatch.Api.Services;

public class PdfTextExtractor : IPdfTextExtractor
{
    public string Extract(Stream pdfStream)
    {
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
