# PageMediaGallery

MediaWiki extension to add image gallery on formedit page

## requirements : 

extension wikifab/MmsUpload
extension wikifab/GroupsPage


## configuration :

to restrict pagemediagallery to only specified forms, list them in $$wgpmgEnabledForms ex :

	$wgpmgEnabledForms = ['Tutorials'];

Note that this configuration is not fully fonctionnal, it will correctly disable pagemediagallery from standart edit page, but all Page edited with PageForm will be enable with PMG, the control on the form's name works only on page creation. (not on edition)
