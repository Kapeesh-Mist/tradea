// src/components/CTAButton.js
import "./CTAButton.css";

function CTAButton({ label, onClick }) {
  return (
    <button className="cta-button" onClick={onClick}>
      {label}
    </button>
  );
}

export default CTAButton;