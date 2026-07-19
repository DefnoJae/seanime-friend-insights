(function() {
    const FRIEND_QUERY = `
    query ($mediaId: Int) {
      Page(page: 1, perPage: 10) {
        mediaList(mediaId: $mediaId, isFollowing: true) {
          user {
            name
            avatar { medium }
          }
          status
          score(format: POINT_10)
        }
      }
    }`;

    let currentMediaId: string | null = null;

    async function checkPageChanges(): Promise<void> {
        const pathname = window.location.pathname || "";
        const search = window.location.search || "";
        const match = pathname.match(/\/anime\/(\d+)/) || search.match(/[?&]id=(\d+)/);
        
        let detectedId: string | null = match ? match[1] : null;

        if (detectedId && detectedId !== currentMediaId) {
            currentMediaId = detectedId;

            // Clean up any existing card from a previous page view
            const oldCard = document.getElementById("seanime-friend-insights-card");
            if (oldCard) oldCard.remove();

            // Locate the layout container on Seanime's media page
            const targetContainer = document.querySelector(".anime-description-container") || 
                                    document.querySelector(".main-layout") ||
                                    document.querySelector(".space-y-4");
            
            if (targetContainer) {
                try {
                    // Pull the user's logged-in token directly from the application state
                    const token = localStorage.getItem("seanime-anilist-token") || "";
                    
                    const response = await fetch("https://graphql.anilist.co", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...(token && { "Authorization": `Bearer ${token}` })
                        },
                        body: JSON.stringify({
                            query: FRIEND_QUERY,
                            variables: { mediaId: parseInt(currentMediaId) }
                        })
                    });
                    
                    const json = await response.json();
                    const activities = json.data?.Page?.mediaList || [];
                    
                    if (activities.length > 0) {
                        const cardHtml = renderFriendCard(activities);
                        targetContainer.insertAdjacentHTML("afterend", cardHtml);
                    }
                } catch (err) {
                    console.error("[Friend Insights Extension Error]:", err);
                }
            }
        }
    }

    function renderFriendCard(activities: any[]): string {
        const primary = activities[0];
        const hasMore = activities.length > 1;
        const cleanStatus = primary.status.charAt(0).toUpperCase() + primary.status.slice(1).toLowerCase();
        const scoreText = primary.score > 0 ? `${primary.score} / 10` : "Unrated";
        const moreTag = hasMore ? '<div class="more-friends-tag">+ more friends</div>' : '';

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
                    <span class="friend-value">${scoreText}</span>
                </div>
                ${moreTag}
            </div>
            <style>
                .friend-card-container {
                    display: inline-flex;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 12px 24px;
                    gap: 32px;
                    margin-top: 20px;
                    margin-bottom: 10px;
                    width: fit-content;
                }
                .friend-profile-section { display: flex; align-items: center; gap: 12px; }
                .friend-avatar { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
                .friend-info, .friend-status-section, .friend-rating-section { display: flex; flex-direction: column; gap: 2px; }
                .friend-label { color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; }
                .friend-value { color: #ffffff; font-weight: 500; font-size: 0.9rem; }
                .more-friends-tag { color: rgba(255, 255, 255, 0.6); font-size: 0.85rem; margin-left: 8px; }
            </style>
        `;
    }

    // Safely observe mutations and page modifications natively
    setInterval(checkPageChanges, 1500);
})();
