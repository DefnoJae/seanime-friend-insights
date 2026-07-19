/// <reference path="https://raw.githubusercontent.com/5rahim/seanime/refs/heads/main/internal/extension_repo/goja_plugin_types/plugin.d.ts" />
/// <reference path="https://raw.githubusercontent.com/5rahim/seanime/refs/heads/main/internal/extension_repo/goja_plugin_types/app.d.ts" />

function init() {
    
    var FRIEND_QUERY = "query ($mediaId: Int) { Page(page: 1, perPage: 50) { mediaList(mediaId: $mediaId, isFollowing: true) { user { name avatar { medium } } status progress score(format: POINT_10) } } }";

    var CSS = "<style>" +
        "#seanime-friends-tray { position: fixed; right: 0; top: 0; height: 100vh; width: 320px; background: rgba(15, 15, 15, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-left: 1px solid rgba(255,255,255,0.1); z-index: 9999; display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: -10px 0 30px rgba(0,0,0,0.5); }" +
        "#seanime-friends-tray.open { transform: translateX(0); }" +
        ".tray-header { padding: 25px 20px 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }" +
        ".tray-title { font-size: 18px; font-weight: 700; color: #3db4f2; margin: 0; }" +
        ".tray-close { background: none; border: none; color: white; cursor: pointer; font-size: 20px; opacity: 0.5; }" +
        ".tray-close:hover { opacity: 1; }" +
        ".friends-scroll-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; scrollbar-width: thin; }" +
        ".friend-module { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }" +
        ".friend-user-info { display: flex; align-items: center; gap: 12px; }" +
        ".friend-avatar { width: 38px; height: 38px; border-radius: 50%; border: 2px solid #3db4f2; background: #222; }" +
        ".friend-name { font-weight: 600; font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }" +
        ".friend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }" +
        ".friend-stat { display: flex; flex-direction: column; gap: 2px; }" +
        ".stat-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }" +
        ".stat-val { font-size: 12px; color: #efefef; font-weight: 500; }" +
        "#friends-tray-toggle { position: fixed; right: 25px; bottom: 25px; width: 55px; height: 55px; border-radius: 50%; background: #3db4f2; color: white; border: none; cursor: pointer; z-index: 9998; box-shadow: 0 4px 20px rgba(0,0,0,0.4); display: none; align-items: center; justify-content: center; transition: transform 0.2s; }" +
        "#friends-tray-toggle:hover { transform: scale(1.1); }" +
        "#friends-tray-toggle svg { width: 24px; height: 24px; fill: currentColor; }" +
    "</style>";

    $ui.register(function(ctx) {
        ctx.dom.onReady(function() {
            var currentMediaId = null;

            // Setup HTML Structure Once
            var win = globalThis.window;
            var doc = win.document;
            
            if (!doc.getElementById("seanime-friends-tray")) {
                var trayHtml = '<div id="seanime-friends-tray">' +
                    '<div class="tray-header"><h2 class="tray-title">Friend Insights</h2><button class="tray-close" id="close-friends-tray">✕</button></div>' +
                    '<div class="friends-scroll-area" id="friends-list-container"></div>' +
                '</div>' +
                '<button id="friends-tray-toggle" title="View Friend Activity">' +
                    '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>' +
                '</button>' + CSS;
                doc.body.insertAdjacentHTML("beforeend", trayHtml);

                // Events
                doc.getElementById("friends-tray-toggle").onclick = function() {
                    doc.getElementById("seanime-friends-tray").classList.add("open");
                };
                doc.getElementById("close-friends-tray").onclick = function() {
                    doc.getElementById("seanime-friends-tray").classList.remove("open");
                };
            }

            async function monitorNavigation() {
                while (true) {
                    var win = globalThis.window;
                    if (!win) { await $sleep(2000); continue; }

                    var pathname = win.location.pathname || "";
                    var match = pathname.match(/\/anime\/(\d+)/) || win.location.search.match(/[?&]id=(\d+)/);
                    var detectedId = match ? match[1] : null;

                    if (detectedId && detectedId !== currentMediaId) {
                        currentMediaId = detectedId;
                        var listContainer = doc.getElementById("friends-list-container");
                        var toggleBtn = doc.getElementById("friends-tray-toggle");
                        
                        listContainer.innerHTML = ""; // Clear list
                        toggleBtn.style.display = "none"; // Hide button until data found

                        try {
                            var token = win.localStorage.getItem("seanime-anilist-token") || "";
                            var response = await $anilist.customQuery({
                                query: FRIEND_QUERY,
                                variables: { mediaId: parseInt(detectedId) }
                            }, token);

                            var entries = (response && response.Page) ? response.Page.mediaList : [];
                            
                            if (entries && entries.length > 0) {
                                toggleBtn.style.display = "flex";
                                var listHtml = "";
                                
                                for (var i = 0; i < entries.length; i++) {
                                    var entry = entries[i];
                                    var score = entry.score > 0 ? entry.score + "/10" : "Unrated";
                                    var status = entry.status.replace(/_/g, " ").toLowerCase();
                                    status = status.charAt(0).toUpperCase() + status.slice(1);

                                    listHtml += '<div class="friend-module">' +
                                        '<div class="friend-user-info">' +
                                            '<img src="' + entry.user.avatar.medium + '" class="friend-avatar" />' +
                                            '<span class="friend-name">' + entry.user.name + '</span>' +
                                        '</div>' +
                                        '<div class="friend-grid">' +
                                            '<div class="friend-stat"><span class="stat-label">Status</span><span class="stat-val">' + status + '</span></div>' +
                                            '<div class="friend-stat"><span class="stat-label">Score</span><span class="stat-val">' + score + '</span></div>' +
                                            '<div class="friend-stat"><span class="stat-label">Progress</span><span class="stat-val">' + entry.progress + ' eps</span></div>' +
                                        '</div>' +
                                    '</div>';
                                }
                                listContainer.innerHTML = listHtml;
                            }
                        } catch (e) {
                            console.error("Friends Tray Error:", e);
                        }
                    }
                    await $sleep(2000);
                }
            }
            monitorNavigation();
        });
    });
}
