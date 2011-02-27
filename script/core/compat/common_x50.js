// Name: common x50
// Description: Code shared between 350/650/950 models
//
// Credits:
//	Keyboard popup chars code discovered and harnessed by Mark Nord
//
// Receives the following parameters: 
//		Core, bootLog, loadCore, loadAddons, getFileContent, compatPath, langNodeIndex, keyboardNodeIndex
//	optional parameters:
//		fixTimeZones 
//
// History:
//	2011-02-26 kartu - Initial version, merged from 350/950 code
//		Added Belorussian / Ukranian chars (as popups) to keyboard
//		Fixed doRotation aciton
//		Fixed #66 x50: Collection editing broken, if collection node is not in the 4th slot
//
tmp = function() {
	var localizeKeyboardPopups, updateSiblings, localize, localizeKeyboard, oldSetLocale, 
		oldChangeKeyboardType, oldReadPreference, oldCallback, makeRootNodesMovable;

	// doRotate is missing in x50 kbook, easy workaround not to change StandardActions
	kbook.model.doRotate = function() {
		this.container.bubble('onEnterOrientation');
	};
	
	// Localize "popup" keyboard, that shows after holding button for a couple of secs
	localizeKeyboardPopups = function() {
		var keyboardLayout, oldIsSelectChar, oldSetPopupChar, SEL_CHARS;
		
		keyboardLayout = Fskin.kbookKeyboard.keyboardLayout;
		oldIsSelectChar =  keyboardLayout.isSelectChar;
		oldSetPopupChar = keyboardLayout.setPopupChar;
		
		SEL_CHARS = {
			"и": ["и", "і", "ї"], 
			"у": ["у", "ў"], 
			"е": ["е", "ё", "е", "є"], 
			"г": ["г", "ґ"], 
			"ъ": ["ъ", "'"],
			"И": ["И", "І", "Ї"], 
			"У": ["У", "Ў"], 
			"Е": ["Е", "Ё", "Е", "Є"], 
			"Г": ["Г", "Ґ"], 
			"Ъ": ["Ъ", "'"]		
		};
		
		keyboardLayout.isSelectChar = function(key) {
			if (SEL_CHARS[key] !== undefined) {
				return true;
			}
			return oldIsSelectChar.apply(this, arguments);
		};
		
		keyboardLayout.setPopupChar = function (text, popup) {
			var chars, i, n;
			chars = SEL_CHARS[text];
			if (chars !== undefined) {
				n = chars.length;
				for (i = 0; i < 8; i++) {
					popup["addkey" + i].setText(i < n ? chars[i] : "");
				}
				return n;
			}
			return oldIsSelectChar.apply(this, arguments);
		};
	};
	
	// Updates node siblings (used for setting selected / unselected icon)
	updateSiblings = function(fieldName) {
		// find currently selected node
		var nodes, i, n, idx, tmpKind;

		try {		
			nodes = this.parent.nodes;
			for (i = 0, n = nodes.length; i < n; i++) {
				if (kbook.model[fieldName] === nodes[i].tag) {
					idx = i;
					break;
				}
			}
			
			kbook.model[fieldName] = this.tag;
			kbook.model.writeFilePreference();
			
			// swap node kinds of this node and previously selected node
			if (idx !== undefined) {
				tmpKind = this.kind;
				this.kind = nodes[idx].kind;
				nodes[idx].kind = tmpKind;
			}
			
		} catch (e) {
			bootLog("In updateSiblings " + e);
		}
	};
	
	localize = function(Core) {
		try {
			var i, n, currentLang, settingsNode, langNode, languages, langNames, enter, 
				node, prspLanguages, langFile, icon;
			currentLang = kbook.model.language;
			settingsNode = kbook.root.getSettingsRootNode();
			// Fix settings node 
			settingsNode.multiPage = true;
			
			languages = ["de", "en", "es", "fr", "it", "nl", "pt", "ru"];
			prspLanguages = {
				de: "German.js",
				en: "English.js",
				es: "Spanish.js",
				fr: "French.js",
				it: "Italian.js",
				nl: "English.js", // missing Dutch PRS+ translation
				pt: "English.js", // missing Portuguese PRS+ translation
				ru: "Russian.js"
			};
			langNames = {
				de: "Deutsch", 
				en: "English",
				es: "Español",
				fr: "Français", 
				it: "Italiano",
				nl: "Nederlands",
				pt: "Português",
				ru: "Русский"
			};
			
			// Load core js		
			loadCore();
			
			// Load PRS+ strings
			langFile = Core.config.corePath + "lang/" + prspLanguages[currentLang];
			Core.lang.init(langFile);

			// FIXME localize date strings
			for (i = 0, n = languages.length; i < n; i++) {
				if (!Date.prototype.strings[languages[i]]) {
					Date.prototype.strings[languages[i]] = xs.newInstanceOf(Date.prototype.strings.en);
					Number.prototype.strings[languages[i]] = xs.newInstanceOf(Number.prototype.strings.en);
				}
			}
	
			// Custom language node
			langNode = Core.ui.createContainerNode({
				title: "fskin:/l/strings/STR_NODE_TITLE_LANG_SETTINGS".idToString(),
				icon: "LANGUAGE",
				comment: function() {
					return langNames[kbook.model.language];
				},
				parent: settingsNode
			});
			try {
				// Hook comment field
				kbook.commentField.format = function (item, name) {
					if (item && '_mycomment' in item) {
						if ((typeof item._mycomment) === "function") {
							try {
								return item._mycomment();
							} catch (e) {
								return "<error calling _mycomment>";
							}
						} else {
							return item._mycomment;
						}
					} else if (item && 'comment' in item) {
						return item.comment;
					}
				};
			} catch (e) {
				bootLog("error hooking commendField.format function");
			}
			
			// Enter function for language children, changes locale and moves to parent
			enter = function() {
				try {
					// TODO use update
					
					// find currently selected node
					var nodes, i, n, idx, tmpKind;
					nodes = this.parent.nodes;
					for (i = 0, n = nodes.length; i < n; i++) {
						if (kbook.model.language === nodes[i].tag) {
							idx = i;
							break;
						}
					}
					
					// Code from kbook.xsb
					Fskin.localize.setLocale({language: this.tag, region: "XX"});
					kbook.model.language = this.tag;
					kbook.model.clearTitleSorters();
					kbook.root.update(kbook.model);
					kbook.model.writeFilePreference();
					this.parent.gotoParent(kbook.model);
					
					// swap node kinds of this node and previously selected node
					if (idx !== undefined) {
						tmpKind = this.kind;
						this.kind = nodes[idx].kind;
						nodes[idx].kind = tmpKind;
					}
					
					// TODO localize
					Core.ui.showMsg("Requires restart");					
				} catch (e) {
					bootLog("changing language", e);
				}
			};
			
			// Create language node's children
			for (i = 0, n = languages.length; i < n; i++) {
				if (kbook.model.language ===  languages[i]) {
					icon = "CHECKED";
				} else {
					icon = "UNCHECKED";
				}
				node = Core.ui.createContainerNode({
						title: langNames[languages[i]],
						icon: icon,
						parent: langNode,
						comment: ""
				});
				node.tag = languages[i];
				node.enter = enter;
				if (currentLang === languages[i]) {
					node.selected = true;
				}
				langNode.nodes.push(node);
			}
			
			// Replace "language" node with custom node
			settingsNode.nodes[0].nodes[langNodeIndex] = langNode;
			
			try {
				localizeKeyboard(Core);
			} catch (e0) {
				bootLog("Error localizing keyboard  " + e0);
			}
			
			try {
				if (typeof fixTimeZones === "function") {
					fixTimeZones(Core);
				}
			} catch (e1) {
				bootLog("Error fixing timezones " + e1);
			}

			// self destruct :)
			localize = null;
		} catch (e2) {
			bootLog("error in localize " + e2);
		}
	};
	// Init language related stuff once setLocale was called and strings were loaded
	oldSetLocale = Fskin.localize.setLocale;
	Fskin.localize.setLocale = function() {
		try {
			oldSetLocale.apply(this, arguments);
			// restore "old" set locale
			Fskin.localize.setLocale = oldSetLocale;
			
			localize(Core);
		} catch (e) {
			bootLog("in overriden setLocale " + e);
		}
	};
	
	// Keyboard related stuff
	localizeKeyboard = function (Core) {
		var i, n, node, advancedSettingsNode, keyboardNode, keyboardTypes, keyboardNames, enter, icon;
		keyboardTypes = [
				"English-US", 
				"English-UK", 
				"French-France", 
				"French-Canada",
				"German-Germany", 
				"Dutch-Netherlands",
				"Spanish-Spain", 
				"Italian-Italy",
				"Portuguese-Portugal",				
				"Georgian", 
				"Russian",
				"Russian-Phonetic"
		];
		keyboardNames = {
			"German-Germany": "Deutsch",
			"Spanish-Spain": "Español", 
			"French-France": "Français",
			"French-Canada": "Français canadien",
			"Italian-Italy": "Italiano",
			"Georgian": "ქართული",
			"Dutch-Netherlands": "Nederlands",
			"Portuguese-Portugal": "Português",				
			"Russian": "Русская",
			"Russian-Phonetic": "Русская (яверты)",
			"English-UK": "United Kingdom",
			"English-US": "United States"
		};
		advancedSettingsNode = (kbook.root.getSettingsRootNode()).nodes[0];
	
		
		// Enter function for keyboard children, changes keyboard and moves to parent
		enter = function() {
			updateSiblings.call(this, "keyboard");
			this.parent.gotoParent(kbook.model);			
		};	
		
		// Custom keyboard node
		keyboardNode = Core.ui.createContainerNode({
			title: "fskin:/l/strings/STR_UI_NODE_TITLE_KEYBOARD".idToString(),
			icon: "KEYBOARD",
			comment: function() {
				return keyboardNames[kbook.model.keyboard];
			},
			parent: advancedSettingsNode
		});
		
		// Create language node's children
		for (i = 0, n = keyboardTypes.length; i < n; i++) {
			if (kbook.model.keyboard ===  keyboardTypes[i]) {
				icon = "CHECKED";
			} else {
				icon = "UNCHECKED";
			}
			node = Core.ui.createContainerNode({
					title: keyboardNames[keyboardTypes[i]],
					icon: icon,
					parent: keyboardNode
			});
			node.tag = keyboardTypes[i];
			node.enter = enter;
			keyboardNode.nodes.push(node);
		}	
		
		advancedSettingsNode.nodes[keyboardNodeIndex] = keyboardNode;
	
		// self destruct :)	
		localizeKeyboard = null;
	};

	oldChangeKeyboardType = Fskin.kbookKeyboard.keyboardLayout.changeKeyboardType;
	Fskin.kbookKeyboard.keyboardLayout.changeKeyboardType = function (langType) {
		var url, path, keyboardPaths;
		try {
			keyboardPaths = {
				"English-US": "KeyboardLayout103P.xml",
				"English-UK": "KeyboardLayout166.xml",
				"French-France": "KeyboardLayout189.xml",
				"French-Canada": "KeyboardLayout445.xml",
				"German-Germany": "KeyboardLayout129.xml",
				"Dutch-Netherlands": "KeyboardLayout143.xml",
				"Spanish-Spain": "KeyboardLayout173.xml", 
				"Italian-Italy": "KeyboardLayout142.xml",
				"Portuguese-Portugal": "KeyboardLayout275.xml",
				"Russian": "languages/KeyboardLayoutRussian.xml",
				"Russian-Phonetic": "languages/KeyboardLayoutRussianPhonetic.xml",
				"Georgian": "languages/KeyboardLayoutGeorgian.xml"
			};
			path = System.applyEnvironment('[keyboardLayoutPath]') ;
			url = 'file://' + path + keyboardPaths[langType] ;
			this.layoutData = null;
			this.setURI(url);
		} catch (e) {
			// call the default version
			oldChangeKeyboardType.apply(this, arguments);
		}
	};
	
	// Init core here
	oldReadPreference = kbook.model.readPreference;
	kbook.model.readPreference = function() {
		try {
			oldReadPreference.apply(this, arguments);
			// restore "old" readPreference
			kbook.model.readPreference = oldReadPreference;
			
			loadAddons();
			Core.init();
		} catch (e) {
			bootLog("in overriden readPreference " + e);
		}
	};
	
	oldCallback = FskCache._diskSource.synchronizeCallback;
	FskCache._diskSource.synchronizeCallback = function() {
		try {
			if (Core && Core.config && Core.config.disableCardScan) {
				this.target.synchronizedSource();
				this.target.synchronizeDone();
				this.stack.pop();
			} else {
				oldCallback.apply(this, arguments);
			}
		} catch (e) {
			bootLog("Error in callback: " + e);
			oldCallback.apply(this, arguments);
		}
	};

	// Fix sorting (unicode order)
	var compareStrings =  Core.config.compat.compareStrings;
	String.prototype.localeCompare = function(a) {
		return compareStrings(this.valueOf(), a);
	};
	
	// Allow menu customization
	// Kinoma's code is hardcoded with references to periodicals / collections / all notes	
	makeRootNodesMovable = function() {
		var getComment, getKind, periodicalsNode, collectionsNode, notesNode;

		// Save references to periodicals / collections / allNotes
		periodicalsNode = kbook.root.getDeviceRootNode().getNode(2);
		collectionsNode = kbook.root.getDeviceRootNode().getNode(3);
		notesNode = kbook.root.getDeviceRootNode().getNode(4);
		periodicalsNode.kind = 66; // has no kind by default
		periodicalsNode.separator = 0; // remove separator line
		
		// Helper functions
		getComment = function (node) {
			if (typeof node.shortComment === "function") {
				return node.shortComment();
			}
			return kbook.commentField.format(node);
		};
		getKind = function (node, defVal) {
			if (node.homelargekind) {
				return node.homelargekind;
			}
			return defVal;
		};
		
		// Fix get<Node> functions
		kbook.root.getPeriodicalListNode = function () {
			return periodicalsNode;
		};
		kbook.root.getCollectionsNode = function () {
			return collectionsNode;
		};
		kbook.root.getAllNotesNode = function () {
			return notesNode;
		};
		
		// Fix goto<Node> functions
		kbook.model.doGoToPeriodicalList = function () {
			this.currentNode.gotoNode(kbook.root.getDeviceRootNode().getNode(2), this);
		};
		kbook.model.doGoToCollections = function () {
			this.currentNode.gotoNode(kbook.root.getDeviceRootNode().getNode(3), this);
		};
		kbook.model.doGoToAllNotes = function () {
			this.currentNode.gotoNode(kbook.root.getDeviceRootNode().getNode(4), this);
		};
		
		// Fixing hardcoded periodicals / collections / notes
		kbook.model.updateDeviceRoot = function (node) {
			var n, continueTitle, continueAuthor, continueDate, middleItemKind, middleItemTitle, middleItemComment, leftItemKind, leftItemTitle, leftItemComment, centerItemKind, centerItemTitle, centerItemComment, rightItemKind, rightItemTitle, rightItemComment, homeView;
			this.setHomeCover(node);
			kbook.menuHomeThumbnailBookData.setNode(kbook.root.getBookThumbnailsNode());
			continueTitle = this.getContinueComment(node);
			continueAuthor = this.getContinueAuthor(node);
			continueDate = this.getContinueDate(node);
			middleItemKind = this.getBooksKind(node);
			middleItemTitle = this.getBooksTitle(node);
			middleItemComment = this.getBooksComment(node);
			
			n = node.nodes[2];
			leftItemKind = getKind(n, 0);
			leftItemTitle = n.title;
			leftItemComment = getComment(n);
			
			n = node.nodes[3];
			centerItemKind = getKind(n, 2);
			centerItemTitle = n.title;
			centerItemComment = getComment(n);
			
			n = node.nodes[4];
			rightItemKind = getKind(n, 3);
			rightItemTitle = n.title;
			rightItemComment = getComment(n);
			
			homeView = this.container.findContent('MENU_HOME');
			this.setParticularVariable(homeView, 'CONTINUE_TITLE', continueTitle);
			this.setParticularVariable(homeView, 'CONTINUE_AUTHOR', continueAuthor);
			this.setParticularVariable(homeView, 'CONTINUE_DATE', continueDate);
			this.setParticularVariable(homeView, 'MIDDLE_ITEM_KIND', middleItemKind);
			this.setParticularVariable(homeView, 'MIDDLE_ITEM_NAME', middleItemTitle);
			this.setParticularVariable(homeView, 'MIDDLE_ITEM_COMMENT', middleItemComment);
			this.setParticularVariable(homeView, 'MIDDLE_ITEM_NAME_COMMENT', middleItemTitle + '||' + middleItemComment);
			this.setParticularVariable(homeView, 'LEFT_ITEM_KIND', leftItemKind);
			this.setParticularVariable(homeView, 'LEFT_ITEM_NAME', leftItemTitle);
			this.setParticularVariable(homeView, 'LEFT_ITEM_COMMENT', leftItemComment);
			this.setParticularVariable(homeView, 'LEFT_ITEM_NAME_COMMENT', leftItemTitle + '||' + leftItemComment);
			this.setParticularVariable(homeView, 'CENTER_ITEM_KIND', centerItemKind);
			this.setParticularVariable(homeView, 'CENTER_ITEM_NAME', centerItemTitle);
			this.setParticularVariable(homeView, 'CENTER_ITEM_COMMENT', centerItemComment);
			this.setParticularVariable(homeView, 'CENTER_ITEM_NAME_COMMENT', centerItemTitle + '||' + centerItemComment);
			this.setParticularVariable(homeView, 'RIGHT_ITEM_KIND', rightItemKind);
			this.setParticularVariable(homeView, 'RIGHT_ITEM_NAME', rightItemTitle);
			this.setParticularVariable(homeView, 'RIGHT_ITEM_COMMENT', rightItemComment);
			this.setParticularVariable(homeView, 'RIGHT_ITEM_NAME_COMMENT', rightItemTitle + '||' + rightItemComment);
		};
	};
	makeRootNodesMovable();

};

try {
	tmp();
} catch (e) {
	bootLog("Error in common X50: " + e);
}