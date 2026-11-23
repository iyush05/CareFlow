using System.Net;
using CareFlow;

var checks = new (int Status, string Body, string? Error)[]
{
    (200, """{"choices":[{"finish_reason":"stop","message":{"content":"Follow your care team's instructions."}}]}""", null),
    (400, "private provider details", "rejected the request"),
    (401, "private provider details", "denied access"),
    (403, "private provider details", "denied access"),
    (404, "private provider details", "model or endpoint is unavailable"),
    (429, "private provider details", "quota or rate limit"),
    (503, "private provider details", "temporarily unavailable"),
    (200, """{"choices":[{"finish_reason":"length","message":{"content":"Partial instructions"}}]}""", "incomplete or blocked"),
    (200, """{"choices":[{"finish_reason":"content_filter","message":{"content":null}}]}""", "incomplete or blocked"),
    (200, """{"choices":[{"finish_reason":"stop","message":{"content":" "}}]}""", "no usable draft"),
    (200, """{"choices":[]}""", "no usable draft"),
    (200, """{"choices":[{"finish_reason":"stop","message":{"content":42}}]}""", "no usable draft"),
    (200, "{}", "no usable draft"),
    (200, "not json", "no usable draft")
};
foreach (var check in checks)
{
    using var response = new HttpResponseMessage((HttpStatusCode)check.Status) { Content = new StringContent(check.Body) };
    var result = await AiProviderResponse.ReadAsync(response);
    if (check.Error == null)
    {
        if (result.Error != null || result.Content != "Follow your care team's instructions.") throw new Exception("Valid draft rejected.");
    }
    else if (result.Content != null || result.Error?.Contains(check.Error) != true || result.Error.Contains("private provider details"))
        throw new Exception($"Unexpected handling for HTTP {check.Status}: {result}");
}
Console.WriteLine($"{checks.Length} AI response checks passed.");
