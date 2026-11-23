using System.Text.Json;

namespace CareFlow;

internal static class AiProviderResponse
{
    internal record Draft(string? Content, string? Error);

    internal static async Task<Draft> ReadAsync(HttpResponseMessage response)
    {
        // Do not expose provider response bodies: they may contain submitted text or secrets.
        if (!response.IsSuccessStatusCode)
        {
            var error = (int)response.StatusCode switch
            {
                400 => "AI provider rejected the request. Ask the administrator to check the API key, model, and request settings.",
                401 or 403 => "AI provider denied access. Ask the administrator to check the API key and project permissions.",
                404 => "The configured AI model or endpoint is unavailable. Ask the administrator to update the model in the server configuration and restart the app.",
                429 => "AI quota or rate limit reached. Try again later or check the project's quota in Google AI Studio. You can use the template option now.",
                >= 500 => "AI provider is temporarily unavailable. Try again later or use the template option.",
                _ => "AI provider could not generate a draft. Try the template option."
            };
            return new(null, error);
        }

        try
        {
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var choice = json.RootElement.GetProperty("choices")[0];
            if (choice.GetProperty("finish_reason").GetString() != "stop")
                return new(null, "AI returned an incomplete or blocked draft. Try again or use the template option.");
            var content = choice.GetProperty("message").GetProperty("content").GetString();
            if (!string.IsNullOrWhiteSpace(content)) return new(content, null);
        }
        catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException or IndexOutOfRangeException)
        {
            // A successful HTTP response is not necessarily a usable completion.
        }
        return new(null, "AI returned no usable draft. Try again or use the template option.");
    }
}
