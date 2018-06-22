
pagemediagallery = pagemediagallery || {};
pagemediagallery.ui = pagemediagallery.ui || {};

( function ( $, mw, pagemediagallery, MsUpload ) {
	'use strict';

	/**
	 * PrimaryGallery class
	 * create html elements for page Gallery
	 * use mmsupload.ui.Uploader
	 *
	 * @constructor
	 */
	pagemediagallery.ui.PrimaryGallery = function (  ) {
		this.isOpen = false;

		this.$element = $('#PageGallery');
	};

	pagemediagallery.ui.PrimaryGallery.prototype.toggle = function (  )  {
		if(this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	};
	pagemediagallery.ui.PrimaryGallery.prototype.open = function (  )  {
		this.isOpen=true;

		document.getElementById("PageGallery").style.left = "0px";
		document.getElementsByTagName("body")[0].style.marginLeft = "250px";
	};
	pagemediagallery.ui.PrimaryGallery.prototype.close = function (  )  {
		this.isOpen=false;

		document.getElementById("PageGallery").style.left = "-250px";
		document.getElementsByTagName("body")[0].style.marginLeft = "0px";
	};

	pagemediagallery.ui.PrimaryGallery.prototype.onRefresh = function () {
		// to activate draggable on news images :
		this.initDraggaBleBehaviour();
		$('#PageGallery').scrollTop($('#PageGallery')[0].scrollHeight);
	};


	pagemediagallery.ui.PrimaryGallery.prototype.removeFileFromPagesGroup = function(filePage, grouppage) {
		// function to do second request to execute follow action
		function ajaxGroupsPageQuery(jsondata) {
			var token = jsondata.query.tokens.csrftoken;
			$.ajax({
				type: "POST",
				url: mw.util.wikiScript('api'),
				data: {
					action:'goupspage',
					format:'json',
					groupaction: 'remove', token: token,
					memberpage: filePage,
					groupspage: grouppage
				},
			    dataType: 'json'
			});
		};

		// first request to get token
		$.ajax({
			type: "GET",
			url: mw.util.wikiScript('api'),
			data: { action:'query', format:'json',  meta: 'tokens', type:'csrf'},
		    dataType: 'json',
		    success: ajaxGroupsPageQuery
		});
	};

	pagemediagallery.ui.PrimaryGallery.prototype.addFileToPagesGroup = function(filePage, grouppage) {
		// function to do second request to execute follow action
		function ajaxGroupsPageQuery(jsondata) {
			var token = jsondata.query.tokens.csrftoken;
			$.ajax({
				type: "POST",
				url: mw.util.wikiScript('api'),
				data: {
					action:'goupspage',
					format:'json',
					groupaction: 'add', token: token,
					memberpage: filePage,
					groupspage: grouppage
				},
			    dataType: 'json'
			});
		};

		// first request to get token
		$.ajax({
			type: "GET",
			url: mw.util.wikiScript('api'),
			data: { action:'query', format:'json',  meta: 'tokens', type:'csrf'},
		    dataType: 'json',
		    success: ajaxGroupsPageQuery
		});
	};

	pagemediagallery.ui.PrimaryGallery.prototype.initDraggaBleBehaviour = function() {

	    var $gallery = $( ".msupload-list" ),
	        $trash = $( ".msuploadContainer" );

	    // create temp li in body :
	    $('<ul>').attr('id', 'draggableTempUl').appendTo($('body'));

	    // Let the gallery items be draggable
	    $( "li", $gallery ).draggable({
	      cancel: "a.ui-icon", // clicking an icon won't initiate dragging
	      revert: true, // when not dropped, the item will revert back to its initial position
	      //containment: "document",
	      //containment: [10, $('body').offset().top],
	      containment: 'window',
	      appendTo: '#draggableTempUl',
	      helper: "clone",
	      cursor: "move",
	      scroll: false,
	      start: function() {
	          $(".msuploadContainer").addClass('ui-droppable-active');
	      },
	      stop: function() {
	          $(".ui-droppable-active").removeClass('ui-droppable-active');
	      }
	    });

	};


	pagemediagallery.ui.PrimaryGallery.prototype.initcallMsUpload =  function() {
		var primaryGallery = this;
		this.uploader = MsUpload.createUploaderOnElement($('#PageGalleryUploader'), true);
		this.uploader.primaryGallery = this;
		MsUpload.initWithImgElement(this.uploader);
		MsUpload.onRefresh = function () {
			primaryGallery.onRefresh();
		}
	};

	pagemediagallery.ui.PrimaryGallery.prototype.stepAdded = function() {
		//setTimeout(this.addDropOnformmediagalleryEvent, 100);
		setTimeout(this.updateBindEvents, 100);
	};

	pagemediagallery.ui.PrimaryGallery.prototype.updateBindEvents = function() {
		var pageMediaGallery = this;
		$( ".addAboveButton" )
		    .off( "click", null, pageMediaGallery.stepAdded )
		    .on( "click", null, pageMediaGallery.stepAdded );
	};

	pagemediagallery.ui.PrimaryGallery.prototype.init = function () {
		//var openlink = $( '<a>Open</a>' ).click(pageMediaGallery.initcallMsUpload);
		var pageMediaGallery = this;

		if ($('#PageGalleryUploader').length == 0) {
			console.log('Pagegallery not loaded, are you logged in ?');
			return;
		}
		//alert(openlink);
		//$('#PageGallery').prepend(openlink)
		$('#PageGallery .pageGalleryControls').appendTo('body');
		$('.pageGalleryControls').click(function () {
			pageMediaGallery.toggle();
		});
		this.close();
		$('#PageGallery').show();
		setTimeout(function () {
			pageMediaGallery.initcallMsUpload();
		}, 300);
		setTimeout(function () {
			pageMediaGallery.initDraggaBleBehaviour();
		}, 600);
		setTimeout(function () {
			pageMediaGallery.initBind();
		}, 610);

		mw.hook('msupload.fileRemoved').add( function(li) {
			var filename = li.attr('data-filename');
			if (filename) {
				pageMediaGallery.removeFileFromPagesGroup('File:' + filename, mw.config.get('wgPageName'));
			}
		});

		/*$('.multipleTemplateAdder').click(function () {
			// whe launch createMultipleUploader after a timeout,
			//to be sure news divs are created before executing
			setTimeout(function () {
				pageMediaGallery.addDropOnformmediagalleryEvent();
			}, 100);
		});*/

		$( ".addAboveButton" )
			    .on( "click", null, pageMediaGallery.stepAdded );
	};

	pagemediagallery.ui.PrimaryGallery.prototype.initBind = function() {

		this.uploader.bind( 'FileUploaded',function(uploader, file, success) {
			if( success) {
				uploader.primaryGallery.addFileToPagesGroup('File:' + file.name,  mw.config.get('wgPageName'));
			}
		} );
	};


	pagemediagallery.ui.PrimaryGallery.prototype.startUpload = function() {

		this.uploader.start();
	};


}( jQuery, mediaWiki, pagemediagallery, MsUpload ) );
