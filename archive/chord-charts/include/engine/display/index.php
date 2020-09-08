<?php

 //___________________________________//
////////////// ACCUEIL ////////////////

function KWAKERS_DISPLAY_INDEX_content()
{
	$html = '<div class="accueilContainer">';
	$html .= '<h1><img alt="" src="css/img/logo-small.png"> Chord Charts Library</h1>';
	$html .= KWAKERS_DISPLAY_PAGE_searchForm();
	$html .= '<p>Bienvenue sur l’application web <strong>Chord Charts Library</strong>. Cette application a été développée dans le but de fournir un moteur de recherche de fichiers pour le logiciel iReal Pro, et ainsi permettre à tous les musiciens de pouvoir <strong>imprimer des grilles d’accords GRATUITEMENT</strong>.</p>';
	$html .= '<p>Cette application utilise deux formats, le format iRealb et iRealbook, et depuis peu notre application permet de <strong>visualiser les fichiers iRealb et iRealBook directement en ligne</strong>.</p>';
	$html .= '<p>Pour visualiser une grille d’accord, il vous suffit de faire une recherche et de cliquer sur le bouton <img alt="" src="css/img/view.png">.</p>';
	$html .= '<p>Si vous voulez ouvrir le fichier sous iReal Pro, il vous suffit de cliquer sur le bouton <img alt="" src="css/img/download.png">.</p>';
	
	
	$html .= '<br><br>Et aussi parce quand on est musicien, on fait un peu ce qu\'on veut, voici mes petites idées musicale : <br>';
	$html .= '<iframe width="560" height="315" src="https://www.youtube.com/embed/_sujjMGwfag?list=PLYPWZupxOacXTeM8H_eImysJmW24tozNH" frameborder="0" allowfullscreen></iframe>';
	
	$html .= '</div>';
	return $html;
}
	
	
function KWAKERS_DISPLAY_INDEX_menu()
{
	$firstLetter = (isset($_REQUEST["fl"]) && $_REQUEST["fl"] != "")? $_REQUEST["fl"] : "";	
	
	$html = "";
	$html .= '<div id="index_menu" class="menu"><ul>';
	// construit l'index 
	foreach($GLOBALS["letters"] as $letter)
	{
		$html .= '<li '.(($letter == $firstLetter)? 'class="menu_active"': '').'><a class="next" href="'.PAGE_INDEX.'?fl='.$letter.'">'.$letter.'</a>';
	}
	$html .= '</ul></div>';
	return $html;
}
	

		
function KWAKERS_DISPLAY_INDEX_search($lastRecord = 0)
{
	$requete = "";
	$condition = "";
	
	if(isset($_REQUEST["q"]) && $_REQUEST["q"] != "")
	{
		try
		{	
			$GLOBALS["requestSearchBar"] = htmlspecialchars(stripslashes($_REQUEST["q"]));
			preg_match_all('/\"[^\"]*\"|[^\s]+/', htmlspecialchars($_REQUEST["q"], ENT_NOQUOTES), $tabParam);
			
			if(isset($tabParam[0]))
			{
				$nbParam = count($tabParam[0]);
				for($k = 0; $k < $nbParam; $k++)
				{
					$param = addslashes(htmlspecialchars_decode(str_replace('"', '', $tabParam[0][$k]),ENT_NOQUOTES));
					$condition .= " AND (NewTitre LIKE '%".$param ."%' OR NewCompositeur LIKE '%".$param ."%' OR NewStyle LIKE '%".$param ."%')";	
				}
			}
		} 
		catch (Exception $e)
		{
		}
	}
		
	if(isset($_REQUEST["fl"]) && $_REQUEST["fl"] != "" && in_array(strtolower($_REQUEST["fl"]), $GLOBALS["letters"]))
	{
		$regexp = "";
		$condition .= " AND `NewCompositeur` ";
		switch(strtolower($_REQUEST["fl"]))
		{
			// SPECIAL CHAR
			case "..." :	
				$condition .= "NOT REGEXP '^[0-9A-Za-z]'";
				break;
			
			// NUMERIC
			case "0-9" :	$condition .= "REGEXP '^[0-9]'";	break;
	
			// NO ACCENT LETTERS
			default : 		
				$condition .= "REGEXP '^[".strtolower($_REQUEST["fl"]).strtoupper($_REQUEST["fl"])."]'";		break;
				break;
		}
	}
	try
	{			
		$requete .= "SELECT * FROM ".KWAKERS_TABLE_NAME." WHERE errorWhileAnalysing = 0 AND 1 ";
		$requete .= $condition;
		$lastRecord = (is_numeric($lastRecord) && $lastRecord > 0)? $lastRecord : 0;
		$requete .= " ORDER BY NewCompositeur, NewTitre LIMIT ".$lastRecord." , ".TAB_RESULT_LENGTH;	
	} 
	catch (Exception $e)
	{
	}
	
	KWAKERS_BDD_get($requete);
}


?>