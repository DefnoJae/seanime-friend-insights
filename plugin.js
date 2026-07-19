function init() {
    const FRIEND_QUERY = `
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

    $ui.register((ctx) => {
        
        // Define an async polling loop using Seanime's native backend framework
        async function startTracking() {
            let currentMediaId = null;

            while (true) {
                // Check navigation using the built-in screen/location framework context
                const match = window.location.pathname.match(/\/anime\/(\d+)/) || 
                              (window.location.search && window.location.search.match(/[?&]id=(\d+)/));
                
                let detectedId = null;
                if (match) {
                    detectedId = match[1];
                }

                if (detectedId && detectedId !== currentMediaId) {
                    currentMediaId = detectedId;

                    const oldCard = document.getElementById("seanime-friend-insights-card");
                    if (oldCard) oldCard.remove();

                    const targetContainer = document.querySelector(".anime-description-container") || document.querySelector(".main-layout");
                    
                    if (targetContainer) {
                        try {
                            const token = localStorage.getItem("seanime-anilist-token") || "";
                            const response = await $anilist.customQuery({
                                query: FRIEND_QUERY,
                                variables: { mediaId: parseInt(currentMediaId) }
                            }, token);

                            const activities = response?.Page?.mediaList || [];
                            if (activities.length > 0) {
                                const cardHtml = renderFriendCard(activities);
                                targetContainer.insertAdjacentHTML("afterend", cardHtml);
                            }
                        } catch (err) {
                            console.error("[Friend Insights Plugin Error]:", err);
                        }
                    }
                }
                
                // Use Seanime's server-safe sleep function instead of setInterval
                await $sleep(1500);
            }
        }

        ctx.dom.onReady(() => {
            startTracking();
        });
    });
}

function renderFriendCard(activities) {
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
                <span class="friend-value">${primary.score > 0 ? \`\${primary.score} / 10\` : "Unrated"}</span>
            </div>
            \${hasMore ? \`<div class="more-friends-tag">+ more friends</div>\` : ""}
        </div>
        <style>
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
        </style>
    `;
}
