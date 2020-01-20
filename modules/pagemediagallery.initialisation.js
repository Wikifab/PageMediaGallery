

$(document).ready(function (){


	// do not load PMG for mobiles devices
	if (! window.matchMedia("(hover: none), (pointer: none), (pointer: coarse)").matches) {

		console.log('PMG loaded');
		// @media (hover: none), (pointer: none), (pointer: coarse)
		$(".msuploadContainer").not('.multipleTemplateStarter .msuploadContainer').each(function (i) {
			new pagemediagallery.ui.SecondaryGallery(this);
		});


		// add event on new step button, to appli VE on new steps
		mw.hook( 'pf.addTemplateInstance' ).add( function(div) {
			if($(div).find('.msuploadContainer').length > 0){
				// set timeout enable to run it in a new 'thread',
				// and to continue hook execution without wait for VE to be loaded

				setTimeout(function(){
					$(div).find('.msuploadContainer').each(function() {
						new pagemediagallery.ui.SecondaryGallery(this);
					});
				}, 10);
			} else if($(div).parents('.simplePMG').length > 0){
				new pagemediagallery.ui.SecondaryGallery($(div).find('.inputSpan').get(0));
			}
		} );

		$('.simplePMG').find('.inputSpan').each(function () {
			new pagemediagallery.ui.SecondaryGallery(this);
		});
	} else {
		console.log('Mobile detected, PMG not loaded');
	}

});