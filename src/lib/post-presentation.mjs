export function textPalette(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;
  const hue = (hash % 360) / 60;
  const secondary = 96 * (1 - Math.abs(hue % 2 - 1));
  const channels = [[96, secondary, 0], [secondary, 96, 0], [0, 96, secondary],
    [0, secondary, 96], [secondary, 0, 96], [96, 0, secondary]][Math.floor(hue)]
    .map(channel => Math.round(144 + channel));
  const rgb = channels.join(", ");
  const lightRgb = channels.map(channel => Math.round(channel * 0.36)).join(", ");
  return {
    color: `rgb(${rgb})`,
    lightColor: `rgb(${lightRgb})`,
    lightBackground: `rgba(${lightRgb}, 0.08)`,
    lightHover: `rgba(${lightRgb}, 0.13)`,
    lightBorder: `rgba(${lightRgb}, 0.24)`,
    badge: `rgba(${rgb}, 0.14)`,
    background: `rgba(${rgb}, 0.11)`,
    hover: `rgba(${rgb}, 0.16)`,
    border: `rgba(${rgb}, 0.28)`,
  };
}

export function compactPreview(value) {
  const text = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(text), item => item.segment);
  return characters.length > 30 ? characters.slice(0, 29).join("") + "…" : text;
}
