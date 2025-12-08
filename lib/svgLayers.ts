// All layer IDs from palm-fronds-and-silhouettes.svg grouped by corner
export const CORNER_SUFFIXES = ["upper-left", "upper-right", "lower-left", "lower-right"] as const;

export type CornerSuffix = typeof CORNER_SUFFIXES[number];

/**
 * Extract all layer IDs from an SVG element and filter by corner suffix.
 * Only returns layer IDs that contain the exact corner suffix string in their name.
 */
export function getLayersForCorner(svgElement: SVGElement, corner: CornerSuffix): string[] {
  const allPaths = svgElement.querySelectorAll("path");
  const layers: string[] = [];

  allPaths.forEach((path) => {
    const id = path.getAttribute("id");
    if (id && id.includes(corner)) {
      layers.push(id);
    }
  });

  return layers;
}

/**
 * Get a random layer ID for a given corner from the SVG element.
 * Only selects from layers that have the corner suffix in their name.
 */
export function getRandomLayerForCorner(svgElement: SVGElement, corner: CornerSuffix): string | null {
  const layers = getLayersForCorner(svgElement, corner);
  if (layers.length === 0) {
    return null;
  }
  return layers[Math.floor(Math.random() * layers.length)];
}

// Randomly select n distinct corners
export function selectRandomCorners(n: 2 | 3): CornerSuffix[] {
  const shuffled = [...CORNER_SUFFIXES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n) as CornerSuffix[];
}
