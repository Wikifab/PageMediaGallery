

$(document).ready(function (){

	$(".msuploadContainer").not('.multipleTemplateStarter .msuploadContainer').each(function (i) {
		new pagemediagallery.ui.SecondaryGallery(this);
	});


	// add event on new step button, to appli VE on new steps
	mw.hook( 'pf.addTemplateInstance' ).add( function(div) {
			// set timeout enable to run it in a new 'thread',
			// and to continue hook execution without wait for VE to be loaded
			setTimeout(function(){
				$(div).find('.msuploadContainer').each(function() {
					new pagemediagallery.ui.SecondaryGallery(this);
				});
			}, 10);
		} );

});

