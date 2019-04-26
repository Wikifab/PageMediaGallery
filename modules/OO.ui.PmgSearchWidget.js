/**
 * SearchWidgets combine a {@link OO.ui.TextInputWidget text input field}, where users can type a search query,
 * and a menu of search results, which is displayed beneath the query
 * field. Unlike {@link OO.ui.mixin.LookupElement lookup menus}, search result menus are always visible to the user.
 * Users can choose an item from the menu or type a query into the text field to search for a matching result item.
 * In general, search widgets are used inside a separate {@link OO.ui.Dialog dialog} window.
 *
 * Each time the query is changed, the search result menu is cleared and repopulated. Please see
 * the [OOUI demos][1] for an example.
 *
 * [1]: https://doc.wikimedia.org/oojs-ui/master/demos/#SearchInputWidget-type-search
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {string|jQuery} [placeholder] Placeholder text for query input
 * @cfg {string} [value] Initial query value
 */
OO.ui.PmgSearchWidget = function VeUiPmgSearchWidget( config ) {
	// Configuration initialization
	config = config || {};

	// Parent constructor
	OO.ui.PmgSearchWidget.parent.call( this, config );

	// Properties
	this.itemCache = {};
	this.rowHeight = 100;
	this.query = new OO.ui.TextInputWidget( {
		icon: 'search',
		placeholder: config.placeholder,
		value: config.value
	} );
	this.results = new OO.ui.SelectWidget();
	this.$query = $( '<div>' );
	this.$results = $( '<div>' );

	this.hasRunningRequest = false;
	this.runningRequestQuery = false;
	this.queuedRequestQuery = false;

	this.onlyOwnImages = config.onlyOwnImages;

	// Events
	this.query.connect( this, {
		change: 'onQueryChange',
		enter: 'onQueryEnter'
	} );
	this.query.$input.on( 'keydown', this.onQueryKeydown.bind( this ) );

	this.loadMoreControl = new OO.ui.Element( {
		classes: [ 'loadMoreControl', 'center' ]
	} );
	var loadMoreButton = new OO.ui.ButtonWidget( {
		label: mw.msg('pmg-load-more-results'),
		classes: [ 'loadMoreButton' ]
	} );
	this.$loadMoreButton =  loadMoreButton.$element;
	this.loadMoreControl.$element.append( loadMoreButton.$element);
	this.loadMoreControl.$element.hide();

	loadMoreButton.on( 'click', this.onLoadMoreClick.bind( this ) );



	this.$loader = $( '<div>' ).html('<i class="fa fa-spin fa-spinner" />').hide();;
	this.loadMoreControl.$element.append(this.$loader);

	// Initialization
	this.$query
		.addClass( 'oo-ui-searchWidget-query' )
		.append( this.query.$element );
	this.$results
		.addClass( 'oo-ui-searchWidget-results' )
		.append( this.results.$element );
	this.$element
		.addClass( 'oo-ui-searchWidget' )
		.append( this.$results, this.$query );
	this.$results
		.append( this.loadMoreControl.$element );
};

/* Setup */

OO.inheritClass( OO.ui.PmgSearchWidget , OO.ui.Widget );

/* Methods */


OO.ui.PmgSearchWidget.prototype.showLoader = function(results) {

	this.$loadMoreButton.hide();
	this.$loader.show();
	this.loadMoreControl.$element.show();
};
OO.ui.PmgSearchWidget.prototype.hideLoader = function(results) {

	this.$loader.hide();
};
OO.ui.PmgSearchWidget.prototype.enableLoadMore = function(results) {

	// we replace button at the end of results before to show it
	this.$results.append( this.loadMoreControl.$element );
	this.$loadMoreButton.show();
	this.loadMoreControl.$element.show();
};
OO.ui.PmgSearchWidget.prototype.disableLoadMore = function(results) {
	this.loadMoreControl.$element.hide();
};

/**
 * Handle query key down events.
 *
 * @private
 * @param {jQuery.Event} e Key down event
 */
OO.ui.PmgSearchWidget.prototype.onQueryKeydown = function ( e ) {
	var highlightedItem, nextItem,
		dir = e.which === OO.ui.Keys.DOWN ? 1 : ( e.which === OO.ui.Keys.UP ? -1 : 0 );

	if ( dir ) {
		highlightedItem = this.results.findHighlightedItem();
		if ( !highlightedItem ) {
			highlightedItem = this.results.findSelectedItem();
		}
		nextItem = this.results.findRelativeSelectableItem( highlightedItem, dir );
		this.results.highlightItem( nextItem );
		nextItem.scrollElementIntoView();
	}
};

/**
 * Handle select widget select events.
 *
 * Clears existing results. Subclasses should repopulate items according to new query.
 *
 * @private
 * @param {string} value New value
 */
OO.ui.PmgSearchWidget.prototype.onQueryChange = function () {

	this.browseNew();
};

OO.ui.PmgSearchWidget.prototype.browseNew = function () {
	this.results.clearItems();
	this.itemCache = {};
	this.offset = false;
	this.browse();
};

/**
 * Handle select widget enter key events.
 *
 * Chooses highlighted item.
 *
 * @private
 * @param {string} value New value
 */
OO.ui.PmgSearchWidget.prototype.onQueryEnter = function () {
	var highlightedItem = this.results.findHighlightedItem();
	if ( highlightedItem ) {
		this.results.chooseItem( highlightedItem );
	}
};

/**
 * Get the query input.
 *
 * @return {OO.ui.TextInputWidget} Query input
 */
OO.ui.PmgSearchWidget.prototype.getQuery = function () {
	return this.query;
};

/**
 * Get the search results menu.
 *
 * @return {OO.ui.SelectWidget} Menu of search results
 */
OO.ui.PmgSearchWidget.prototype.getResults = function () {
	return this.results;
};


OO.ui.PmgSearchWidget.prototype.browse = function(input) {

	this.showLoader(); //show spinner icon


	this.queuedRequestQuery = this.query.getValue();

	if (this.hasRunningRequest) {
		return;
	}
	this.hasRunningRequest = true;
	this.runningRequestQuery = this.query.getValue();

	var searchWidget = this;

	function success(jsondata) {
		searchWidget.browseRequest(jsondata);
	}
	function error(jsondata) {
		searchWidget.browseError(jsondata);
	}

	// first request to get token
	$.ajax({
		type: "GET",
		url: mw.util.wikiScript('api'),
		data: { action:'query', format:'json',  meta: 'tokens', type:'csrf'},
	    dataType: 'json',
	    success: success,
	    error: error
	});
};

OO.ui.PmgSearchWidget.prototype.onLoadMoreClick = function(jsondata) {
	this.browse();
};

OO.ui.PmgSearchWidget.prototype.browseRequest = function(jsondata) {
	var token = jsondata.query.tokens.csrftoken;
	var data = {};
	data.action = "pagemediagallery_browse";
	data.format = "json";
	data.input = this.query.getValue();
	data.token = token;


	if ( this.onlyOwnImages ) {
		data.owner = true;
	}

	if (this.offset) {
		data.offset = this.offset;
	}

	var searchWidget = this;
	function success(jsondata) {
		searchWidget.browseSuccess(jsondata);
	}

	function error(jsondata) {
		searchWidget.browseError(jsondata);
	}

	$.ajax({
		type: "POST",
		url: mw.util.wikiScript('api'),
		data: data,
	    dataType: 'json',
		success: success,
		error: error
	});
};

OO.ui.PmgSearchWidget.prototype.browseError = function(e) {
	console.log( 'ERROR while browse request' );

	this.queuedRequestQuery = this.query.getValue();

	this.hasRunningRequest = false;
};

OO.ui.PmgSearchWidget.prototype.browseSuccess = function(result) {

	this.hideLoader(); //show spinner icon

	if ( result && result.pagemediagallery_browse ) {
		var results = result.pagemediagallery_browse;

		if (!this.offset) { //if offset, we append the results to the content
			//this.$results.html('');
		}

		if ( results.search ) {
			this.displayResult(results);

		} else {
			this.appendNoMoreResults();
		}

		if ( results.continue && results.continue.offset ) {

			this.offset = results.continue.offset;

			this.enableLoadMore();

		} else {
			this.disableLoadMore();
		}

	}else {
		this.appendNoMoreResults();
	}


	this.queuedRequestQuery = this.query.getValue();

	this.hasRunningRequest = false;
	if ( this.runningRequestQuery != this.queuedRequestQuery) {
		this.browseNew();
	}

};

OO.ui.PmgSearchWidget.prototype.appendNoMoreResults = function() {
	if (this.offset) {
		var div = "<div class='no-more-result'>" + mw.msg('pmg-no-more-match-found') + '</div>';
		//this.$results.append(div);
	} else {
		//this.$results.html( mw.msg('pmg-no-match-found') );
	}
};

OO.ui.PmgSearchWidget.prototype.displayResult = function(results) {

	var pmgSearchWidget = this;

	function isVideo(imageurl) {
		fileExt = imageurl.split('.').pop().toLowerCase();
		videoExtensions = ['mp4','webm', 'mov'];
		if (videoExtensions.indexOf(fileExt) == -1) {
			return false;
		} else {
			return true;
		}
	}

	var i, len, title,
		resultWidgets = [],
		inputSearchQuery = this.query.getValue()
		//queueSearchQuery = this.searchQueue.getSearchQuery()
		;

	/*if ( inputSearchQuery === '' || queueSearchQuery !== inputSearchQuery ) {
		return;
	}*/

	for ( i = 0, len = results.search.length; i < len; i++ ) {
		title = new mw.Title( "File:" + results.search[ i ].filename ).getMainText();
		// Do not insert duplicates
		if ( !Object.prototype.hasOwnProperty.call( this.itemCache, title ) ) {
			this.itemCache[ title ] = true;

			var data = {
					title: "File:" + results.search[ i ].filename ,
					src: results.search[ i ].fileurl,
					url: results.search[ i ].url,
					thumburl: results.search[ i ].thumburl,
					mediatype: results.search[ i ].mime, // TODO : convert mime type to mediatype
					width: results.search[ i ].width,
					height: results.search[ i ].height,
			};

			var resultWidget = new mw.widgets.MediaResultWidget( {
				data: data,
				rowHeight: this.rowHeight,
				maxWidth: this.results.$element.width() / 3,
				minWidth: 30,
				rowWidth: this.results.$element.width()
			} );
			// todo : lazy load should be done only when widget become visible
			resultWidget.lazyLoad();
			resultWidgets.push(resultWidget);
		}
	}
	this.results.addItems( resultWidgets );


/*
	$.each( results.search, function ( index, value ) {
		var $div = $( document.createElement('div') );
		$div.attr('data-imagename', value.filename);
		$div.addClass( 'image' );

		var $file;

		if (isVideo(value.fileurl)) {
			$file = $( document.createElement('video') );
			$div.addClass('videofile');
		} else {
			$file = $( document.createElement('img') );
		}

		$file.attr('src', value.fileurl);
		$file.addClass('file-thumb');
		var $label = $( document.createElement('label') );
		$label.html(value.filename);
		$div.append($file);
		$div.append($label);
		$div.on('click', function() {
			$(this).toggleClass( 'toAddToPage' );
			if ($(this).hasClass('toAddToPage')) {
				$("#addToPage").prop( "disabled", false );
			} else {
				$("#addToPage").prop( "disabled", true );
			}
			MediaManager.window.$modal.find( '.image' ).not($(this)).removeClass('toAddToPage');
		});
		pmgSearchWidget.$results.append($div);
	});*/
};