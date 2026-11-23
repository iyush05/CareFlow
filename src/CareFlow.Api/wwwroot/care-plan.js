"use strict";

// Use the same sanitized Markdown for the on-screen plan and printed copy.
function renderCarePlan(content) {
  return DOMPurify.sanitize(marked.parse(String(content ?? ""), {
    gfm: true,
    breaks: true,
    async: false,
  }), {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "del", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "pre", "code", "hr", "a",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "title", "start"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
