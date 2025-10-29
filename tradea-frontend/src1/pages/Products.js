import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Products() {
  const [feed, setFeed] = useState([]);
  const userId = localStorage.getItem("user_id");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || !token) return;

    fetch(`http://localhost:8000/user/${userId}/feed`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        console.log("Fetched feed:", data.feed);
        setFeed(Array.isArray(data.feed) ? data.feed : []);
      })
      .catch(err => console.error("Failed to fetch feed:", err));
  }, [userId, token]);

  const handleLike = (postId) => {
    console.log(`Liked post ${postId}`);
    // Optional: send like to backend
  };

  const handleShare = (product) => {
    const shareText = `Check out this product on Tradea: ${product.title}`;
    navigator.clipboard.writeText(shareText)
      .then(() => alert("Product link copied to clipboard!"))
      .catch(err => console.error("Failed to copy:", err));
  };

  const handleRequestTrade = async (product) => {
    const buyerId = parseInt(localStorage.getItem("user_id"));
    const message = `Hi! I'd like to trade for your product: ${product.title}`;

    try {
      const res = await fetch(`http://localhost:8000/post/${post_id}/trade-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buyer_id: buyerId,
          message: message,
        }),
      });

      if (res.ok) {
        alert("✅ Trade request sent! Redirecting to Messages...");
        navigate("/messages");
      } else {
        const error = await res.json();
        alert(`❌ Failed to send request: ${error.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Failed to send trade request:", err);
      alert("❌ Network error while sending trade request.");
    }
  };

  const visitOwnerProfile = (ownerId) => {
    navigate(`/profile/${ownerId}`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Tradea Product Feed</h1>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        {feed.length === 0 ? (
          <p>No products found.</p>
        ) : (
          feed.map((product) => (
            <div key={product.post_id} style={{
              border: '1px solid #ccc',
              borderRadius: '10px',
              padding: '1rem',
              maxWidth: '500px',
              margin: '0 auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {/* Owner Profile */}
              <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                <span
                  style={{ color: "#007bff", cursor: "pointer" }}
                  onClick={() => visitOwnerProfile(product.owner_id)}
                >
                  👤 User {product.owner_id}
                </span>
              </div>

              {/* Media Preview */}
              <div style={{ marginBottom: '1rem' }}>
                {product.file_url?.endsWith(".mp4") ? (
                  <video
                    src={product.file_url}
                    controls
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                ) : (
                  <img
                    src={product.file_url || "https://via.placeholder.com/500x300?text=No+Media"}
                    alt={product.title}
                    style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }}
                  />
                )}
              </div>

              {/* Post Title */}
              <h3 style={{ marginBottom: '0.5rem' }}>{product.title}</h3>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '0.5rem' }}>
                <button onClick={() => handleLike(product.post_id)}>❤️ Like</button>
                <button onClick={() => handleShare(product)}>🔗 Share</button>
                <button onClick={() => handleRequestTrade(product)}>🤝 Request Trade</button>
              </div>

              {/* Like Count */}
              <div style={{ textAlign: 'left', fontSize: '0.9rem', color: '#555' }}>
                👍 Likes: {product.likes_count}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Products;