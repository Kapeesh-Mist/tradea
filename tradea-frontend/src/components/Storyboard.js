// src/components/StoryboardCard.js
import "./Storyboard.css";

function StoryboardCard({ title, description }) {
  return (
    <div className="storyboard-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default StoryboardCard;