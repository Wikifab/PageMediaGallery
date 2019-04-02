<?php

namespace PageMediaGallery;

use ApiBase;

/**
 * Returns a list of files
 *
 * @author Julien
 */
class ApiBrowse extends ApiBase {

	public function __construct($query, $moduleName) {
		parent::__construct ( $query, $moduleName );
	}
	public function getAllowedParams() {
		return array (
			'offset' => array ( //value from which to search
					ApiBase::PARAM_TYPE => 'string',
					ApiBase::PARAM_REQUIRED => false
			),
			'input' => array ( //search for files matching this value
					ApiBase::PARAM_TYPE => 'string',
					ApiBase::PARAM_REQUIRED => false
			),
			'owner' => array ( //only return files belonging to this user
					ApiBase::PARAM_TYPE => 'boolean',
					ApiBase::PARAM_REQUIRED => false
			)
		);
	}
	public function getParamDescription() {
		return [ ];
	}
	public function getDescription() {
		return false;
	}
	public function execute() {

		global $wgPageMediaGallerySearchLimit, $wgUser;

		$r = [];

		// $user = $this->getUser();

		// if(!$user->isAllowed( '' )){
		//		throw new \PermissionsError( '' );
		// }

		$input = $this->getMain()->getVal( 'input' );
		$offset = $this->getMain()->getVal( 'offset' );
		$owner = $this->getMain()->getVal( 'owner' );

		// $requestParams['srsearch'] = $input;
		$query = '[[File:~*' . $input . '*]]';
		if ( !is_null( $owner ) && $owner && $wgUser->isLoggedIn() ) {
			$aiuser = $wgUser->getName();
			$query .= ' [[Page creator::~' . $aiuser . ']]';
		}
		if ( !is_null( $offset ) ) {
			$semanticQueryResult = self::semanticQuery($query, $wgPageMediaGallerySearchLimit, $offset, 'Modification date');
		} else {
			$semanticQueryResult = self::semanticQuery($query, $wgPageMediaGallerySearchLimit, 0, 'Modification date');
		}


		foreach ($semanticQueryResult as $key => $wikipage) {

			$file = wfLocalFile(\Title::newFromDBkey($wikipage->getDBkey())->getText() );
			$a = array();
			//$wikipage->get
			$a['title'] = $wikipage->getTitle()->getPrefixedDbKey() ;
			$a['filename'] = $file->getName();
			$a['mime'] = $file->getMimeType();
			if ($file->getMimeType() == 'application/sla') {

				$requestParams['iiprop'] = 'url';
				$requestParams['action'] = 'query';
				$requestParams['titles'] = 'File:' . $file->getName();
				$requestParams['iiurlwidth'] = '400px';
				$requestParams['prop'] = 'imageinfo';

				$imageInfoResult = self::APIFauxRequest($requestParams);

				if (isset($imageInfoResult['query']) && isset($imageInfoResult['query']['pages'])){

					$pages = $imageInfoResult['query']['pages'];

					$a['fileurl'] = reset($pages)['imageinfo'][0]['thumburl'];
				} else {
					$a['fileurl'] = $file->getUrl();
				}

			} else {
				$thumbs = $file->getThumbnails();
				$thumbfile = false;
				foreach ($thumbs as $thumbnail) {
					if (preg_match('/^([0-9]+)px/', $thumbnail, $matches)) {
						$thumbfile = $thumbnail;
						if($matches > 200) {
							break;
						}
					}
				}
				if ( ! $thumbfile) {
					$thumbfile = $file->generateThumbName($a['title'], [ 'width' => 200 ]);
				}

				$a['fileurl'] = $file->getUrl();
				$a['width'] = $file->getWidth();
				$a['height'] = $file->getHeight();
				$a['thumburl'] = $file->getThumbUrl($thumbfile);
			}
			$r['search'][] = $a;

			if (isset($offset)) {
				$nextOffset = $offset + $wgPageMediaGallerySearchLimit;
			} else {
				$nextOffset = $wgPageMediaGallerySearchLimit;
			}

			$nextValues = self::semanticQuery('[[File:~*' . $input . '*]]', $wgPageMediaGallerySearchLimit, $nextOffset);
			if ($nextValues) {
				$r['continue']['offset'] = $nextOffset;
			}
		}

		$this->getResult()->addValue ( null, $this->getModuleName(), $r );
	}

	public function needsToken() {
		return 'csrf';
	}

	/**
	 * returns an array of pages that are result of the semantic query
	 * @param $rawQueryString string - the query string like [[Category:Trees]][[age::>1000]]
	 * @return array of SMWDIWikiPage objects representing the result
	 */
	private function semanticQuery($rawQuery, $limit = 20, $offset = 0, $sort = null, $order = 'desc') {
		global $wfeSortField;

		$rawQueryArray = array( trim($rawQuery) );
		if($limit) {
			$rawQueryArray['limit'] = $limit;
		}
		if($offset) {
			$rawQueryArray['offset'] = $offset;
		}
		if($sort) {
			$rawQueryArray['sort'] = $sort;
			$rawQueryArray['order'] = $order;
		} else if (isset($wfeSortField)  && $wfeSortField) {
			$rawQueryArray['sort'] = $wfeSortField;
			$rawQueryArray['order'] = $order;
		}

		\SMWQueryProcessor::processFunctionParams( $rawQueryArray, $queryString, $processedParams, $printouts );
		\SMWQueryProcessor::addThisPrintout( $printouts, $processedParams );
		$processedParams = \SMWQueryProcessor::getProcessedParams( $processedParams, $printouts );
		$queryCount = \SMWQueryProcessor::createQuery( $queryString,
			$processedParams,
			\SMWQueryProcessor::SPECIAL_PAGE, 'count', $printouts );

		$queryObj = \SMWQueryProcessor::createQuery( $queryString,
			$processedParams,
			\SMWQueryProcessor::SPECIAL_PAGE, '', $printouts );
		$queryObj->setLimit($limit);
		$res = \PFUtils::getSMWStore()->getQueryResult( $queryObj );
		$pages = $res->getResults();

		return $pages;
	}

	/**
	 * Execute a request to the API within mediawiki using FauxRequest
	 *
     * @param $data array Array of non-urlencoded key => value pairs, the fake GET/POST values
     * @param $wasPosted bool Whether to treat the data as POST
     * @param $session MediaWiki\\Session\\Session | array | null Session, session data array, or null
     * @param $protocol string 'http' or 'https'
     * @return array the result data array
     *
	 * @see https://doc.wikimedia.org/mediawiki-core/master/php/classFauxRequest.html
	 */
	private function APIFauxRequest($data = [],
		  	$wasPosted = false,
		  	$session = null,
		  	$protocol = 'http' ){

		$res = array();

		$apiParams = new \FauxRequest($data, $wasPosted, $session, $protocol);

		try {
			$api = new \ApiMain( $apiParams );
			$api->execute();
			$res = $api->getResult()->getResultData();
		} catch (\Exception $e) {
			trigger_error("API exception : " . $e->getMessage(), E_USER_WARNING);
		}

		return $res;
	}
}