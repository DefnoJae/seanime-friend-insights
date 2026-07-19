/// <reference path="https://raw.githubusercontent.com/5rahim/seanime/refs/heads/main/internal/extension_repo/goja_plugin_types/plugin.d.ts" />
/// <reference path="https://raw.githubusercontent.com/5rahim/seanime/refs/heads/main/internal/extension_repo/goja_plugin_types/app.d.ts" />

interface AniListUser {
    name: string;
    avatar: { medium: string };
}

interface MediaListEntry {
    user: AniListUser;
    status: string;
    score: number;
}

interface AniListResponse {
    Page?: { mediaList?: MediaListEntry[] };
}

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

// Move CSS to a constant to avoid confusing the compiler inside the HTML string
const STYLE_BLOCK = `
<style>
    .friend-card-container {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 12px 20px;
        gap: 25px;
        margin-top: 15px;
    }
    .friend-profile-section { display: flex; align-items: center; gap: 10px; }
    .friend-avatar { width: 40px; height: 40px; border-radius: 5px; object-fit: cover; }
    .friend-info, .friend-status-section, .friend-rating-section { display: flex; flex-direction: column; }
    .friend-label { color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; }
    .friend-value { color: #ffffff; font-weight: 500; font-size: 14px; }
    .more-friends-tag { color: #3db4f2; font-size: 13px; margin-left: auto; }
</style>
`;

function renderFriendCard(activities: MediaListEntry[]): string {
    const primary = activities[0];
    const hasMore = activities.length > 1;
    const cleanStatus = primary.status.charAt(0).toUpperCase() + primary.status.slice(1).toLowerCase();
    const scoreText = primary.score > 0 ? (primary.score + " / 10") : "Unrated";
    const moreTag = hasMore ? '<div class="more-friends-tag">+' + (activities.length - 1) + ' more</div>' : "";

    return '<div id="seanime-friend-insights-card" class="friend-card-container">' +
        '<div class="friend-profile-section">' +
            '<img src="' + primary.user.avatar.medium + '" class="friend-avatar"/>' +
            '<div class="friend-info"><span class="friend-label">Friend</span><span class="friend-value">' + primary.user.name + '</span></div>' +
        '</div>' +
        '<div class="friend-status-section"><span class="friend-label">Status</span><span class="friend-value">' + cleanStatus + '</span></div>' +
        '<div class="friend-rating-section"><span class="friend-label">Rating</span><span class="friend-value">' + scoreText + '</span></div>' +
        moreTag +
    '</div>' + STYLE_BLOCK;
}

function init(): void {
    $ui.register((ctx) => {
        ctx.dom.onReady(async () => {
            let currentMediaId: string | null = null;

            while (true) {
                const win = (globalThis as any).window;
                if (!win) {
                    await $sleep(2000);
                    continue;
                }

                const pathname = win.location.pathname || "";
                const search = win.location.search || "";
                const match = pathname.match(/\/anime\/(\d+)/) || search.match(/[?&]id=(\d+)/);
                const detectedId = match ? match[1] : null;

                if (detectedId && detectedId !== currentMediaId) {
                    currentMediaId = detectedId;
                    
                    // Remove existing card
                    const doc = win.document;
                    const oldCard = doc.getElementById("seanime-friend-insights-card");
                    if (oldCard) oldCard.remove();

                    // Find container
                    const target = doc.querySelector(".anime-description-container") || doc.querySelector(".main-layout");
                    
                    if (target) {
                        try {
                            const token = win.localStorage.getItem("seanime-anilist-token") || "";
                            const response = await $anilist.customQuery<AniListResponse>({
                                query: FRIEND_QUERY,
                                variables: { mediaId: parseInt(detectedId) }
                            }, token);

                            const entries = response?.Page?.mediaList || [];
                            if (entries.length > 0) {
                                target.insertAdjacentHTML("afterend", renderFriendCard(entries));
                            }
                        } catch (e) {
                            console.error("Friend Insights Error:", e);
                        }
                    }
                }
                await $sleep(2000);
            }
        });
    });
}      }
    }`;

    $ui.register((ctx) => {
        
        async function startTracking(): Promise<void> {
            let currentMediaId: string | null = null;

            while (true) {
                // Accessing the window context safely
                const win = (globalThis as any).window;
                if (!win) {
                    await $sleep(2000);
                    continue;
                }

                const pathname = win.location.pathname || "";
                // Match /anime/123 or /entry?id=123
                const match = pathname.match(/\/anime\/(\d+)/) || win.location.search.match(/[?&]id=(\d+)/);
                
                let detectedId: string | null = null;
                if (match) {
                    detectedId = match[1];
                }

                // If we are on a new anime page
                if (detectedId && detectedId !== currentMediaId) {
                    currentMediaId = detectedId;

                    const doc = win.document;
                    
                    // Remove any existing card from previous navigation
                    doc.getElementById("seanime-friend-insights-card")?.remove();

                    // Find where to inject the card
                    const targetContainer = doc.querySelector(".anime-description-container") || doc.querySelector("#media-description-section");
                    
                    if (targetContainer) {
                        try {
                            // Seanime usually stores the token in localStorage, but we check if it exists
                            const token = win.localStorage.getItem("seanime-anilist-token");
                            
                            if (!token) {
                                console.warn("[Friend Insights]: No AniList token found. User might not be logged in.");
                                await $sleep(5000); // Wait longer if not logged in
                                continue;
                            }

                            const response = await $anilist.customQuery<AniListResponse>({
                                query: FRIEND_QUERY,
                                variables: { mediaId: parseInt(currentMediaId) }
                            }, token);

                            const activities = response?.Page?.mediaList || [];
                            
                            // Only render if friends actually have data
                            if (activities.length > 0 && !doc.getElementById("seanime-friend-insights-card")) {
                                const cardHtml = renderFriendCard(activities);
                                targetContainer.insertAdjacentHTML("afterend", cardHtml);
                            }
                        } catch (err) {
                            console.error("[Friend Insights Plugin Error]:", err);
                        }
                    }
                }
                
                // Poll every 1.5 seconds to detect navigation changes
                await $sleep(1500);
            }
        }

        ctx.dom.onReady(() => {
            startTracking();
        });
    });
}

function renderFriendCard(activities: MediaListEntry[]): string {
    // Focus on the first friend found
    const primary = activities[0];
    const otherCount = activities.length - 1;
    
    const cleanStatus = primary.status.replace(/_/g, ' ').toLowerCase();
    const formattedStatus = cleanStatus.charAt(0).toUpperCase() + cleanStatus.slice(1);
    
    let scoreText = "Unrated";
    if (primary.score > 0) {
        scoreText = `${primary.score}/10`;
    }

    const moreTag = otherCount > 0 
        ? `<div class="more-friends-tag">+ ${otherCount} other friend${otherCount > 1 ? 's' : ''}</div>` 
        : "";

    return `
        <div id="seanime-friend-insights-card" class="friend-card-container">
            <div class="friend-profile-section">
                <img src="${primary.user.avatar.medium}" alt="${primary.user.name}" class="friend-avatar"/>
                <div class="friend-info">
                    <span class="friend-label">Friend</span>
                    <span class="friend-value">${primary.user.name}</span>
                </div>
            </div>
            <div class="friend-status-section">
                <span class="friend-label">Status</span>
                <span class="friend-value">${formattedStatus}</span>
            </div>
            <div class="friend-rating-section">
                <span class="friend-label">Rating</span>
                <span class="friend-value">${scoreText}</span>
            </div>
            ${moreTag}
        </div>
        <style>
            .friend-card-container {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                gap: 24px;
                margin-top: 20px;
                margin-bottom: 10px;
                font-family: inherit;
            }
            .friend-profile-section { display: flex; align-items: center; gap: 12px; }
            .friend-avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #3db4f2; object-fit: cover; }
            .friend-info, .friend-status-section, .friend-rating-section { display: flex; flex-direction: column; gap: 4px; }
            .friend-label { color: rgba(255, 255, 255, 0.5); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; }
            .friend-value { color: #ffffff; font-weight: 600; font-size: 0.9rem; }
            .more-friends-tag { 
                margin-left: auto;
                background: rgba(61, 180, 242, 0.1);
                color: #3db4f2;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 500;
            }
            @media (max-width: 640px) {
                .friend-card-container { gap: 16px; justify-content: space-between; }
                .more-friends-tag { width: 100%; text-align: center; margin-top: 8px; }
            }
        </style>
    `;
}      }
    }`;

    $ui.register((ctx) => {
        
        async function startTracking(): Promise<void> {
            let currentMediaId: string | null = null;

            while (true) {
                const win = (globalThis as any).window;
                if (!win) {
                    await $sleep(2000);
                    continue;
                }

                const pathname = win.location.pathname || "";
                const search = win.location.search || "";
                const match = pathname.match(/\/anime\/(\d+)/) || search.match(/[?&]id=(\d+)/);
                
                let detectedId: string | null = null;
                if (match) {
                    detectedId = match[1];
                }

                if (detectedId && detectedId !== currentMediaId) {
                    currentMediaId = detectedId;

                    const doc = win.document;
                    const oldCard = doc.getElementById("seanime-friend-insights-card");
                    if (oldCard) {
                        oldCard.remove();
                    }

                    const targetContainer = doc.querySelector(".anime-description-container") || doc.querySelector(".main-layout");
                    
                    if (targetContainer) {
                        try {
                            const token = win.localStorage.getItem("seanime-anilist-token") || "";
                            
                            const response = await $anilist.customQuery<AniListResponse>({
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
                
                await $sleep(1500);
            }
        }

        ctx.dom.onReady(() => {
            startTracking();
        });
    });
}

function renderFriendCard(activities: MediaListEntry[]): string {
    const primary = activities[0];
    const hasMore = activities.length > 1;
    
    const cleanStatus = primary.status.charAt(0).toUpperCase() + primary.status.slice(1).toLowerCase();
    
    let scoreText = "Unrated";
    if (primary.score > 0) {
        scoreText = primary.score + " / 10";
    }

    let moreTag = "";
    if (hasMore) {
        moreTag = '<div class="more-friends-tag">+ more friends</div>';
    }

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
