window.MediaManager = {

	container: undefined, //secondaryGallery
	isInit: false,
	start: function (container) {
		MediaManager.container = container;

		if (!MediaManager.isInit) {
			this.init();
		}

		MediaManager.window.open();
	},
	reset: function (){
		MediaManager.window.$modal.find('.image').removeClass('toAddToPage');
		$("#addToPage").prop('disabled', true);
		$("a[href=#pmg-search]").click();
		$("[id^=msupload][id$=list]").html("");

		MediaManager.tabs.browser.init();

	},
	init: function (){

		mediamanager = this;

		MediaManager.tabs.browser = new mw.pagemediagallery.browsertab('pmg-search');
		MediaManager.tabs.browser.init();

		MediaManager.tabs.myMedia = new mw.pagemediagallery.browsertab('myMedia', true);
		MediaManager.tabs.myMedia.init();
		
		MediaManager.tabs.uploader.init();

		$("#addToPage").off().on('click', function() {
			MediaManager.addToPage();
		});

		$('[href="#pmg-search"]').on('click', function() {
			MediaManager.window.$modal.find('#pmg-search .search-content-body').html('');
			MediaManager.tabs.browser.init();
		});

		$('[href="#myMedia"]').on('click', function() {
			MediaManager.window.$modal.find('#myMedia .search-content-body').html('');
			MediaManager.tabs.myMedia.init();
		});

		MediaManager.isInit = true;
	},
	addToPage: function (){
		var $toAddToPage = $(MediaManager.window.$modal.find('.toAddToPage')[0]);
		var file = $($toAddToPage.find('.file-thumb')[0]).clone();
		var fileName = '';
		if ($toAddToPage[0].hasAttribute('data-imagename')) {
			fileName = $toAddToPage.data('imagename');
		} else { //uploaded with MsUpload
			fileName = $toAddToPage.find('.file-name').first().text();
		}

		mediamanager.container.addImage(file, fileName);
		mediamanager.close();
	},
	close: function () {
		MediaManager.window.close();
	}
}

window.MediaManager.window = {

	$modal: $('#MediaManager'),
	open: function () {
		MediaManager.window.$modal.modal('show');
	},
	close: function () {
		MediaManager.window.$modal.modal('hide');
	}
}

window.MediaManager.tabs = {}

window.MediaManager.tabs.uploader = {

	initcallMsUpload: function() {

		MediaManager.tabs.uploader.uploader = MsUpload.createUploaderOnElement($('#MsUpload'), true);

		var dropzone = $( '#'+ MediaManager.tabs.uploader.uploader.uploaderId + '-dropzone' );

		//target.css('border', '2px dotted var(--main-btn-color)');
		dropzone.addClass('dropOverInactive');

		dropzone.off( "dragenter").on('dragenter', function (e)
		{
		    e.stopPropagation();
		    e.preventDefault();
			$(this).addClass('dropOverActive');
			$(this).removeClass('dropOverInactive');
		});
		dropzone.off( "dragleave").on('dragleave', function (e)
		{
		    e.stopPropagation();
		    e.preventDefault();
		    $(this).removeClass('dropOverActive');
			$(this).addClass('dropOverInactive');
		});
		dropzone.off( "dragover").on('dragover', function (e)
		{
		    e.stopPropagation();
		    e.preventDefault();
		    $(this).addClass('dropOverActive');
		    $(this).removeClass('dropOverInactive');
		});

		dropzone.off("drop").on("drop", function() {
			$(this).removeClass('dropOverActive');
			$(this).addClass('dropOverInactive');
		});

		MediaManager.tabs.uploader.uploader.bind('FileUploaded', MediaManager.tabs.uploader.onFileUploaded);

		// overrides MsUpload's warningText method
		MsUpload.warningText = function ( fileItem, warning, uploader ) {

			switch ( warning ) {
				case '':
				case '&nbsp;':
				case '&#160;':
					$( fileItem.warning ).empty()
						.siblings( '.file-name' ).show()
						.siblings( '.file-name-input' ).hide()
						.siblings( '.file-extension' ).hide();
					break;

				case 'Error: Unknown result from API':
				case 'Error: Request failed':
					$( fileItem.warning ).text( warning );
					break;

				default:
					// IMPORTANT! The code below assumes that every warning not captured by the code above is about a file being replaced
					$( fileItem.warning ).html( warning );

					// We break when the particula warning when a file name starts with IMG
					if ( warning.indexOf( 'The name of the file you are uploading begins with' ) === 0 ) {
						break; // When the file name starts with "IMG", MediaWiki issues this warning. Display it and continue.
					}
					if ( warning.indexOf( 'Der Dateiname beginnt mit' ) === 0 ) {
						break; // Make it work for German too. Must be done this way because the error response doesn't include an error code.
					}

					// When hovering over the link to the file about to be replaced, show the thumbnail
					// $( fileItem.warning ).find( 'a' ).mouseover( function () {
					// 	$( fileItem.warning ).find( 'div.thumb' ).show();
					// }).mouseout( function () {
					// 	$( fileItem.warning ).find( 'div.thumb' ).hide();
					// });

					$( fileItem.warning ).find('.mw-selflink.selflink').attr({ href: $( fileItem.warning ).find( '.image' ).attr('href'), target: "_blank"});

					// If a file with the same name already exists, add a checkbox to confirm the replacement
					if ( window.msuVars.confirmReplace ) {

						MsUpload.unconfirmedReplacements++;

						var title = $( fileItem.warning ).siblings( '.file-name' );

						var checkbox = $( '<input>' ).attr( 'type', 'checkbox' ).click( function ( event ) {
							if ( $( this ).is( ':checked' ) ) {
								title.show().next().hide();
								MsUpload.unconfirmedReplacements--;
							} else {
								title.hide().next().show().select();
								MsUpload.unconfirmedReplacements++;
							}
							uploader.trigger( 'CheckFiles' );
						});
						$( '<label>' ).append( checkbox ).append( mw.msg( 'msu-replace-file' ) ).appendTo( fileItem.warning );
					}
					break;
			}
			uploader.trigger( 'CheckFiles' );
			fileItem.loading.hide();
		}
	},
	onFileUploaded: function ( uploader, file, success ) {
		$(file.li[0]).addClass('image');
		$(file.li[0]).on('click', function(){
			MediaManager.window.$modal.find('.image').not($(this)).removeClass('toAddToPage');
			$(this).toggleClass('toAddToPage');
			if ($(this).hasClass('toAddToPage')) {
				$("#addToPage").prop( "disabled", false );
			} else {
				$("#addToPage").prop( "disabled", true );
			}
		});
		$( '#'+ uploader.uploaderId + '-bottom' ).hide(); //doesn't work
	},
	init: function () {

		setTimeout(function () {
		  MediaManager.tabs.uploader.initcallMsUpload();
		}, 300);
	},
	startUpload: function() {
		MediaManager.tabs.uploader.uploader.start();
	}
}