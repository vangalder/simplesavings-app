"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

// List of available palm leaf images (updated to match remaining files)
const PALM_LEAF_IMAGES = [
  "/palm-leaves/6859ea3477e838b230d374a8_109696959_8242-3.avif",
  "/palm-leaves/a-palm-tree-leaf-silhouette-free-free-vector.jpg",
  "/palm-leaves/il_fullxfull.6163239953_4zmy.webp",
  "/palm-leaves/palm-branch-arecaceae-frond-clip-art-leaf.jpg",
  "/palm-leaves/palm-leaves-silhouette-free-vector.jpg",
  "/palm-leaves/palm-tree-leaves-silhouette-5764.svg",
  "/palm-leaves/palm+frond+for+web.webp",
  "/palm-leaves/pngtree-elegant-palm-frond-corner-border-on-white-background-png-image_18354794.png",
  "/palm-leaves/pngtree-exquisite-vector-illustration-of-a-palm-leaf-silhouette-against-a-backdrop-png-image_12563329.png",
  "/palm-leaves/pngtree-palm-leaves-png-image_9941602.png",
  "/palm-leaves/pngtree-summer-coconut-palm-tree-leaf-png-image_11936615.png",
  "/palm-leaves/tropical-leaf-silhouette-000000-xl.png",
];

interface LeafConfig {
  position: { top?: number; bottom?: number; left?: number; right?: number; transform: string };
  leaf: string;
  size: number;
  rotation: number;
  opacity: number;
}

export default function BackgroundPalmLeaves() {
  const [leaves, setLeaves] = useState<LeafConfig[]>([]);

  // Only randomize on client side to avoid hydration mismatch
  useEffect(() => {
    const corners = [
      { top: 0, left: 0, transform: "translate(-40%, -40%)" },
      { top: 0, right: 0, transform: "translate(40%, -40%)" },
      { bottom: 0, left: 0, transform: "translate(-40%, 40%)" },
      { bottom: 0, right: 0, transform: "translate(40%, 40%)" },
    ];

    // Randomly select 2 corners
    const shuffledCorners = [...corners].sort(() => Math.random() - 0.5);
    const selectedCorners = shuffledCorners.slice(0, 2);

    // Randomly select 2 different images
    const shuffledLeaves = [...PALM_LEAF_IMAGES].sort(() => Math.random() - 0.5);
    const selectedLeaves = shuffledLeaves.slice(0, 2);

    // Generate leaf configurations
    const leafConfigs: LeafConfig[] = selectedCorners.map((position, index) => {
      const leaf = selectedLeaves[index];
      const size = 500 + Math.random() * 300; // Much larger: 500-800px
      const rotation = (Math.random() - 0.5) * 30; // Random rotation -15 to +15 degrees
      const opacity = 0.15 + Math.random() * 0.15; // Opacity between 0.15-0.30 for more vibrance

      return {
        position,
        leaf,
        size,
        rotation,
        opacity,
      };
    });

    setLeaves(leafConfigs);
  }, []);

  // Don't render until client-side to avoid hydration mismatch
  if (leaves.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {leaves.map((config, index) => (
        <div
          key={`${config.leaf}-${index}`}
          className="absolute"
          style={{
            ...config.position,
            transform: `${config.position.transform} rotate(${config.rotation}deg)`,
            opacity: config.opacity,
          }}
        >
          <Image
            src={config.leaf}
            alt=""
            width={config.size}
            height={config.size}
            className="object-contain"
            style={{ filter: "brightness(1.1) saturate(1.2)" }}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
