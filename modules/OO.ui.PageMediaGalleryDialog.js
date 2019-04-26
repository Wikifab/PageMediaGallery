//mediaWiki.pagemediagallery = mediaWiki.pagemediagallery || {};

( function ( $, mw, window, OO ) {

	OO.ui.PageMediaGalleryDialog = function( config ) {
		OO.ui.ProcessDialog.call( this, config );

		this.selectedImageInfo = null;

		if (config.gallery) {
			this.gallery = config.gallery;
		}
	};

	/* inheritance */
	OO.inheritClass( OO.ui.PageMediaGalleryDialog, OO.ui.ProcessDialog );

	OO.ui.PageMediaGalleryDialog.static.name = 'PageMediaGalleryDialog';
	OO.ui.PageMediaGalleryDialog.static.title = 'Media';
	OO.ui.PageMediaGalleryDialog.static.actions = [
		{
			action: 'insert',
			disabled: true,
			label: OO.ui.deferMsg( 'pmg-dialog-action-insert' ),
			flags: [ 'primary', 'progressive' ],
			modes: [ 'search' ]
		},
		{
			action: 'upload',
			label: OO.ui.deferMsg( 'pmg-dialog-media-upload' ),
			flags: [ 'primary', 'progressive' ],
			modes: [ 'upload-upload' ]
		},
		{
			action: 'save',
			label: OO.ui.deferMsg( 'pmg-dialog-media-save' ),
			flags: [ 'primary', 'progressive' ],
			modes: [ 'upload-info' ]
		},
		{
			action: 'cancelupload',
			label: OO.ui.deferMsg( 'pmg-dialog-media-goback' ),
			flags: [ 'safe', 'back' ],
			modes: [ 'upload-info' ]
		},
		{
			label: OO.ui.deferMsg( 'pmg-dialog-action-cancel' ),
			flags: [ 'safe', 'back' ],
			modes: [ 'search', 'upload-upload' ]
		}
	];

	/**
	 * @inheritdoc
	 */
	OO.ui.PageMediaGalleryDialog.prototype.getReadyProcess = function ( data ) {
		return OO.ui.PageMediaGalleryDialog.super.prototype.getReadyProcess.call( this, data )
			.next( function () {
				this.switchPanels( 'search' );
				this.search.browseNew();
				this.searchMyMedia.browseNew();
			}, this );
	};

	OO.ui.PageMediaGalleryDialog.prototype.initialize = function () {

		var pmgd = this;

		// parent's initialize
	    OO.ui.ProcessDialog.prototype.initialize.apply( this, arguments );

	    this.content = new OO.ui.PanelLayout( { padded: true, expanded: true } );

	    this.searchTabs = new OO.ui.IndexLayout();

	    /* Search Panel */

	    this.search = new OO.ui.PmgSearchWidget();

	    this.searchTabs.addTabPanels( [
			new OO.ui.TabPanelLayout( 'search', {
				label: OO.ui.deferMsg( 'pmg-dialog-tabpanel-search' ),
				content: [ this.search ],
				data: { searchWidget: this.search }
			} )
		] );

		this.searchTabs.getTabPanel( 'search' ).connect(this, {
			active: function () {

				var searchWidget = pmgd.searchTabs.getTabPanel( 'search' ).getData().searchWidget;

				if (!searchWidget.getResults().findSelectedItem()) {
					this.actions.setAbilities( { insert: false } );
				} else {
					this.actions.setAbilities( { insert: true } );
				}

				pmgd.actions.setMode( 'search' );

				this.setSize( 'larger' );
			}
		});
		
		this.search.getResults().connect( this, { choose: 'onSearchResultsChoose' } );

		this.search.getQuery().connect( this, { change: 'onQueryChange' });

		this.searchTabs.getTabPanel( 'search' ).$element.append( this.search.$element );

		/* Upload Panel */

		this.mediaUploadBooklet = new mw.PmgTemplateUpload.BookletLayout( { $overlay: this.$overlay } );
		this.mediaUploadBooklet.initialize();

		this.searchTabs.addTabPanels( [
			new OO.ui.TabPanelLayout( 'upload', {
				label: OO.ui.deferMsg( 'pmg-dialog-tabpanel-upload' ),
				content: [ this.mediaUploadBooklet ]
			} )
		] );

		this.searchTabs.getTabPanel( 'upload' ).connect(this, {
			active: function () {
				pmgd.actions.setMode( 'upload-upload' );
				this.setSize( 'medium' );
			}
		});

		this.mediaUploadBooklet.connect( this, {
			set: 'onMediaUploadBookletSet',
			fileUploaded: 'onFileUploaded',
			infoValid: 'onInfoValid',
		});

		this.searchMyMedia = new OO.ui.PmgSearchWidget({ onlyOwnImages: true});

	    this.searchTabs.addTabPanels( [
			new OO.ui.TabPanelLayout( 'search-mymedia', {
				label: OO.ui.deferMsg( 'pmg-dialog-tabpanel-search-mymedia' ),
				content: [ this.searchMyMedia ],
				data: { searchWidget: this.searchMyMedia }
			} )
		] );

		this.searchTabs.getTabPanel( 'search-mymedia' ).connect(this, {
			active: function () {

				var searchWidget = pmgd.searchTabs.getTabPanel( 'search-mymedia' ).getData().searchWidget;

				if (!searchWidget.getResults().findSelectedItem()) {
					this.actions.setAbilities( { insert: false } );
				} else {
					this.actions.setAbilities( { insert: true } );
				}

				pmgd.actions.setMode( 'search' );

				this.setSize( 'larger' );
			}
		});
		
		this.searchMyMedia.getResults().connect( this, { choose: 'onSearchResultsChoose' } );

		this.searchMyMedia.getQuery().connect( this, { change: 'onQueryChange' });

		this.searchTabs.getTabPanel( 'search-mymedia' ).$element.append( this.searchMyMedia.$element );

		// TODO mediaUploadBooklet.connect( this, {
		// 	set: 'onMediaUploadBookletSet',
		// 	uploadValid: 'onUploadValid',
		// 	infoValid: 'onInfoValid',
		// 	fileUploaded: 'onFileUploaded'
		// } );

		// mediaUploadBooklet.connect( this, {
		// 	infoValid: 'onInfoValidCheckName'
		// } );

	    this.content.$element.append( this.searchTabs.$element );
	    this.$body.append( this.content.$element );
	};

	OO.ui.PageMediaGalleryDialog.prototype.onQueryChange = function () {
		this.actions.setAbilities( { insert: false } );
	};

	OO.ui.PageMediaGalleryDialog.prototype.onSearchResultsChoose = function (item, selected) {
		this.actions.setAbilities( { insert: true } );
	};

	OO.ui.PageMediaGalleryDialog.prototype.setGallery = function (gallery) {
		this.gallery = gallery;
	};

	OO.ui.PageMediaGalleryDialog.prototype.getGallery = function (gallery) {
		return this.gallery;
	};

	OO.ui.PageMediaGalleryDialog.prototype.getActionProcess = function ( action ) {

	    var dialog = this;

		switch ( action ) {

			case 'cancelupload':
				handler = function () {
					this.switchPanels( 'upload' );
					this.mediaUploadBooklet.initialize();
					dialog.actions.setMode( 'upload-upload' );
				};
				break;
			case 'upload':
				dialog.actions.setMode( 'upload-info' );
				return new OO.ui.Process( this.mediaUploadBooklet.uploadFile() );
				break;
			case 'save':
				return new OO.ui.Process( this.mediaUploadBooklet.saveFile() );
				break;
			case 'insert':
				handler = function () {

					var currentTabPanelName = this.searchTabs.getCurrentTabPanel().getName();

					var search = currentTabPanelName === 'search-mymedia' ? this.searchMyMedia : this.search;
					// get file info
					var selectedItem = search.getResults().findSelectedItem();
					if (selectedItem) {

						var fileInfo = selectedItem.getData();

						this.insertImage(fileInfo);

						dialog.close( { action: action } );

					} else {
						return new OO.ui.Error( OO.ui.deferMsg( 'pmg-dialog-error-must-select-a-file' ), { recoverable: true } );
					}
				}
				break;
			default:
				return new OO.ui.Process( function () {
		            dialog.close( { action: action } );
		        } );
		}

		return new OO.ui.Process( handler, this );
	};

	OO.ui.PageMediaGalleryDialog.prototype.onFileUploaded = function (  ) {

		this.mediaUploadBooklet.generateFilename(this.mediaUploadBooklet.getFilename());
		return true;
	};

	/**
	 * Handle infoValid events
	 *
	 * @param {boolean} isValid The panel is complete and valid
	 */
	OO.ui.PageMediaGalleryDialog.prototype.onInfoValid = function ( isValid ) {
		this.actions.setAbilities( { save: isValid } );
	};

	OO.ui.PageMediaGalleryDialog.prototype.insertImage = function ( fileInfo ) {

		var fileName = fileInfo.url.substring(fileInfo.url.lastIndexOf('/')+1);
		var img = $('<img>').attr('src', fileInfo.url).addClass('file-thumb');

		if (this.gallery) {
			// add it to the gallery
			this.gallery.addImage(img, fileName);
			this.close( {action : 'insert'});
		} else {
			return new OO.ui.Error( OO.ui.deferMsg( 'pmg-dialog-error-must-select-a-gallery' ), { recoverable: true } );
		}
	};

	/**
	 * Handle panelNameSet events from the upload stack
	 *
	 * @param {OO.ui.PageLayout} page Current page
	 */
	OO.ui.PageMediaGalleryDialog.prototype.onMediaUploadBookletSet = function ( page ) {
		this.uploadPageNameSet( page.getName() );
	};

	/**
	 * The upload booklet's page name has changed
	 *
	 * @param {string} pageName Page name
	 */
	OO.ui.PageMediaGalleryDialog.prototype.uploadPageNameSet = function ( pageName ) {

		var imageInfo;

		if ( pageName === 'insert' ) {
			imageInfo = this.mediaUploadBooklet.upload.getImageInfo();
			
			this.mediaUploadBooklet.initialize();
			this.insertImage(imageInfo);
		}
	};

	/**
	 * Switch between the edit and insert/search panels
	 *
	 * @param {string} panel Panel name
	 * @param {boolean} [stopSearchRequery] Do not re-query the API for the search panel
	 */
	OO.ui.PageMediaGalleryDialog.prototype.switchPanels = function ( panel ) {
		var dialog = this;
		switch ( panel ) {
			case 'search':
				this.setSize( 'larger' );
				this.selectedImageInfo = null;
				this.searchTabs.setTabPanel( 'search' );
				this.actions.setMode( 'search' );
				break;
			case 'upload':
				this.setSize( 'medium' );
				this.searchTabs.setTabPanel( 'upload' );
				this.actions.setMode( 'upload' );
				break;
			default:
		}

		this.currentPanel = panel;
	};

	OO.ui.PageMediaGalleryDialog.prototype.getBodyHeight = function() {
		return 500;
	};

	// mw.pagemediagallery.Browsertab = function( config ) {

	// 	/* TODO what do we need to change here ? */
	// 	// onlyOwnImages = typeof onlyOwnImages !== 'undefined' ? onlyOwnImages : false;

	// 	// this.containerId = containerId;
	// 	// this.container = $('#' + containerId);
	// 	// this.contentBody = this.container.find('.search-content-body');
	// 	// this.onlyOwnImages = onlyOwnImages;
	// }

	// mw.pagemediagallery.browsertab.prototype.init = function(config) {

	// 	/* TODO what to do here ? */

	// 	// var browsertab = this;

	// 	// this.offset = 0;

	// 	// this.container.find('.querymediainput').off('input').on('input', function (e) {
	// 	// 	browsertab.contentBody.html(''); //empty content
	// 	// 	browsertab.offset =  0 ;
	// 	// 	browsertab.browse( e.target.value );
	// 	// });

	// 	// this.browse( this.getInputValue() );

	// }

	// mw.pagemediagallery.browsertab.prototype.getInputValue = function() {
	// 	return this.container.find('.querymediainput')[0].value;
	// }

	// mw.pagemediagallery.browsertab.prototype.browse = function(input) {

	// 	this.container.find('.load-more-content-spinner' ).show(); //show spinner icon

	// 	var browsertab = this;
	// 	function success(jsondata) {
	// 		browsertab.browseRequest(jsondata);
	// 	}

	// 	// first request to get token
	// 	$.ajax({
	// 		type: "GET",
	// 		url: mw.util.wikiScript('api'),
	// 		data: { action:'query', format:'json',  meta: 'tokens', type:'csrf'},
	// 	    dataType: 'json',
	// 	    success: success
	// 	});
	// }

	// mw.pagemediagallery.browsertab.prototype.browseRequest = function(jsondata) {
	// 	var token = jsondata.query.tokens.csrftoken;
	// 	var data = {};
	// 	data.action = "pagemediagallery_browse";
	// 	data.format = "json";
	// 	data.input = this.getInputValue();
	// 	data.token = token;

	// 	if ( this.onlyOwnImages ) {
	// 		data.owner = true;
	// 	}

	// 	if (this.offset) {
	// 		data.offset = this.offset;
	// 	}

	// 	var browsertab = this;
	// 	function success(jsondata) {
	// 		browsertab.browseSuccess(jsondata);
	// 	}

	// 	function error(jsondata) {
 // 			browsertab.browseError(jsondata);
	// 	}

	// 	$.ajax({
	// 		type: "POST",
	// 		url: mw.util.wikiScript('api'),
	// 		data: data,
	// 	    dataType: 'json',
	// 		success: success,
	// 		error: this.browseError
	// 	});
	// }

	// mw.pagemediagallery.browsertab.prototype.browseSuccess = function(result) {

	// 	this.container.find('.load-more-content-spinner' ).hide();

	// 	if ( result && result.pagemediagallery_browse ) {
	// 		var results = result.pagemediagallery_browse;

	// 		if (!this.offset) { //if offset, we append the results to the content
	// 			this.container.find('.search-content-body').html('');
	// 		}

	// 		if ( results.search ) {
	// 			this.displayResult(results);

	// 		} else {
	// 			this.appendNoMoreResults();
	// 		}

	// 		if ( results.continue && results.continue.offset ) {

	// 			this.offset = results.continue.offset;

	// 			this.addScrollEvent();

	// 		} else {
	// 			this.disableScrollEvent();
	// 		}

	// 	}else {
	// 		this.appendNoMoreResults();
	// 	}
	// }

	// mw.pagemediagallery.browsertab.prototype.browseError = function(e) {
	// 	console.log( mw.msg('pmg-error-encountered') );
	// }


	// mw.pagemediagallery.browsertab.prototype.addScrollEvent = function() {

	// 	var $searchcontent = this.container.find('.search-content');
	// 	var $searchcontentbody = this.contentBody;
	// 	var browsertab = this;
	// 	$searchcontent.off('scroll').on('scroll', function() {

	// 	    if( parseInt( $searchcontent.scrollTop() + $searchcontent.height() ) == parseInt( $searchcontentbody.outerHeight( true ) + browsertab.container.find( '.load-more-content' ).outerHeight( true ) ) ) {

	// 	    	browsertab.container.find('.load-more-content-spinner' ).show();

	// 			browsertab.browse(browsertab.input);
	// 	    }
	// 	});
	// }

	// mw.pagemediagallery.browsertab.prototype.disableScrollEvent = function() {
	// 	$searchcontent = this.container.find('.search-content');
	// 	$searchcontent.off('scroll');
	// }

	// mw.pagemediagallery.browsertab.prototype.appendNoMoreResults = function() {
	// 	if (this.offset) {
	// 		var div = "<div class='no-more-result'>" + mw.msg('pmg-no-more-match-found') + '</div>';
	// 		this.contentBody.append(div);
	// 	} else {
	// 		this.contentBody.html( mw.msg('pmg-no-match-found') );
	// 	}
	// }

	// mw.pagemediagallery.browsertab.prototype.displayResult = function(results) {

	// 	var browsertab = this;

	// 	function isVideo(imageurl) {
	// 		fileExt = imageurl.split('.').pop().toLowerCase();
	// 		videoExtensions = ['mp4','webm', 'mov'];
	// 		if (videoExtensions.indexOf(fileExt) == -1) {
	// 			return false;
	// 		} else {
	// 			return true;
	// 		}
	// 	}

	// 	$.each( results.search, function ( index, value ) {
	// 		var $div = $( document.createElement('div') );
	// 		$div.attr('data-imagename', value.filename);
	// 		$div.addClass( 'image' );

	// 		var $file;

	// 		if (isVideo(value.fileurl)) {
	// 			$file = $( document.createElement('video') );
	// 			$div.addClass('videofile');
	// 		} else {
	// 			$file = $( document.createElement('img') );
	// 		}

	// 		$file.attr('src', value.fileurl);
	// 		$file.addClass('file-thumb');
	// 		var $label = $( document.createElement('label') );
	// 		$label.html(value.filename);
	// 		$div.append($file);
	// 		$div.append($label);
	// 		$div.on('click', function() {
	// 			$(this).toggleClass( 'toAddToPage' );
	// 			if ($(this).hasClass('toAddToPage')) {
	// 				$("#addToPage").prop( "disabled", false );
	// 			} else {
	// 				$("#addToPage").prop( "disabled", true );
	// 			}
	// 			MediaManager.window.$modal.find( '.image' ).not($(this)).removeClass('toAddToPage');
	// 		});
	// 		browsertab.contentBody.append($div);
	// 	});
	// }

})( jQuery, mediaWiki, window, OO );