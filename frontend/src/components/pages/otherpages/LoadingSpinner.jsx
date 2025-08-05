import React from "react";
import "../../css/LoadingSpinner.css";

const LoadingSpinner = () => (
  <div className="spinner" style={{ textAlign: "center", padding: "8px" }}>
    <svg width="24" height="24" viewBox="0 0 50 50">
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="#007bff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="31.415, 31.415"
        transform="rotate(72.3246 25 25)"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  </div>
);

export default LoadingSpinner;
