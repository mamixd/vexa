// attach to initial iFrame load
var el = document.getElementsByClassName("gameframe")[0];
var muteAllToggle = false;
var autoJoinObserver;
var refreshCycle;
var myNick;

// for kick/ban buttons
var dblDiv = document.createElement('div');
var dblTxt = document.createTextNode('Double click!');
dblDiv.appendChild(dblTxt);
dblDiv.style = 'visibility: hidden; position: fixed; background-color: #0004';

// wait until the game in iFrame loads, then continue
function waitForElement(selector) {
  return new Promise(function(resolve, reject) {
    var element = document.getElementsByClassName("gameframe")[0].contentWindow.document.querySelector(selector);

    if(element) {
      resolve(element);
      return;
    }

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        var nodes = Array.from(mutation.addedNodes);
        for(var node of nodes) {
          if(node.matches && node.matches(selector)) {
            resolve(node);
            return;
          }
        };
      });
    });

    observer.observe(document.getElementsByClassName("gameframe")[0].contentWindow.document, { childList: true, subtree: true });
  });
}

// chat observer for mute
muted = new Set();
function mutePlayer(name) {
	if (muted.has(name)) {
		muted.delete(name);
	}
	else {
		muted.add(name);
	}
}

// linkify from stackoverflow 1500260
function linkify(text) {
    var urlRegex =/(\b(https?:\/\/|ftp:\/\/|file:\/\/|www\.)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url) {
		if (url.startsWith('www.')) { url = 'http://' + url; }
        return '<a href="' + url + '" target="blank">' + url + '</a>';
    });
}

// clicking for zoom
function simulateClick(item) {
  item.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
  item.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
  item.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}));
  item.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
  item.dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
  item.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  item.dispatchEvent(new Event('change', {bubbles: true}));
  return true;
}

function changeView(viewIndex) {
	if (5 <= viewIndex <= 8) {
		var gameframe = document.getElementsByClassName('gameframe')[0];
		gameframe.contentWindow.document.querySelector('[data-hook="settings"]').click();
		var viewModeToggle = waitForElement('[data-hook="viewmode"]')
		viewModeToggle.then(function (toggle) {
			toggle.selectedIndex = viewIndex;
			simulateClick(toggle);
			closeBtn = waitForElement('[data-hook="close"]');
			closeBtn.then(function (btn) { btn.click() })
		})
	}
}

function record(gameview = true) {
	var gameframe = document.getElementsByClassName('gameframe')[0];
	if (gameview) {
		gameframe.contentWindow.document.querySelector('[data-hook="menu"]').click();
		var recBtn = waitForElement('[data-hook="rec-btn"]');
		recBtn.then(function (btn) { btn.click() });
		gameframe.contentWindow.document.querySelector('[data-hook="menu"]').click();
	}
	else {
		gameframe.contentWindow.document.querySelector('[data-hook="rec-btn"]').click();
	}
}

chatObserver = new MutationObserver( function(mutations) {
	var candidates = mutations.flatMap(x => Array.from(x.addedNodes)).filter(x => x.tagName == 'P');
	var gameframe = document.documentElement.getElementsByClassName("gameframe")[0];
	var bottomSec = gameframe.contentWindow.document.getElementsByClassName('bottom-section')[0];
	var statSec = gameframe.contentWindow.document.getElementsByClassName('stats-view')[0];
	var chatInput = gameframe.contentWindow.document.querySelector('[data-hook="input"]');
	var chatLog = gameframe.contentWindow.document.querySelector('[data-hook="log"]');
	
	// i did in fact lag
	statSec.ondblclick = function () {
		var gameframe = document.documentElement.getElementsByClassName("gameframe")[0];
		var c = gameframe.contentWindow.document.getElementsByClassName('graph')[0].firstChild;
		var ctx = c.getContext("2d");
		var imgData = ctx.getImageData(0, 63, 31, 1);
		var hexString = Array.prototype.map.call(new Uint8Array(imgData.data), x => ('00' + x.toString(16)).slice(-2)).join('');

		var chatInput = gameframe.contentWindow.document.querySelector('[data-hook="input"]');
		chatInput.value = statSec.innerText.replace(/\n/g, ' ') + ' Red bars: ' + (hexString.match(/c13535ff/g) ? hexString.match(/c13535ff/g).length : 0);
		gameframe.contentWindow.document.querySelector('[data-hook="send"]').click()
	}
	
	chatCheck = function(chatLine) {
		if ([...muted].filter(x => chatLine.innerText.startsWith(x + ': ')).length > 0) {
			chatLine.hidden = true;
		}
		else if (muteAllToggle && muteExceptions.filter(x => chatLine.innerText.startsWith(x + ': ')) == 0 && chatLine.className != 'notice') {
			chatLine.hidden = true;
		}
		
		if (chatLine.innerText.startsWith('Game start')) {
			toggleChatOpt();
			toggleChatKb();
		}
		
		chrome.storage.local.get({'haxTransChatConfig' : false},
			function (items) {
				if (items.haxTransChatConfig) { 
					if (chatLine.innerText.startsWith('Game start')) {	
						chatFormat(bottomSec,statSec,chatInput,'absolute');
					}
					else if (chatLine.innerText.startsWith('Game stop')) {	
						bottomSec.removeAttribute('style');
					}
				}
		});
		
		if (!chatLine.processed) {
			chatLine.innerHTML = linkify(chatLine.innerHTML);
		}
		
		chrome.storage.local.get("haxChatTranslation", (items) => {
			if (items.haxChatTranslation) {
				// translation
				if (!chatLine.processed) {
					let chatRowDiv = document.createElement('div');
					chatRowDiv.className = 'chat-row';
					chatLine.parentNode.appendChild(chatRowDiv);
					chatLine.processed = true;
					chatRowDiv.appendChild(chatLine);
					chatLine.style.display = 'inline-block';
					chatLine.style.width = '75%';

					let translateBtn = document.createElement('button');
					translateBtn.innerText = 'Translate';
					translateBtn.className = 'translate-btn';

					// style translate btn
					translateBtn.style.backgroundColor = "#244967";
					translateBtn.style.color = "#fff";
					translateBtn.style.padding = "2px 15px";
					translateBtn.style.margin = "1px";
					translateBtn.style.border = "0";
					translateBtn.style.borderRadius = "5px";
					translateBtn.style.fontFamily = `"Open Sans",sans-serif`;
					translateBtn.style.fontWeight = `700`;
					translateBtn.style.fontSize = `15px`;

					chatLine.originalChatLine = chatLine.innerText;
					chatLine.state = 'original';
					translateBtn.addEventListener('click', function (e) {
						if (chatLine.state == 'translated') {
							chatLine.innerText = chatLine.originalChatLine;
							chatLine.state = 'original';
							translateBtn.innerText = 'Translate';
						}
						else if (chatLine.state == 'original') {
							if (chatLine.translation) chatLine.innerText = chatLine.translation;
							else {
								let senderName;
								let toBeTranslatedText;
								if (chatLine.originalChatLine.indexOf(':') > -1) {
									// player message
									senderName = chatLine.innerText.split(":")[0];
									toBeTranslatedText = chatLine.innerText.split(': ').slice(1).join('');
								} else {
									// bot message (no sender)
									senderName = "";
									toBeTranslatedText = chatLine.innerText;
								}
								translate(toBeTranslatedText).then(translationResult => {
									if (translationResult) {
										chatLine.innerText = senderName + ': ' + translationResult.translation + ' (translated from: ' + translationResult.lang + ')';
										chatLine.translation = chatLine.innerText;
									}
								});
							}
							chatLine.state = 'translated';
							translateBtn.innerText = 'Show Original';
						}
					});
					chatRowDiv.appendChild(translateBtn);
				}

			}
		});
		
		
		// right click to tag
		chatLine.oncontextmenu = function () {
			if (chatLine.innerText.includes(':')) {
				var chatAuthor = chatLine.innerText.split(':')[0].replace(' ', '_');
				if (chatInput.value !== null) {
					chatInput.value += ' @' + chatAuthor + ' ';
				}
				else {
					chatInput.value = '@' + chatAuthor + ' ';
				}
				chatInput.focus();
				return false;
			}
			else if (chatLine.className === 'notice' && chatLine.innerText.match(noticeRe)) {
				var chatAuthor = chatLine.innerText.match(noticeRe)[0].replace(' ', '_');
				if (chatInput.value !== null) {
					chatInput.value += ' @' + chatAuthor + ' ';
				}
				else {
					chatInput.value = '@' + chatAuthor + ' ';
				}
				chatInput.focus();
				return false;
			}
		}
	}
	candidates.forEach(x => chatCheck(x));
})

// text expansion stuffs
RegExp.escape = function(s) {
    return s.replace(/[-\/\\^$*+!?.()[\]{}]/g, '\\$&');
};

var chatShortcuts;
var chatTimer;
var expandRe;
const emojiRe = new RegExp("(" + RegExp.escape(Object.keys(emojiShortcuts).join("|")) + ")", "g");
const noticeRe = RegExp('.*(?= (has joined|was moved))', 'g');

// main observer to detect changes to views
moduleObserver = new MutationObserver(function(mutations) {
	const candidates = mutations.flatMap(x => Array.from(x.addedNodes)).filter(x => x.nodeType === 1);
	
	candidates.forEach(node => {
		const className = typeof node.className === 'string' ? node.className : '';
		const classes = className.split(' ');
		
		// 1. Giriş / Nickname Ekranı
		if (classes.includes("choose-nickname-view")) {
			const nickWait = waitForElement('[data-hook="input"]');
			nickWait.then(function(nicknameInput) { 
				var myNick = "Player";
				var nk = document.querySelector('[data-hook="input"]');
				if(nk!=null) myNick = nk.value;
				
				nicknameInput.addEventListener('input', function() {
					myNick = nicknameInput.value;
				});
				
				muteExceptions = ['humpyhost','Hostinho',myNick];
			});
			
			addonSettingsPopup('choose-nickname-view');
		}
		
		// 2. Oda Listesi
		if (classes.includes("roomlist-view")) {
			
			// RESTORE NAVBAR
			const navBar = document.getElementsByClassName('header')[0];
			if (navBar) {
				navBar.style.height = '45px';
				navBar.style.overflow = 'visible';
				navBar.style.borderBottom = '2px solid #000';
				navBar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
				navBar.setAttribute('id','nothidden'); 
			}

			chrome.storage.local.get({'haxSearchConfig' : true, 'haxAutoJoinConfig' : true, 'haxFavoritesConfig' : true}, function (items) {
				if (items.haxSearchConfig) { createSearch(); }
				if (items.haxAutoJoinConfig) { createButton(); }
				if (items.haxFavoritesConfig && typeof createFavoriteButton === 'function') { createFavoriteButton(); }
			});
			
			const gameframe = document.getElementsByClassName('gameframe')[0];
			const changeNickBtn = gameframe.contentWindow.document.querySelector('[data-hook="changenick"]');
			if (changeNickBtn) {
				const addonSettingsBtn = document.createElement('button');
				const addonSettingsDiv = document.createElement('div');
				const addonSettingsIcon = document.createElement('i');
				
				addonSettingsIcon.className = 'icon-cog';
				addonSettingsBtn.appendChild(addonSettingsIcon);
				addonSettingsDiv.append('Add-on');
				addonSettingsBtn.appendChild(addonSettingsDiv);
				
				addonSettingsBtn.onclick = function () {
					changeNickBtn.click();
					const addonSettingsOpen = waitForElement('[data-hook="add-on"]');
					addonSettingsOpen.then(function (btn) { btn.click() });
				}
				
				changeNickBtn.parentNode.insertBefore(addonSettingsBtn, changeNickBtn);
			}
		}
		
		// 3. Oyun İçi / Maç
		if (className.includes("game-view")) {
			var nk = document.querySelector('[data-hook="input"]');
			if(nk!=null) myNick = nk.value;
			
			muted = new Set();
			muteAllToggle = false;
			const chatWait = waitForElement('[data-hook="log"]');
			chatWait.then(function (chatArea) {
				chatObserver.observe(chatArea, {childList: true, subtree: true});
			});
			
			const gameframe = document.documentElement.getElementsByClassName("gameframe")[0];
			const doc = gameframe.contentWindow.document;
			const bottomSec = doc.getElementsByClassName('bottom-section')[0];
			const statSec = doc.getElementsByClassName('stats-view')[0];
			const chatInput = doc.querySelector('[data-hook="input"]');
			
			if (chatInput) {
				chatInput.placeholder = 'Press key below ESC to toggle chat hide';
				chatInput.addEventListener("keypress", chatListener);
			}
			
			chrome.storage.local.get({'haxTransChatConfig' : false}, function (items) {
				if (items.haxTransChatConfig && bottomSec) { 
					bottomSec.removeAttribute('style');
				}
			});
			
			const inGame = waitForElement('.bar-container');
			inGame.then(function () {
				toggleChatOpt();
				toggleChatKb();
				showTranslateDisclaimer();
				chrome.storage.local.get({'haxTransChatConfig' : false}, function (items) {
					if (items.haxTransChatConfig && bottomSec && statSec && chatInput) { 
						chatFormat(bottomSec, statSec, chatInput, 'absolute');
					}
				});
				
				// Settings & NavBar
				const settingButton = doc.querySelector('[data-hook="settings"]');
				const navBar = document.getElementsByClassName('header')[0];
				if (navBar) {
					navBar.style.transition = 'height 0.3s, border-bottom 0.3s';
				}
				
				if (settingButton) {
					const hideNavBar = document.createElement('button');
					chrome.storage.local.get({'haxHideNavConfig' : true}, function (items) {
						if (items.haxHideNavConfig && navBar) {
							hideNavBar.innerText = 'Show NavBar';
							navBar.style.height = '0px';
							navBar.style.overflow = 'hidden';
							navBar.style.borderBottom = 'none';
							navBar.style.minHeight = '0px';
							navBar.style.boxShadow = 'none';
						} else if (navBar) {
							navBar.setAttribute('id','nothidden'); 
							hideNavBar.innerText = 'Hide NavBar';
							navBar.style.height = '45px';
							navBar.style.overflow = 'visible';
							navBar.style.borderBottom = '2px solid #000';
							navBar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
						}
					});
					
					hideNavBar.onclick = function () {
						const navBar = document.getElementsByClassName('header')[0];
						if (!navBar) return;
						if (navBar.hasAttribute('id')) { 
							navBar.removeAttribute('id');
							navBar.style.height = '0px';
							navBar.style.overflow = 'hidden';
							navBar.style.borderBottom = 'none';
							navBar.style.minHeight = '0px';
							navBar.style.boxShadow = 'none';
							hideNavBar.innerText = 'Show NavBar';
						} else { 
							navBar.style.height = '45px';
							navBar.style.overflow = 'visible';
							navBar.style.borderBottom = '2px solid #000';
							navBar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
							navBar.setAttribute('id','nothidden'); 
							hideNavBar.innerText = 'Hide NavBar';
						}
					}
					
					addonSettingsPopup('game-view');
					if (settingButton.parentNode) settingButton.parentNode.appendChild(hideNavBar);
				}
			});

			// Chat Mute & Shortcuts
			chrome.storage.local.get({'haxMuteConfig' : true}, function (items) {
				if (items.haxMuteConfig && chatInput) {
					const muteAll = document.createElement('button');
					muteAll.style.padding = '5px 10px';
					muteAll.style.width = '80px';
					muteAll.innerText = 'Mute';
					muteAll.onclick = function () { 
						if (muteAllToggle) {
							muteAllToggle = false;
							const chats = doc.querySelector('[data-hook="log"]').getElementsByTagName('p');
							for (let i = 0; i < chats.length; i++) { chats[i].removeAttribute('hidden'); }
							muteAll.innerText = 'Mute';
						} else {
							muteAllToggle = true;
							muteAll.innerText = 'Unmute';
						}
					}
					const dividerDiv = document.createElement('div');
					dividerDiv.style = 'width: 5px';
					chatInput.parentNode.appendChild(dividerDiv);
					chatInput.parentNode.insertBefore(muteAll, chatInput);
				}
			});
			
			chrome.storage.local.get({'haxShortcutConfig' : true}, function (items) {
				if (items.haxShortcutConfig && chatInput) {
					chatInput.addEventListener("keypress", chatListener);
					const emojiDoc = document.createElement('button');
					emojiDoc.style.padding = '5px 10px';
					emojiDoc.innerText = '😊';
					emojiDoc.onclick = function () { chrome.runtime.sendMessage({'type': 'emoji'}) };
					chatInput.parentNode.insertBefore(emojiDoc, chatInput.parentNode.lastChild.previousSibling);
				}
			});
		}

		// 4. Dialog / Popup
		if (classes.includes("dialog")) {
			chrome.storage.local.get({'haxMuteConfig' : true}, function (items) {
				if (items.haxMuteConfig) {
					const popupWait = waitForElement('div.dialog');
					popupWait.then(function (popup) {
						if (!popup || !popup.firstChild) return;
						const name = popup.firstChild.innerText;
						if (name === 'Add-on Settings' || name === 'Choose nickname' || name === 'Leave room?' || name === 'Settings' || name === 'Create Room' || popup.classList.contains('settings-view')) return;
					
					// Admin olmadığımızda "Give Admin" ve "Kick" butonlarını devre dışı bırak
					const gameframe = document.documentElement.getElementsByClassName("gameframe")[0];
					const isAdmin = gameframe && gameframe.contentWindow && 
						(gameframe.contentWindow.document.querySelector("[class$='view admin']") !== null);
					
					if (!isAdmin) {
						const allBtns = popup.querySelectorAll('button');
						allBtns.forEach(btn => {
							const txt = btn.innerText.trim().toLowerCase();
							if (txt === 'give admin' || txt === 'kick') {
								btn.disabled = true;
								btn.style.opacity = '0.3';
								btn.style.pointerEvents = 'none';
								btn.style.cursor = 'not-allowed';
								btn.title = 'Admin değilsiniz';
							}
						});
					}
						
						const muteBtn = document.createElement('button');
						muteBtn.className = 'mb';
						popup.insertBefore(muteBtn, popup.lastChild);
						muteBtn.innerText = muted.has(name) ? 'Unmute' : 'Mute';
						
						muteBtn.onclick = function () { 
							if (muted.has(name)) {
								muted.delete(name);
								muteBtn.innerText = 'Mute';
							} else {
								muted.add(name);
								muteBtn.innerText = 'Unmute';
							}
						}

						const tagBtn = document.createElement('button');
						tagBtn.className = 'tag';
						tagBtn.innerText = '@Mention';
						popup.insertBefore(tagBtn, popup.lastChild);
						tagBtn.onclick = function() {
							const gameframe = document.getElementsByClassName('gameframe')[0];
							const chatInput = gameframe.contentWindow.document.querySelector('[data-hook="input"]');
							const tagName = name.replace(' ', '_');
							if (chatInput) {
								if (chatInput.value !== null) {
									chatInput.value += ' @' + tagName + ' ';
								} else {
									chatInput.value = '@' + tagName + ' ';
								}
								popup.lastChild.click();
								chatInput.focus();
							}
						}
					});
				}
			});
		}
		
		// 5. Team Changes / Notifications
		if (className.match(/^(room-view|player-list-item|notice)/)) {
			const gameframe = document.documentElement.getElementsByClassName("gameframe")[0];
			if (classes.includes('room-view')) {
				const doc = gameframe.contentWindow.document;
				const bottomSec = doc.getElementsByClassName('bottom-section')[0];
				if (bottomSec) bottomSec.removeAttribute('style');

				// RESTORE NAVBAR
				const navBar = document.getElementsByClassName('header')[0];
				if (navBar) {
					navBar.style.height = '45px';
					navBar.style.overflow = 'visible';
					navBar.style.borderBottom = '2px solid #000';
					navBar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
					navBar.setAttribute('id','nothidden'); 
				}

				doc.onkeydown = function (f) {
					if (f.code == 'KeyR') {
						chrome.storage.local.get({'haxRecordHotkey' : false}, function (items) { 
							if (items.haxRecordHotkey && typeof record === 'function') { record(false); }
						});
					}
				}
			}
			
			chrome.storage.local.get({'haxKickBanConfig' : false}, function (items) {
				if (items.haxKickBanConfig && typeof checkForButtons === 'function') {
					const players = gameframe.contentWindow.document.querySelectorAll('[class^=player-list-item]');
					const adminStatus = (gameframe.contentWindow.document.querySelector("[class$='view admin']") !== null);
					players.forEach(x => checkForButtons(x, adminStatus));
				}
			});
			
			chrome.storage.local.get({'haxNotifConfig' : false}, function (items) {
				if (items.haxNotifConfig) {
					const notifOpt = {type: 'basic', title: 'Haxball All-in-one Tool', message: 'You were moved into a team', iconUrl: 'icon.png'};
					if (className.includes('player-list-item')) {
						const playersMoved = mutations.filter(x => x.addedNodes.length > 0 && x.target.parentNode && x.target.parentNode.className && x.target.parentNode.className.match(/[blue|red]$/));
						if (playersMoved.flatMap(x => Array.from(x.addedNodes)).map(x => x.childNodes[1] ? x.childNodes[1].innerText : "").includes(myNick)) {
							chrome.runtime.sendMessage({type: 'team', opt: notifOpt});
						}
					}
					if (classes.includes('notice')) {
						const noticeMsgs = mutations.flatMap(x => Array.from(x.addedNodes)).map(x => x.innerText);
						if (noticeMsgs.some(x => x && x.startsWith(myNick + ' was moved'))) {
							chrome.runtime.sendMessage({type: 'team', opt: notifOpt});
						}
					}
				}
			});
		}
		
		// 6. Highlight
		if (classes.includes('highlight')) {
			chrome.storage.local.get({'haxNotifConfig' : false}, function (items) {
				if (items.haxNotifConfig) {
					const highlightMsg = node.innerText;
					const notifOpt = {type: 'basic', title: 'Haxball All-in-one Tool', message: highlightMsg, iconUrl: 'icon.png'};
					chrome.runtime.sendMessage({type: 'highlight', opt: notifOpt});
				}
			});
		}
		
		// 7. Game State View
		if (classes.includes('game-state-view')) {
			const gameframe = document.documentElement.getElementsByClassName("gameframe")[0];
			const doc = gameframe.contentWindow.document;
			const bottomSec = doc.getElementsByClassName('bottom-section')[0];
			const statSec = doc.getElementsByClassName('stats-view')[0];
			const chatInput = doc.querySelector('[data-hook="input"]');
			
			chrome.storage.local.get({'haxTransChatConfig' : false}, function (items) {
				if (items.haxTransChatConfig && bottomSec && statSec && chatInput) { 
					chatFormat(bottomSec, statSec, chatInput, 'absolute');
				}
			});
			toggleChatOpt();
			toggleChatKb();
		}
		
		// 8. Quick Leave
		if (className === 'dialog basic-dialog leave-room-view') {
			chrome.storage.local.get({'haxQuickLeaveConfig' : false}, function (items) {
				if (items.haxQuickLeaveConfig) {
					const gameframe = document.documentElement.getElementsByClassName("gameframe")[0];
					const leaveBtn = gameframe.contentWindow.document.querySelector('[data-hook="leave"]');
					if (leaveBtn) leaveBtn.click();
				}
			});
		}
	});
});

// where it all begins for view detection
init = waitForElement("div[class$='view']");
init.then(function(value) {
	currentView = value.parentNode;
	moduleObserver.observe(currentView, {childList: true, subtree: true});
});


const TRANSLATE_API = "https://private-api-mkab.onrender.com/haxball/translate";
function translate(text){
	try {
		var transalte_result = postData(TRANSLATE_API, {text: text});
		return transalte_result;
	}
	catch(error) {
		console.log(error);
		return null;
	}
}

async function postData(url = '', data = {}) {
	// Default options are marked with *
	const response = await fetch(url, {
	  method: 'POST',
	  cache: 'no-cache', 
	  cors: 'no-cors',
	  headers: {
		'Content-Type': 'application/json'
	  },
	  body: JSON.stringify(data) 
	});
	return response.json(); 
  }
