"use client";

export default function ChartPalmLeaves() {
  return (
    <>
      {/* Bottom left palm leaf cluster - Pure CSS with palm frond shapes */}
      <div
        className="absolute bottom-0 left-0 pointer-events-none"
        style={{ 
          zIndex: 1, 
          opacity: 0.25,
          width: "100px",
          height: "100px",
          clipPath: "polygon(10% 100%, 8% 85%, 5% 70%, 3% 55%, 2% 40%, 3% 28%, 5% 18%, 8% 12%, 12% 8%, 18% 6%, 25% 7%, 32% 10%, 40% 15%, 48% 22%, 55% 30%, 60% 38%, 65% 48%, 68% 58%, 70% 68%, 72% 78%, 74% 88%, 76% 95%, 78% 100%, 50% 100%, 30% 100%, 10% 100%)",
          background: "#81B214",
          transform: "translate(-25%, 25%) rotate(-8deg)"
        }}
      />
      {/* Smaller frond for cluster */}
      <div
        className="absolute bottom-0 left-0 pointer-events-none"
        style={{ 
          zIndex: 1, 
          opacity: 0.2,
          width: "70px",
          height: "70px",
          clipPath: "polygon(15% 100%, 12% 88%, 10% 75%, 8% 60%, 7% 45%, 8% 32%, 10% 22%, 14% 15%, 20% 11%, 28% 10%, 36% 12%, 44% 17%, 52% 24%, 58% 32%, 63% 42%, 66% 52%, 68% 62%, 70% 72%, 72% 82%, 74% 90%, 76% 96%, 78% 100%, 50% 100%, 30% 100%, 15% 100%)",
          background: "#81B214",
          transform: "translate(15%, 35%) rotate(12deg)"
        }}
      />
      
      {/* Bottom right palm leaf cluster - Pure CSS */}
      <div
        className="absolute bottom-0 right-0 pointer-events-none"
        style={{ 
          zIndex: 1, 
          opacity: 0.25,
          width: "100px",
          height: "100px",
          clipPath: "polygon(90% 100%, 92% 85%, 95% 70%, 97% 55%, 98% 40%, 97% 28%, 95% 18%, 92% 12%, 88% 8%, 82% 6%, 75% 7%, 68% 10%, 60% 15%, 52% 22%, 45% 30%, 40% 38%, 35% 48%, 32% 58%, 30% 68%, 28% 78%, 26% 88%, 24% 95%, 22% 100%, 50% 100%, 70% 100%, 90% 100%)",
          background: "#81B214",
          transform: "translate(25%, 25%) rotate(8deg)"
        }}
      />
      {/* Smaller frond for cluster */}
      <div
        className="absolute bottom-0 right-0 pointer-events-none"
        style={{ 
          zIndex: 1, 
          opacity: 0.2,
          width: "70px",
          height: "70px",
          clipPath: "polygon(85% 100%, 88% 88%, 90% 75%, 92% 60%, 93% 45%, 92% 32%, 90% 22%, 86% 15%, 80% 11%, 72% 10%, 64% 12%, 56% 17%, 48% 24%, 42% 32%, 37% 42%, 34% 52%, 32% 62%, 30% 72%, 28% 82%, 26% 90%, 24% 96%, 22% 100%, 50% 100%, 70% 100%, 85% 100%)",
          background: "#81B214",
          transform: "translate(-15%, 35%) rotate(-12deg)"
        }}
      />
    </>
  );
}
