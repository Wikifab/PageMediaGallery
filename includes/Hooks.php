<?php

namespace PageMediaGallery;

use GroupsPage\GroupsPageCore;
use PFFormEdit;

class Hooks {

	static public function onExtensionLoad() {

	}

	static function addToForm($text) {

		static $isStarted = false;
		if (!$isStarted) {
			self::start();
			$isStarted = true;
		}

	}

	static function start( $pFFormEdit) {
		global $wgOut, $wgScriptPath, $wgFileExtensions, $wgUser, $wgpmgEnabledForms;

		if($wgpmgEnabledForms && isset($pFFormEdit) && isset($pFFormEdit->mForm)) {

			if ( ! in_array($pFFormEdit->mForm, $wgpmgEnabledForms)) {
				// pagemediagallery is not enable for this form :
				return ;
			}
		} else if ($wgpmgEnabledForms && ! $pFFormEdit instanceof PFFormEdit) {
			// pagemediagallery not enable out of pageForms:
			return ;
		}




		$wgOut->addModules ( 'ext.pageMediaGallery' );
		$wgOut->addJsConfigVars ( array (
				'wgFileExtensions' => array_values ( array_unique ( $wgFileExtensions ) )
		) );

		$pmgVars = array (
				'scriptPath' => $wgScriptPath
		);

		$pmgVars = json_encode ( $pmgVars );

		if ($wgUser->getId ()) {
			$mediaManager = self::getModal();
			$wgOut->addHTML ( $mediaManager );
		}
		$wgOut->addScript ( "<script type=\"text/javascript\">window.pmgVars = $pmgVars;</script>\n" );


		return true;
	}

	private static function getModal() {

		global $wgOut;

		$out = '';

		$out .= '<div class="modal" id="MediaManager" tabindex="-1" role="dialog" role="document">';
		$out .=  '<div class="modal-dialog" role="document">';
		$out .=    '<div class="modal-content">';
		$out .=      '<div class="modal-header">';
		$out .=        '<div class="cancel-container"><button type="button" class="btn btn-primary" data-dismiss="modal" aria-label="Close">';
		$out .=          '<span>' . wfMessage('pmg-cancel') . '</span>';
		$out .=        '</button></div>';
		$out .=        '<h4 class="modal-title">' . wfMessage('pmg-mediamanager-title') . '</h4>';
		$out .=        '<div class="insert-to-page-container"><button type="button" id="addToPage" class="btn btn-primary" disabled>' . wfMessage('pmg-insert-to-page') . '</button></div>';
		$out .=      "</div><!-- end .modal-header --> \n";
		$out .=      '<ul class="nav nav-tabs" id="tabContent">';

		$out .=	      '<li class="active"><a href="#pmg-search" data-toggle="tab" role="tab" aria-controls="pmg-search" >' . wfMessage('pmg-tab-search') . '</a></li>';

		$out .=	      '<li><a href="#upload" role="tab" aria-controls="upload" data-toggle="tab">' . wfMessage('pmg-tab-upload') . '</a></li>';

		$out .=	      '<li><a href="#myMedia" role="tab" aria-controls="myMedia" data-toggle="tab">' . wfMessage('pmg-tab-mymedia') . '</a></li>';

		$out .=	  '</ul>';
		$out .=      '<div class="tab-content">';

		$out .=       '<div class="tab-pane active" id="pmg-search">';
		$out .=	        '<div class="search-input">';
		$out .=	          '<input id="querymedia-input" class="querymediainput " type="text">';
		$out .=	        '</div>';
		$out .=	        '<div class="search-content">';
		$out .=	          '<div class="search-content-body">';
		$out .=	        	wfMessage('pmg-no-match-found');
		$out .=	          '</div>';
		$out .=           '<div class="load-more-content"><i style="display:none;" class="fa fa-spinner fa-spin fa-2x fa-fw load-more-content-spinner"></i>
<span class="sr-only">Loading...</span></div>';
		$out .=	        '</div>';
		$out .=        '</div><!-- end #pmg-search --> ';

		$out .=	      '<div class="tab-pane" id="upload">';
		$out .=	    	self::getMediaManagerUploaderContent( );
		$out .=	      '</div> ';

		$out .=       '<div class="tab-pane" id="myMedia">';
		$out .=	        '<div class="search-input">';
		$out .=	          '<input id="querymedia-input-mymedia" class="querymediainput " type="text">';
		$out .=	        '</div>';
		$out .=	        '<div class="search-content">';
		$out .=	          '<div class="search-content-body">';
		$out .=	        	wfMessage('pmg-no-match-found');
		$out .=	          '</div>';
		$out .=           '<div class="load-more-content"><i style="display:none;" class="fa fa-spinner fa-spin fa-2x fa-fw load-more-content-spinner"></i>
<span class="sr-only">Loading...</span></div>';
		$out .=	        '</div>';
		$out .=        '</div> <!-- end #myMedia --> ';

		$out .=	    '</div><!-- end .tab-content --> ';
		$out .=	  "</div><!-- end .modal-content -->\n";
		$out .=    "</div><!-- end .modal-dialog -->\n";
		$out .=  "</div><!-- end .modal #MediaManager -->\n";

		return $out;
	}

	static function getMediaManagerUploaderContent() {

		$out = '';
		$out .= '<div>';
		$out .=   '<div id="MediaManagerUploader">';
		$out .=     '<div id="MsUpload"></div>';
		$out .=   '</div>';
		$out .= '</div>';

		return $out;
	}

	public static function beforePageDisplay( $out ) {
		$out->addModules( 'ext.userswatchbutton.js' );
	}

	static function getFileMatching($filename) {

		$len = strlen($filename);

		$dbr = wfGetDB( DB_REPLICA );
		$res = $dbr->select(
				'page',
				array(
						'page_id',
						'page_title',
						'page_namespace'
				), array(
						"SUBSTR(page_title,1,$len)" =>  $filename,
						'page_namespace' => NS_FILE
				),
				__METHOD__
				);

		$files = array();
		if ( $res->numRows() > 0 ) {
			foreach ( $res as $row ) {
				$files[] = wfLocalFile(\Title::newFromRow($row));
			}
			$res->free();
		}
		return $files;
	}

	static function getGalleryFiles(\Title $page) {
		$files = [];
		if ($page) {
			$fileTitles = GroupsPageCore::getInstance()->getMemberPages($page);
			foreach ($fileTitles as $title) {
				$file = wfLocalFile( $title );
				//$file = \LocalFile::newFromTitle($fileTitles);
				if($file) {
					$files[] = $file;
				}
			}
			if( ! $page->exists()) {
				// if page doesn't exist yet,
				// we look for any files that could be linked to the page by name
				$titleKey = $page->getDBkey();
				if(strrpos($titleKey, '/')) {
					$titleKey = substr($titleKey, strrpos($titleKey, '/') +1);
				}
				$t = \Title::newFromText($titleKey);
				// the creation of Title object enable to get formatted DBKey
				$files = self::getFileMatching($t->getDBkey());
			}
		}
		return $files;
	}

	static function getGalleryBody($page) {

		// get all existing image linked to the page
		$files = self::getGalleryFiles($page);

		$out = '';
		$out .= '<div id="PageGallery" class="pg_sidebar" style="display:none">

				<h6 class="PageGalleryTitle" title="'.wfMessage( 'pmg-gallery-subtitle' )->parse().'"
								type="button" data-toggle="tooltip" data-placement="right">'
					. wfMessage( 'pmg-gallery-title' )->parse().'
					<span class="smwtticon info"></span></h6>

				<div id="PageGalleryUploader">';

		foreach ($files as $file) {
			$fileUrl = $file->getUrl();
			$params = ['width' => 400];
			$mto = $file->transform( $params );
			if ( $mto && !$mto->isError() ) {
				// thumb Ok, change the URL to point to a thumbnail.
				$fileUrl = wfExpandUrl( $mto->getUrl(), PROTO_RELATIVE );
			}
			$out .= '<img class="mediaGalleryFile" src="' . $fileUrl . '" alt="' . $file->getName() . '"/> ';
		}

		$out .= '</div>
			<div class="pageGalleryControls">
			</div>
		</div>
				';
		return $out;
	}

	public static function onUploadComplete( &$image ) {

		// if file comment contain a link to a page, we expressaly link it to the page
		// Warning : page is not recorded yet, so it has no id !!!

		$text = $image->getLocalFile()->getDescription();


		$pattern = '/\[\[(.*)\]\]/';
		if (preg_match($pattern, $text, $matches)) {
			$pageUri = $matches[1];
			$page = \Title::newFromText($pageUri);
			$fileTitle = $image->getLocalFile()->getTitle();
			if ($page->exists()) {
				GroupsPageCore::getInstance()->addPagesToGroup($page, [$fileTitle]);
			}
		}
	}

	/**
	 * on page creation : we check if files exist with name starting like page name
	 * and we add found files to the page galery
	 *
	 * This is a hack to manage files added to the gallery before page is saved at least once.
	 *
	 *
	 * @param unknown $wikiPage
	 * @param User $user
	 * @param unknown $content
	 * @param unknown $summary
	 * @param unknown $isMinor
	 * @param unknown $isWatch
	 * @param unknown $section
	 * @param unknown $flags
	 * @param Revision $revision
	 */
	public static function onPageContentInsertComplete( \Wikipage $wikiPage, \User $user, $content, $summary, $isMinor,$isWatch, $section, $flags, \Revision $revision ) {

		$filename = $wikiPage->getTitle()->getDBkey();
		$files = self::getFileMatching($filename);
		foreach ($files as $file) {
			GroupsPageCore::getInstance()->addPagesToGroup($wikiPage->getTitle(),[$file->getTitle()]);
		}
	}


}
