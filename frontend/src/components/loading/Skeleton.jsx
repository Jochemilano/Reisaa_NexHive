import "./Skeleton.css";

export default function Skeleton({ className, width, height, borderRadius }) {
  return (
    <div 
      className={`skeleton-loader ${className || ""}`} 
      style={{ 
        width: width || "100%", 
        height: height || "1rem",
        borderRadius: borderRadius || "var(--radius-m, 8px)"
      }} 
    />
  );
}
