<?php
	


 //________________________________//
////////////// PAGE ////////////////


function KWAKERS_DISPLAY_PAGE_meta()
{
	$html = "";
	$html .= '<meta charset="utf-8">';
	$html .= '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">';
	$html .= '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
	
	$title = "";
	$description = "";
	switch(PAGE_CURRENT)
	{
		case PAGE_INDEX :
			$title = "Index";
			$description = "Cette application a été développée dans le but de fournir un moteur de recherche de fichiers pour le logiciel iReal Pro, et ainsi permettre à tous les musiciens de pouvoir imprimer des grilles d’accords GRATUITEMENT.";
			
			if($GLOBALS["requestSearchBar"] != "")
			{
				$title = $GLOBALS["requestSearchBar"];
			}
			
			if(isset($_REQUEST["fl"]) && $_REQUEST["fl"] != "" && in_array(strtolower($_REQUEST["fl"]), $GLOBALS["letters"]))
			{
				$title = $_REQUEST["fl"];	
			}
			break;	
			
		case PAGE_INFOS :
			$title = "Informations";
			$description = "Diverses informations liées à l'application Chord Charts Library";
			break;

		case PAGE_STATS :
			$title = "Statistiques";
			$description = "Statistiques liées à l'application Chord Charts Library";
			break;	
			
		case PAGE_VIEWER :
			$title = "Viewer";
			if($GLOBALS["results"]["count"] > 0)
			{
				$title = $GLOBALS["results"]["data"][0]["NewTitre"] . " | ". $GLOBALS["results"]["data"][0]["NewCompositeur"]  . " | ". $GLOBALS["results"]["data"][0]["Style"];
			}
			$description = "Visualiser la grille d'accord GRATUITEMENT en ligne. " .$title;
			break;
	}
	

	$html .= '<title>'.$title.' | Kwakers | Chord Charts Library</title>';
	$html .= '<meta name="Description" content="'.$description.'">';
	return $html;
}


function KWAKERS_DISPLAY_PAGE_menu()
{	
	$html = "";
	$html .= '<span class="beta"></span>';
	$html .= '<ul>';
	$html .= '<li '.((PAGE_CURRENT == PAGE_INDEX)? 'class="menu_active"': '').'>';
	$html .= '<a href="'.PAGE_INDEX.'">';
		$html .= '<span class="menu_icon menu_accueil"></span>';
			$html .= '<span class="menu_txt">Chord Charts Library</span>';
		$html .= '</a>';
	$html .= '</li>';
	$html .= '<li>';
		$html .= '<a href="'.PAGE_RANDOM.'?type=viewer">';
			$html .= '<span class="menu_icon menu_random_view"></span>';
		$html .= '</a>';
	$html .= '</li>';	
	$html .= '<li '.((PAGE_CURRENT == PAGE_STATS)? 'class="menu_active"': '').'>';
		$html .= '<a href="'.PAGE_STATS.'">';
			$html .= '<span class="menu_icon menu_stats"></span>';
		$html .= '</a>';
	$html .= '</li>';		
	$html .= '<li '.((PAGE_CURRENT == PAGE_INFOS)? 'class="menu_active"': '').'>';
		$html .= '<a href="'.PAGE_INFOS.'">';
			$html .= '<span class="menu_icon menu_infos"></span>';
		$html .= '</a>';
	$html .= '</li>';				
	$html .= '<li>';
		$html .= '<a class="socialButton" href="#">';
			$html .= '<span class="menu_icon menu_share"></span>';
		$html .= '</a>';
	$html .= '</li>';		
	$html .= '</ul>';
	$html .= KWAKERS_DISPLAY_PAGE_searchForm();
	return $html;
}


// affichage du contenu de la page
function KWAKERS_DISPLAY_PAGE_content()
{
	return $GLOBALS["content"];
}


// affichage du pieds de page
function KWAKERS_DISPLAY_PAGE_footer()
{
	$html = "";
	$html .= "<p>CopyTout &copy; 2016 <a href='http://inspecteurdebug.free.fr' title='Visiter le site d Inspecteur Debug - reparateur d ordinateur'>Inspecteur Debug</a> - Powered by the amazing Gadget'o Chord Charts Library - kwakers.music(at) gmail.com</p>";
	return $html;
}


// affichage de la barre de recherche
function KWAKERS_DISPLAY_PAGE_searchForm()
{
	$html = "";
	$html .= '<div class="searchFormContainer">';
	$html .= '<form action="index">';			
		$html .= '<input name="q" placeholder="Tapez votre recherche. Ex : Miles davis" class="search-input" type="text" value="'.$GLOBALS["requestSearchBar"].'" />';
		$html .= '<div class="search-icon"><button></button></div>';
	$html .= '</form>';	
	$html .= '</div>';
	return $html;
}


	
?>