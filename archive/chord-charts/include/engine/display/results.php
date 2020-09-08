<?php

// fonction qui construit un tableau de resultats
function KWAKERS_DISPLAY_RESULTS_Table($title = "", $id = "", $moreResults = false)
{
	$html = '<div id="'.$id.'" class="resultsContainer">';
	if($title != "")
	{
		$html .= "<h2>".$title."</h2>";
	}
	$html .= "<table class='results'>";
	$html .= '<thead><tr><th>Type</th><th>Titre</th><th>Compositeur</th><th>Style</th><th>Tonalité</th><th class="link">Fichier</th><th class="view">Voir</th></tr></thead>';
	$html .= "<tbody>";
	foreach($GLOBALS["results"]["data"] as $song)
	{
		$html .= KWAKERS_DISPLAY_RESULTS_line($song);
	}
	$html .= "</tbody>";
	$html.='</table>';
	if($moreResults && $GLOBALS["results"]["count"] == TAB_RESULT_LENGTH)
	{
		$html.='<p id="moreResultsContainer"><span id="moreResults">Plus de résultats</span><img alt="" src="css/img/ajax-loader.gif" class="ajax-loader"></p>';
	}	
	$html.='</div>';
	return $html;
}

// affichage d'une ligne du tableau 
function KWAKERS_DISPLAY_RESULTS_line($song)
{	
	$html .= "";
	$html .= '<tr>';
		$html .= '<td>'.KWAKERS_DISPLAY_SONG_type($song['Type']).'</td>';
		$query = urlencode('"'.$song['NewTitre'].'"');
		$html .= '<td><a class="search" href="'.PAGE_INDEX.'?q='.$query.'">'.$song['NewTitre'].'</a></td>';	
		$query = urlencode('"'.$song['NewCompositeur'].'"');
		$html .= '<td><a class="search" href="'.PAGE_INDEX.'?q='.$query.'">'.$song['NewCompositeur'].'</a></td>';
		$query = urlencode('"'.$song['NewStyle'].'"');
		$html .= '<td class="center"><a class="search" href="'.PAGE_INDEX.'?q='.$query.'">'.$song['NewStyle'].'</a></td>';
		$song['Compositeur'].'</a></td>';
		$html .= '<td>'.$song['Tonalite'].'</td>';
		$html .= '<td class="link center"><a target="_blank" href="'.PAGE_DOWNLOAD.'?id='.$song['Id'].'"><img alt="" src="css/img/download.png" /></a></td>';
		$html .= '<td class="link center"><a href="'.PAGE_VIEWER.'?id='.$song['Id'].'"><img alt="" src="css/img/view.png" /></a></td>';
	$html .='</tr>';
	
	return $html;
}
	
?>