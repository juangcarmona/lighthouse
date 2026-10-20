"use strict";

module.exports = {
  names: ["no-hard-wrapped-prose"],
  description: "Keep each logical prose paragraph on one source line",
  tags: ["style", "prose"],
  function: (params, onError) => {
    for (const token of params.tokens) {
      if (token.type !== "paragraph_open" || !Array.isArray(token.map)) {
        continue;
      }

      const [startLine, endLine] = token.map;
      if (endLine - startLine <= 1) {
        continue;
      }

      onError({
        lineNumber: startLine + 1,
        detail: "Keep this prose paragraph on one line; do not hard-wrap it at a fixed column.",
        context: (params.lines[startLine] ?? "").slice(0, 80),
      });
    }
  },
};
