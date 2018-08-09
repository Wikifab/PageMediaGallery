var pagemediagallery = {};

pagemediagallery.ui = pagemediagallery.ui || {};

( function ( $, mw, pagemediagallery ) {
	'use strict';

	/**
	 * SecondaryGallery class
	 * create html linked to form input to create a secondary gallery on inputs, linked to the PrimaryGallery for Upload and drag/drop
	 * container node should be the one with class .msuploadContainer
	 *
	 * possibles hooks fired :
	 * mw.hook 'pmg.secondaryGallery.newThumbAdded' (li)
	 * mw.hook 'pmg.secondaryGallery.itemRemoved' (input)
	 * mw.hook 'pmg.secondaryGallery.itemChanged' (input, li)
 	 *
	 * @param container node
	 * @constructor
	 */
	pagemediagallery.ui.SecondaryGallery = function ( container, primaryGallery ) {

		var secondaryGallery = this;

		this.primaryGallery = primaryGallery;
		this.$container = container;

		//file to be uploaded
		this.filesUploading = [];

		if ($(this.$container).find('.formmediagallery').length > 0) {
			return ;
		}
		// hide all inputs in container
		$(this.$container).children().hide();

		// replace by formmediagallery list
		this.ol = $('<div>').addClass('formmediagallery');
		var ul = $('<ul>');
		this.ol.append(ul);

		var div = $('<div>').addClass('add-new-file-slot unsortable');
		div.click(function (element){
			if($(element.target).parents('.msuploadContainer').get(0) && $($(element.target).parents('.msuploadContainer').get(0)).find('.buttonBar .select-file').get(0)){
				$($(element.target).parents('.msuploadContainer').get(0)).find('.buttonBar .select-file').get(0).click();
			}
		});
		div.append($('<i>').addClass('fa fa-plus'));
		ul.append(div);

		if ( !this.hasEmptiesSlots() ){
			div.hide();
		}

		$(this.$container).prepend(this.ol);

		this.addUploadButton();

		// add image present in inputs
		$(this.$container).find('input.createboxInput').each(function (i) {
			if ($(this).val()) {
				var inputId = $(this).attr('id');
				if (!inputId ) {
					return;
				}
				var image = $('#'+ inputId + '_imagepreview');
				//var image = $(this).parent().find('.pfImagePreviewWrapper').clone();
				secondaryGallery.addThumb( image.show(), $(this).val());
			}
		});
		this.manageDropOnFormField();
		$(this.$container).find('ul').sortable({
				items : "li:not(.unsortable)",
			    start: function (e, ui) {
			        ui.placeholder.append(ui.item.find('img,video').clone());
			    },
			    stop: function (e, info) {
			    	secondaryGallery.updateImageInputsValues();
			    }
		});
	};

	/**
	 * update image inputs value according to ul list in the dom
	 * must be call after reorder items, or after insert/delete (if not managed by insert/delete function)
	 *
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.updateImageInputsValues = function() {
		var items = $(this.$container).find('ul li').not('.fileToBeUpload');
		var inputs = $(this.$container).find('input.createboxInput');

		for (var i=0; i< inputs.length; i++) {
			var item = items.get(i);
			var input = inputs.get(i);
			if (item) {
				if ( $(input).val() != $(item).attr('data-filename') ) {
					mw.hook('pmg.secondaryGallery.itemChanged').fire(input, item);
				}
				$(input).val($(item).attr('data-filename'));
			} else {
				if ($(input).val()) {
					mw.hook('pmg.secondaryGallery.itemRemoved').fire(input);
				}
				$(input).val('');
			}
		}
	}

	pagemediagallery.ui.SecondaryGallery.prototype.addUploadButton = function() {
		var secondaryGallery = this;
		// add upload button
		this.uploadButton = $('<a>');
		this.uploadButton.addClass('btn btn-primary');

		this.uploadButton.hide();

		this.selectFileButton = $('<div>').addClass('select-file');
		this.uploadIcon = $('<i>').addClass('fa fa-upload');
		this.loadIcon = $('<i>').addClass('msupload-loading-button fa fa-spinner fa-spin fa-1x fa-fw');
		this.loadIcon.hide();
		var uploadIcon = this.uploadIcon;
		var loadIcon = this.loadIcon;
		this.uploadButton.click(function() {
			uploadIcon.hide();
			loadIcon.show();
			secondaryGallery.primaryGallery.startUpload();
			return false;
		});
		this.uploadButton.append(this.uploadIcon);
		this.uploadButton.append(this.loadIcon);

		var txt = document.createTextNode(mw.msg( 'msu-upload-all' ));
		this.uploadButton.append(txt);

		this.buttonbar = $('<div>').addClass('buttonBar');
		this.buttonbar.append(this.uploadButton);
		this.buttonbar.append(this.selectFileButton);
		$(this.$container).append(this.buttonbar);

		this.addBrowseButton();
	}

	pagemediagallery.ui.SecondaryGallery.prototype.updateUploadButtonVisibility = function () {
		if ($(this.$container).find('.fileToBeUpload').length) {
			this.uploadButton.show();
		} else {
			this.uploadButton.hide();
		}
	};

	pagemediagallery.ui.SecondaryGallery.prototype.addFileToUpload = function (file) {

		var secondaryGallery = this;

		if ( ! secondaryGallery.hasEmptiesSlots() || 
			secondaryGallery.filesUploading.length + 1 > secondaryGallery.numberEmptiesSlots()) {
			secondaryGallery.dispErrorMessage(mw.msg( 'msu-upload-nbfile-exceed' ));
			return;
		}

		if ( secondaryGallery.numberEmptiesSlots() - (secondaryGallery.filesUploading.length + 1 ) <= 0 ) {
			//hide add new file slot
			if ( $($(secondaryGallery.$container).find('.add-new-file-slot')).get(0) ) $($($(secondaryGallery.$container).find('.add-new-file-slot')).get(0)).hide();
		}

		this.filesUploading.push( new pagemediagallery.ui.FileUploading(file,this));
	}

	pagemediagallery.ui.SecondaryGallery.prototype.addBrowseButton = function() {
		var secondaryGallery = this;
		var fileInput = new mOxie.FileInput({
			browse_button: this.selectFileButton[ 0 ], // or document.getElementById('file-picker')
			container: this.$container[ 0 ],
			multiple: true // allow multiple file selection
		});

		fileInput.onchange = function(e) {
			// do something to files array
			console.info(e.target.files); // or this.files or fileInput.files
			for (var index = 0; index < e.target.files.length; ++index) {
				// add file to be uploaded in mediaGallery
				secondaryGallery.addFileToUpload(e.target.files[index]);
			}

		};

		fileInput.init();
	}

	/**
	 * add thumb to gallery (do not manage adding image to inputs)
	 * called when :
	 *  - init : call it for each existing image
	 *  - adding image to download (params isTemp = true) ( add thumb to indicate an image to be uploaded)
	 *  - adding image, after upload, or after drop an existing image
	 *
	 * @param domelement img the image element to add
	 * @param string filename the filename for the image
	 * @param isTemp if true, indicate the the image is about to be uploaded, an other will be added to replace it after upload
	 * @param tempToReplace fir an image just being uploaded, indicate the corresponding tempImage to remove before adding this one
	 * @return {jQuery} li element added
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.addThumb = function ( img, filename, isTemp, tempToReplace) {

		var isTemp = isTemp || false;
		var tempToReplace = tempToReplace || false;

		var li;

		var ext = filename.substr(filename.lastIndexOf('.') + 1);

		var imageWrapper = $('<div>').attr('class','pfImagePreviewWrapper');
		imageWrapper.append(img);

		if (tempToReplace && tempToReplace.parent('li').length == 1) {
			li = tempToReplace.parent('li').empty().attr('class','').attr('data-filename', filename).append(imageWrapper);
		} else {
			li = $('<li>').attr('data-filename', filename).append(imageWrapper);
		}
		if (imageWrapper.find('video').length > 0){
			$('<span>').addClass('video-player').prependTo(imageWrapper);
		}
		if (ext == 'stl'){
			$('<span>').addClass('stl-file').prependTo(imageWrapper);
		}
		var secondaryGallery = this;

		var buttonBar = $( '<span>' ).attr({ 'class': 'file-buttonbar'});
		var cancelbutton = $( '<span>' ).attr({ 'class': 'file-cancel', 'title': mw.msg( 'msu-cancel-upload' ) });
		cancelbutton.click( function () {
			secondaryGallery.removeImg( this );
		});
		buttonBar.append( cancelbutton );
		li.append( buttonBar );

		$(li).find('.image-button').appendTo(buttonBar);

		if (isTemp) {
			li.addClass('fileToBeUpload');
		}

		$(this.$container).find('.formmediagallery ul .add-new-file-slot').before(li);

		mw.hook('pmg.secondaryGallery.newThumbAdded').fire(li);

		return li;
	};



	pagemediagallery.ui.SecondaryGallery.prototype.removeImg = function ( closeButton ) {

		var secondaryGallery = this;

		var filename = $(closeButton).parents('li').attr('data-filename');
		$(closeButton).parents('li').remove();
		if (filename) {

			var inputs = $(this.$container).find('input.createboxInput');
			if (inputs.length == 0) {
				this.updateUploadButtonVisibility();
				return;
			}
			inputs = inputs.filter(function() {
				return this.value == filename;
			});
			if (inputs.length > 0) {
				// remove filename from input
				inputs.first().val('');
				this.clearErrorMessages();
			}

			pagemediagallery.ui.FileUploading.onFileRemove(filename);

			this.updateUploadButtonVisibility();
			this.updateImageInputsValues();

			var filesUploading = $(this.filesUploading);
			var elem = filesUploading.filter(function() {
				return this.file.name == filename;
			});
			this.filesUploading.splice(this.filesUploading.indexOf(elem),1);

			if(secondaryGallery.hasEmptiesSlots()){
				var container = $(this.$container);
				if ( $(container.find('.add-new-file-slot')).get(0) && $($(container.find('.add-new-file-slot')).get(0)).is(':hidden') ) {
					$($(container.find('.add-new-file-slot')).get(0)).show();
				}
			}
		}
	};


	pagemediagallery.ui.SecondaryGallery.prototype.clearErrorMessages = function ( ){
		$(this.$container).find('span.errorMessage').remove();
	},

	pagemediagallery.ui.SecondaryGallery.prototype.dispErrorMessage = function ( message){
		// remove previous message
		this.clearErrorMessages();
		$('<span class="errorMessage">').html( message).appendTo($(this.$container));
	},


	/**
	 * this function automaticaly add image to forminputs included in container div
	 * if all inputs are allready filled, it mark file as error, because not possible to add more
	 * if there is no input in container div, , no check , just return OK (case of page gallery)
	 *
	 *  @param String filename filename to add
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.addImageToFormsInputs = function ( filename ) {

		var inputs = $(this.$container).find('input.createboxInput');

		if (inputs.length == 0) {
			return true;
		}

		var emptiesInputs = inputs.filter(function() {
			return this.value == "" || this.value == 'No-image-yet.jpg';
		});

		if (emptiesInputs.length > 0) {
			// if we get an input with no value, we add filename to it
			emptiesInputs.first().val(filename);
			this.clearErrorMessages();
		} else {
			this.dispErrorMessage(mw.msg( 'msu-upload-nbfile-exceed' ));
			return false;
		}
		return true;
	};

	/**
	 * this function return true is it is still possible to add images
	 *
	 *  @return Boolean
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.hasEmptiesSlots = function (  ) {

		var emptiesInputs = $(this.$container).find('input.createboxInput').filter(function() {
			return this.value == "" || this.value == 'No-image-yet.jpg';
		});

		return emptiesInputs.length > 0;
	};

	/**
	 * this function returns the number of empty slots
	 *
	 *  @return number of empty slots
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.numberEmptiesSlots = function (  ) {

		var emptiesInputs = $(this.$container).find('input.createboxInput').filter(function() {
			return this.value == "" || this.value == 'No-image-yet.jpg';
		});

		return emptiesInputs.length;
	};

	/**
	 * this function returns the total number of slots available for this container
	 *
	 *  @return int max number of solts
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.maxSlots = function (  ) {

		var inputs = $(this.$container).find('input.createboxInput');

		return inputs.length;
	};

	pagemediagallery.ui.SecondaryGallery.prototype.getInputForFile = function ( filename ) {


		// TODO fire event to alloaw adding edit image tools
		var items = $(this.$container).find('ul li').not('.fileToBeUpload');

		var inputs = $(this.$container).find('input.createboxInput');
		var result = null;

		for (var i=0; i< inputs.length; i++) {
			var item = items.get(i);
			var input = inputs.get(i);
			if ($(input).val() == filename) {
				result = input;
			}
		}
		return result;
	};

	/**
	 * add an image to the secondary gallery
	 *
	 *  @param String filename filename to add
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.addImage = function ( img, filename, tempToReplace) {

		var secondaryGallery = this;

		if ( ! secondaryGallery.hasEmptiesSlots() || 
			( secondaryGallery.filesUploading.length + 1 > secondaryGallery.numberEmptiesSlots() ) && !tempToReplace) {
			secondaryGallery.dispErrorMessage(mw.msg( 'msu-upload-nbfile-exceed' ));
			return;
		}

		var fileFromGallery = tempToReplace ? 0 : 1;

		if ( secondaryGallery.numberEmptiesSlots() - (secondaryGallery.filesUploading.length + fileFromGallery) <= 0 ) {
			//hide add new file slot
			if ( $($(secondaryGallery.$container).find('.add-new-file-slot')).get(0) ) $($($(secondaryGallery.$container).find('.add-new-file-slot')).get(0)).hide();
		}

		var result = this.addImageToFormsInputs(filename);

		if ( result && !tempToReplace) {
			var newItem = this.addThumb(img, filename, false, tempToReplace);
			this.updateImageInputsValues();
			var fileinput = this.getInputForFile(filename);
			mw.hook('pmg.secondaryGallery.newImageAdded').fire(fileinput, newItem);
		}

		if (tempToReplace) this.uploadButton.hide();

		// TODO fire event to allow adding edit image tools
	};

	/**
	 * remove a temp img from the secondary gallery
	 * in case of fail to upload the image, the temp image must be remove
	 *
	 *  @param Object tempToRemove
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.removeTempImage = function (filename, tempToReplace) {

		tempToReplace.parents('li').first().remove();

		//$(this.$container).find('.formmediagallery ul').append(li);
		this.updateUploadButtonVisibility();
	};

	/**
	 * add temporary image to the secondary gallery
	 * (image of file to be uploaded)
	 *
	 *  @param String filename filename to add
	 */
	pagemediagallery.ui.SecondaryGallery.prototype.addTempImage = function ( img, filename) {
		this.addThumb(img, filename, true);

		this.uploadButton.show();
		this.loadIcon.hide();
		this.uploadIcon.show();
	};


	pagemediagallery.ui.SecondaryGallery.prototype.affFileFromGallery = function( draggedObject) {
		var image = draggedObject.find('img').clone();
		if (image.length == 0 && draggedObject.find('video').length > 0) {
			image = draggedObject.find('video').clone();

		}
		var filename = draggedObject.attr('data-filename');
		if (!filename) {
			filename = draggedObject.find('.file-name').first().text();
		}
		this.addImage(image, filename);


		// trick to hide the 'revert' movement of the image back to the gallery
		$('.ui-draggable-dragging').hide();
	};



	pagemediagallery.ui.SecondaryGallery.prototype.affFilesToLoad = function( files) {
		for (var index = 0; index < files.length; ++index) {
			// add file to be uploaded in mediaGallery
			this.addFileToUpload(files[index]);
		}
	}

	var addDropOverClass = function (target) {
		// as style is set on element by msupload, adding class is not enought, we must change style on element
		//target.css('border', '2px solid var(--main-btn-color)');
		target.addClass('dropOverActive');
		target.removeClass('dropOverInactive');
	}
	var removeDropOverClass = function (target) {
		target.removeClass('dropOverActive');
		target.addClass('dropOverInactive');
		//target.css('border', '2px dotted var(--main-btn-color)');
	}

	pagemediagallery.ui.SecondaryGallery.prototype.manageDropOnFormField = function () {

		var secondaryGallery = this;
		var target = $(this.$container);

		//target.css('border', '2px dotted var(--main-btn-color)');
		target.addClass('dropOverInactive');
		if(target.find('.dropHelp').length == 0) {
			target.append('<span class="dropHelp">'+mw.msg( 'msu-dropzone' )+'</span>');
		}
		target.off( "dragenter").on('dragenter', function (e)
				{
				    e.stopPropagation();
				    e.preventDefault();
					addDropOverClass($(this));
				});
		target.off( "dragleave").on('dragleave', function (e)
				{
				    e.stopPropagation();
				    e.preventDefault();
				    removeDropOverClass($(this));
				});
		target.off( "dragover").on('dragover', function (e)
		{
		     e.stopPropagation();
		     e.preventDefault();
		     addDropOverClass($(this));
		});


		// accept items match file uploads from filesystem
		target.off( "drop").on('drop', function (e)
		{
			removeDropOverClass($(this));
			if (!e.originalEvent.dataTransfer) {
				return;
			}
			secondaryGallery.clearErrorMessages();
			e.stopPropagation();
			e.preventDefault();

			var files = e.originalEvent.dataTransfer.files;

			secondaryGallery.primaryGallery.open();

			secondaryGallery.affFilesToLoad(files);

			// uploader.start();
			secondaryGallery.primaryGallery.onRefresh();

		});

		// accept drop item from Primary gallery
		target.droppable({
		      accept: ".msupload-list > li",
		      classes: {
		        "ui-droppable-active": "ui-state-default",
		        "ui-droppable-hover": "ui-state-hover"
		      },
		      drop: function( event, ui ) {
		    	  secondaryGallery.affFileFromGallery(ui.draggable);
		      },
		      over: function (event, ui) {
		    	  addDropOverClass(target);
		      },
		      out: function (event, ui) {
		    	  removeDropOverClass(target);
		      }
		    });

		// avoid opening file when drop outside of areas :
		$(document).on('drop', function (e)
				{
				    e.stopPropagation();
				    e.preventDefault();
				});

	}

}( jQuery, mediaWiki, pagemediagallery ) );
