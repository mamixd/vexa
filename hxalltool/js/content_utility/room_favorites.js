// Room Favorites by Vexa
window.favoriteRooms = new Set();
window.showOnlyFavorites = false;

chrome.storage.local.get({'favoriteRooms': []}, function(items) {
    if(Array.isArray(items.favoriteRooms)) {
        window.favoriteRooms = new Set(items.favoriteRooms);
    }
});

function toggleFavoriteRoom() {
    var el = document.documentElement.getElementsByClassName("gameframe")[0];
    var favButton = el.contentWindow.document.querySelector('button[data-hook="favRoom"]');
    var selectedRows = el.contentWindow.document.querySelectorAll('tr.selected');
    
    if (selectedRows && selectedRows.length > 0) {
        var nameCell = selectedRows[0].childNodes[0];
        // Orijinal adi almak icin yildizi siliyoruz
        var roomName = nameCell.innerText.replace('⭐ ', '').trim();
        
        if (window.favoriteRooms.has(roomName)) {
            window.favoriteRooms.delete(roomName);
            favButton.lastChild.innerText = 'Favorite';
            // Eger listeyi temizliyorsak star classini bosalticaz fallback icin
            favButton.firstChild.className = 'icon-star-empty';
        } else {
            window.favoriteRooms.add(roomName);
            favButton.lastChild.innerText = 'Unfav';
            favButton.firstChild.className = 'icon-star';
        }
        
        chrome.storage.local.set({'favoriteRooms': Array.from(window.favoriteRooms)});
        highlightFavoriteRooms();
    } else {
        if (window.showVexaAlert) {
            window.showVexaAlert('Notice', 'You must select a room first');
        }
    }
}

function createFavoriteButton() {
    var el = document.documentElement.getElementsByClassName("gameframe")[0];
    if(!el || !el.contentWindow) return;
    
    var doc = el.contentWindow.document;
    
    // Zaten varsa iki kere ekleme
    if(doc.querySelector('button[data-hook="favRoom"]')) return;

    var favButton = document.createElement('button');
    favButton.setAttribute('data-hook', 'favRoom');
    favButton.onclick = function () { toggleFavoriteRoom(); };
    
    var icon = document.createElement('i');
    icon.className = 'icon-star-empty';
    favButton.appendChild(icon);
    
    var div = document.createElement('div');
    div.append('Favorite');
    favButton.appendChild(div);

    var insertPos = doc.querySelector('button[data-hook="autoJoin"]');
    if (!insertPos) {
        insertPos = doc.querySelector('button[data-hook="create"]');
    }
    
    if (insertPos && insertPos.parentNode) {
        insertPos.parentNode.insertBefore(favButton, insertPos.nextSibling);

        // Filter button
        var filterButton = document.createElement('button');
        filterButton.setAttribute('data-hook', 'favFilter');
        filterButton.onclick = function () { 
            window.showOnlyFavorites = !window.showOnlyFavorites;
            filterButton.lastChild.innerText = window.showOnlyFavorites ? 'Show All' : 'Filter Favs';
            filterButton.firstChild.className = window.showOnlyFavorites ? 'icon-globe' : 'icon-star';
            highlightFavoriteRooms();
        };

        var filterIcon = document.createElement('i');
        filterIcon.className = 'icon-star';
        filterButton.appendChild(filterIcon);

        var filterDiv = document.createElement('div');
        filterDiv.append('Filter Favs');
        filterButton.appendChild(filterDiv);

        insertPos.parentNode.insertBefore(filterButton, insertPos.nextSibling.nextSibling);

        // Update button status when clicking another room
        var tbody = doc.querySelector('tbody');
        if (tbody) {
            tbody.addEventListener('click', function(e) {
                // Let the native click process first
                setTimeout(() => {
                    var selectedRows = doc.querySelectorAll('tr.selected');
                    if(selectedRows.length > 0) {
                        var roomName = selectedRows[0].childNodes[0].innerText.replace('⭐ ', '').trim();
                        if(window.favoriteRooms.has(roomName)) {
                            favButton.lastChild.innerText = 'Unfav';
                            favButton.firstChild.className = 'icon-star';
                        } else {
                            favButton.lastChild.innerText = 'Favorite';
                            favButton.firstChild.className = 'icon-star-empty';
                        }
                    }
                }, 50);
            });
        }
    }
    
    // Init the observe loop
    initFavRoomObserver();
}

function highlightFavoriteRooms() {
    var el = document.documentElement.getElementsByClassName("gameframe")[0];
    if (!el || !el.contentWindow) return;
    
    var doc = el.contentWindow.document;
    var rows = doc.querySelectorAll('tbody tr');
    
    // Disconnect observer to avoid infinite infinite loops
    if (window.favRoomsObserver) window.favRoomsObserver.disconnect();

    rows.forEach(row => {
        var nameCell = row.childNodes[0];
        if (!nameCell) return;
        
        var rawName = nameCell.innerText.replace('⭐ ', '').trim();
        
        if (window.favoriteRooms.has(rawName)) {
            if (row.style.display === 'none') row.style.display = '';
            if (row.style.backgroundColor !== 'rgb(30, 36, 34)') row.style.backgroundColor = '#1e2422'; 
            if (nameCell.style.color !== 'rgb(255, 215, 0)') nameCell.style.color = '#ffd700'; 
            if (nameCell.style.fontWeight !== 'bold') nameCell.style.fontWeight = 'bold';
            
            if (!nameCell.innerText.includes('⭐')) {
                nameCell.innerText = '⭐ ' + rawName;
            }
        } else {
            if (window.showOnlyFavorites) {
                if (row.style.display !== 'none') row.style.display = 'none';
            } else {
                if (row.style.display === 'none') row.style.display = '';
                if (row.style.backgroundColor !== '') row.style.backgroundColor = '';
                if (row.style.fontWeight !== '') row.style.fontWeight = '';
                if (nameCell.style.color !== '') nameCell.style.color = '';
                if (nameCell.innerText.includes('⭐')) {
                    nameCell.innerText = rawName;
                }
            }
        }
    });

    // Re-observe
    var tbody = doc.querySelector('tbody');
    if (tbody && window.favRoomsObserver) {
        window.favRoomsObserver.observe(tbody, { childList: true, subtree: true });
    }
}

function initFavRoomObserver() {
    var el = document.documentElement.getElementsByClassName("gameframe")[0];
    if(!el || !el.contentWindow) return;
    
    var doc = el.contentWindow.document;
    var tbody = doc.querySelector('tbody');
    
    if (tbody) {
        if(window.favRoomsObserver) {
            window.favRoomsObserver.disconnect();
        }
        window.favRoomsObserver = new MutationObserver(highlightFavoriteRooms);
        window.favRoomsObserver.observe(tbody, { childList: true, subtree: true });
        highlightFavoriteRooms();
    }
}
