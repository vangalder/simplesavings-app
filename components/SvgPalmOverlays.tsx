"use client";

import { useState, useEffect } from "react";
import {
  CORNER_SUFFIXES,
  type CornerSuffix,
  selectRandomCorners,
  getRandomLayerForCorner,
} from "@/lib/svgLayers";

interface LayerSelection {
  corner: CornerSuffix;
  layerId: string;
}

interface PathData {
  id: string;
  d: string;
  className?: string;
  fill?: string;
  fillRule?: "inherit" | "evenodd" | "nonzero";
}

// Corner positioning styles
const CORNER_POSITIONS: Record<CornerSuffix, React.CSSProperties> = {
  "upper-left": {
    top: 0,
    left: 0,
    transform: "translate(-40%, -40%)",
  },
  "upper-right": {
    top: 0,
    right: 0,
    transform: "translate(40%, -40%)",
  },
  "lower-left": {
    bottom: 0,
    left: 0,
    transform: "translate(-40%, 40%)",
  },
  "lower-right": {
    bottom: 0,
    right: 0,
    transform: "translate(40%, 40%)",
  },
};

export default function SvgPalmOverlays() {
  const [paths, setPaths] = useState<PathData[]>([]);
  const [selections, setSelections] = useState<LayerSelection[]>([]);

  useEffect(() => {
    // Step 1: Randomly determine how many images (2 or 3)
    const n: 2 | 3 = Math.random() < 0.5 ? 2 : 3;

    // Step 2: Randomly select n distinct corners
    const selectedCorners = selectRandomCorners(n);

    // Step 3: For each corner, randomly select a layer
    const newSelections: LayerSelection[] = selectedCorners.map((corner) => ({
      corner,
      layerId: getRandomLayerForCorner(corner),
    }));

    setSelections(newSelections);

    // Step 4: Load SVG and extract paths
    fetch("/palm-fronds-and-silhouettes.svg")
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = svgDoc.querySelector("svg");

        if (!svgElement) {
          console.error("Could not parse SVG");
          return;
        }

        // Extract path elements for selected layers
        const extractedPaths: PathData[] = newSelections
          .map((selection) => {
            const pathElement = svgElement.querySelector(`#${selection.layerId}`);
            if (!pathElement) {
              console.warn(`Path with id "${selection.layerId}" not found`);
              return null;
            }

            const fillRuleAttr = pathElement.getAttribute("fill-rule") || pathElement.getAttribute("fillRule");
            const fillRule: "inherit" | "evenodd" | "nonzero" | undefined = 
              fillRuleAttr === "inherit" || fillRuleAttr === "evenodd" || fillRuleAttr === "nonzero"
                ? fillRuleAttr
                : undefined;

            const pathData: PathData = {
              id: selection.layerId,
              d: pathElement.getAttribute("d") || "",
              className: pathElement.getAttribute("class") || undefined,
              fill: pathElement.getAttribute("fill") || undefined,
              fillRule,
            };
            return pathData;
          })
          .filter((p): p is PathData => p !== null);

        setPaths(extractedPaths);
      })
      .catch((err) => {
        console.error("Failed to load SVG:", err);
      });
  }, []);

  if (paths.length === 0 || selections.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {paths.map((path, index) => {
        const selection = selections[index];
        if (!selection) return null;

        const position = CORNER_POSITIONS[selection.corner];

        return (
          <svg
            key={`${selection.layerId}-${index}`}
            className="absolute"
            style={{
              ...position,
              opacity: 0.25,
              width: "600px",
              height: "600px",
            }}
            viewBox="0 0 1500 1500"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              id={path.id}
              d={path.d}
              className={path.className}
              fill={path.fill || "#010101"}
              fillRule={path.fillRule || "evenodd"}
            />
          </svg>
        );
      })}
    </div>
  );
}
