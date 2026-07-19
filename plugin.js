/// <reference path="https://raw.githubusercontent.com/5rahim/seanime/refs/heads/main/internal/extension_repo/goja_plugin_types/plugin.d.ts" />
/// <reference path="https://raw.githubusercontent.com/5rahim/seanime/refs/heads/main/internal/extension_repo/goja_plugin_types/app.d.ts" />

function init() {
    
    var FRIEND_QUERY = "query ($mediaId: Int) { Page(page: 1, perPage: 10) { mediaList(mediaId: $mediaId, isFollowing: true) { user { name avatar { medium } } status score(format: POINT_10) } } }";

    var CSS = "<style>" +
        ".friend-card-container { display: flex; align-items: center; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 12px 20px; gap: 25px; margin-top: 15px; }" +
        ".friend-profile-section { display: flex; align-items: center; gap: 10px; }" +
        ".friend-avatar { width: 40px; height: 40px; border-radius: 5px; object-fit: cover; }" +
        ".friend-info, .friend-status-section, .friend-rating-section { display: flex; flex-direction: column; }" +
        ".friend-label { color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; }" +
        ".friend-value { color: #ffffff; font-weight: 500; font-size: 14px; }" +
        ".more-friends-tag { color: #3db4f2; font-size: 13px; margin-left: auto; }" +
    "</style>";

    $ui.register(function(ctx) {
        
        ctx.dom.onReady(function() {
            
            async function startTracking() {
                var currentMediaId = null;

                while (true) {
                    var win = globalThis.window;
                    if (!win) {
                        await $sleep(2000);
                        continue;
                    }

                    var pathname = win.location.pathname || "";
                    var search = win.location.search || "";
                    var match = pathname.match(/\/anime\/(\d+)/) || search.match(/[?&]id=(\d+)/);
                    
                    var detectedId = null;
                    if (match && match[1]) {
                        detectedId = match[1];
                    }

                    if (detectedId && detectedId !== currentMediaId) {
                        currentMediaId = detectedId;

                        var doc = win.document;
                        var oldCard = doc.getElementById("seanime-friend-insights-card");
                        if (oldCard) {
                            oldCard.remove();
                        }

                        var target = doc.querySelector(".anime-description-container") || doc.querySelector(".main-layout");
                        
                        if (target) {
                            try {
                                var token = win.localStorage.getItem("seanime-anilist-token") || "";
                                
                                var response = await $anilist.customQuery({
                                    query: FRIEND_QUERY,
                                    variables: { mediaId: parseInt(detectedId) }
                                }, token);

                                if (response && response.Page && response.Page.mediaList && response.Page.mediaList.length > 0) {
                                    var activities = response.Page.mediaList;
                                    var primary = activities[0];
                                    var statusTxt = primary.status.charAt(0).toUpperCase() + primary.status.slice(1).toLowerCase();
                                    var scoreTxt = primary.score > 0 ? primary.score + " / 10" : "Unrated";
                                    var moreHtml = activities.length > 1 ? '<div class="more-friends-tag">+' + (activities.length - 1) + ' more</div>' : "";

                                    var cardHtml = '<div id="seanime-friend-insights-card" class="friend-card-container">' +
                                        '<div class="friend-profile-section">' +
                                            '<img src="' + primary.user.avatar.medium + '" class="friend-avatar"/>' +
                                            '<div class="friend-info"><span class="friend-label">Member</span><span class="friend-value">' + primary.user.name + '</span></div>' +
                                        '</div>' +
                                        '<div class="friend-status-section"><span class="friend-label">Status</span><span class="friend-value">' + statusTxt + '</span></div>' +
                                        '<div class="friend-rating-section"><span class="friend-label">Rating</span><span class="friend-value">' + scoreTxt + '</span></div>' +
                                        moreHtml +
                                    '</div>' + CSS;

                                    target.insertAdjacentHTML("afterend", cardHtml);
                                }
                            } catch (err) {
                                console.error("Friend Insights Plugin Error:", err);
                            }
                        }
                    }
                    await $sleep(2000);
                }
            }

            startTracking();
        });
    });
}
