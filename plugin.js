(function () {
    const PLUGIN_ID = "seanime-friend-insights";
    
    const FRIEND_ACTIVITY_QUERY = `
    query ($mediaId: Int) {
      Page(page: 1, perPage: 10) {
        mediaList(mediaId: $mediaId, isFollowing: true) {
          user {
            name
            avatar {
              medium
            }
          }
          status
          score(format: POINT_10)
        }
      }
    }`;

    async function fetchFriendActivity(mediaId) {
        const token = localStorage.getItem("seanime-anilist-token") || ""; 
        
        try {
            const response = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && { "Authorization": `Bearer ${token}` })
                },
                body: JSON.stringify({
                    query: FRIEND_ACTIVITY_QUERY,
                    variables: { mediaId: parseInt(mediaId) }
                })
            });
            const json = await response.json();
            return json.data?.Page?.mediaList || [];
        } catch (err) {
            console.error("[Friend Insights] Error fetching data:", err);
            return [];
        }
    }

    function renderFriendCard(activities) {
        if (!activities || activities.length === 0) return "";

        const primary = activities[0];
        const hasMore = activities.length > 1;
        const cleanStatus = primary.status.charAt(0).toUpperCase() + primary.status.slice(1).toLowerCase();

        return `
            <div id="seanime-friend-insights-card" class="friend-card-container">
                <div class="friend-profile-section">
                    <img src="${primary.user.avatar.medium}" alt="${primary.user.name}" class="friend-avatar"/>
                    <div class="friend-info">
                        <span class="friend-label">Member:</span>
                        <span class="friend-value">${primary.user.name}</span>
                    </div>
                </div>
                <div class="friend-status-section">
                    <span class="friend-label">Status</span>
                    <span class="friend-value">${cleanStatus}</span>
                </div>
                <div class="friend-rating-section">
                    <span class="friend-label">Rating</span>
                    <span class="friend-value">${primary.score > 0 ? `${primary.score} / 10` : "Unrated"}</span>
                </div>
                ${hasMore ? `<div class="more-friends-tag">+ more friends</div>` : ""}
            </div>
        `;
    }

    function init() {
        let currentMediaId = null;

        setInterval(async () => {
            const match = window.location.pathname.match(/\/anime\/(\d+)/);
            if (match && match[1] !== currentMediaId) {
                currentMediaId = match[1];
                
                const oldCard = document.getElementById("seanime-friend-insights-card");
                if (oldCard) oldCard.remove();

                const targetContainer = document.querySelector(".anime-description-container") || document.querySelector(".main-layout");
                
                if (targetContainer) {
                    const data = await fetchFriendActivity(currentMediaId);
                    if (data.length > 0) {
                        const cardHtml = renderFriendCard(data);
                        targetContainer.insertAdjacentHTML("afterend", cardHtml);
                    }
                }
            }
        }, 1500);
    }

    const styles = `
        .friend-card-container {
            display: inline-flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 12px 24px;
            gap: 32px;
            margin-top: 16px;
        }
        .friend-profile-section { display: flex; align-items: center; gap: 12px; }
        .friend-avatar { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; }
        .friend-info, .friend-status-section, .friend-rating-section { display: flex; flex-direction: column; gap: 2px; }
        .friend-label { color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; font-weight: 400; }
        .friend-value { color: #ffffff; font-weight: 500; font-size: 0.95rem; }
        .more-friends-tag { color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; font-weight: 400; margin-left: 8px; cursor: pointer; }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    init();
})();
