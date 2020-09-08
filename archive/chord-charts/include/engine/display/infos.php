<?php

//Affichage du contenu de la page d'informations
function KWAKERS_DISPLAY_INFOS_content()
{
	$html = '<a class="twitter-timeline" data-dnt="true" href="https://twitter.com/KwakersMusic" data-widget-id="698895464796708864">Tweets de @KwakersMusic</a><script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?\'http\':\'https\';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+"://platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>';
	
	return $html;
}

?>