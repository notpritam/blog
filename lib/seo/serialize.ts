/** JSON.stringify a JSON-LD payload for embedding in a <script> tag, escaping `<` so `</script>` can't break out of it. */
export function serializeJsonLd(data: Record<string, unknown> | Record<string, unknown>[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
