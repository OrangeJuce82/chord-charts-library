<?php
	
// affichage du viewer de partition 
function KWAKERS_DISPLAY_VIEWER_content()
{
	$html = "";
	try
	{
		if(isset($_REQUEST["id"]) && $_REQUEST["id"] != "" && is_numeric($_REQUEST["id"]))
		{
			KWAKERS_BDD_get("SELECT * FROM ".KWAKERS_TABLE_NAME." WHERE errorWhileAnalysing = 0 AND `Id` = ".$_REQUEST["id"]);
			
			if($GLOBALS["results"]["count"] == 0)
			{
				$GLOBALS["error"] = ERROR_ID_NOT_EXIST;
			}
			else
			{
				$tab = $GLOBALS["results"]["data"][0];
			  	$songToRead = array();				
				$songToRead["Titre"] = $tab["NewTitre"];
				$songToRead["Compositeur"] = $tab["NewCompositeur"];
				$songToRead["Style"] = $tab["NewStyle"];
				$songToRead["Tonalite"] = str_replace("-", "", $tab["Tonalite"]);
				$songToRead["Song"] = urldecode($tab["NewLien"]);
				$songToRead["Type"] = $tab["Type"];

		  		$toneEnd = "C";	  		
		  	  	KWAKERS_PARSER_IREALB_stringToGrid($songToRead["Song"], $songToRead["Grille"]);
		  	  		  	  	
		  	  	//prepare les données pour la tranposition 
		  	  	$toneEnd = $songToRead["Tonalite"];
		  	  	
		  		$noteTab = array(	"Cb"=>11, 	"C#"=>1, 	"C"=>0,
									"Db"=>1,	"D#"=>3,	"D"=>2,
									"Eb"=>3,	"E#"=>5,	"E"=>4,
									"Fb"=>4,	"F#"=>6,	"F"=>5,
									"Gb"=>6,	"G#"=>8,	"G"=>7,
									"Ab"=>8,	"A#"=>10,	"A"=>9,
									"Bb"=>10,	"B#"=>0,	"B"=>11 );
							
				if(isset($_REQUEST["transpose"]) && isset($noteTab[$_REQUEST["transpose"]]))
				{
					$toneEnd = $_REQUEST["transpose"];
				}
				
				$html .= KWAKERS_DISPLAY_VIEWER_menu($songToRead, $toneEnd);
				$html .= KWAKERS_DISPLAY_VIEWER_grille($songToRead, $noteTab, $toneEnd);
			}
		}
	}
	catch(Exception $e)
	{
		// erreur à changer
		$GLOBALS["error"] = ERROR_ID_NOT_EXIST;
	}
	return $html;
}




function KWAKERS_DISPLAY_VIEWER_grille($tab, $noteTab, $toneEnd)
{
	$html ='';
	$html .='<div id="grilleContainer" class="container">';
			
	$html .='<p id="titreGrille"><a href="'.PAGE_INDEX.'?q='.urlencode('"'.$tab['Titre'].'"').'">'.$tab["Titre"].'</a></p>';
	$html .='<table id="infosTab"><tr>';
		$html .='<td><a href="'.PAGE_INDEX.'?q='.urlencode('"'.$tab['Style'].'"').'">('.$tab["Style"].')</a></td>';
		$html .='<td><a href="'.PAGE_INDEX.'?q='.urlencode('"'.$tab['Compositeur'].'"').'">'.$tab["Compositeur"].'</a></td>';
	$html .='</tr></table>';
	$html .="<table id='grille'>";
	
	//initialisation des variables d'affichage
	$decalage = 0;
	$taille = "normal";
	
	//on parcours le tableau et on affiche chaque case avec son contenu
	foreach($tab["Grille"] as $index => $case)
	{
		//ouvre la ligne du tableau
		if($index % 16 == 0) $html .= "<tr>";
			
		
		// calcul de la taille des accords et du decalage vertical
		$decalage += 	($case["decalage"] == "Y") ? 45 : (
						($case["decalage"] == "YY") ? 90 : (
						($case["decalage"] == "YYY") ? 135 : 0));
					
		switch($case["taille"])
		{
			case "s" : $taille = "small"; break; 
			case "l" : $taille = "normal"; break; 
		}
		
		// ouvre la cellule
		$html .= "<td class='taille_".$taille."' style='top:".$decalage."px'>";

			
			// BARRE DE GAUCHE
			if($case["barreGauche"] != "")
			{					
				$classBarlineLeft = "";
				$image = "";
				switch($case["barreGauche"])
				{
					case "|" : $classBarlineLeft = "barlineSingleLeft"; $image = "<img alt='' src='css/img/single-bar.svg' width=2 height=77>" ; break;	
					case "[" : $classBarlineLeft = "barlineDoubleLeft"; $image = "<img alt='' src='css/img/double-bar.svg' width=7 height=77>" ; break;	
					case "{" : $classBarlineLeft = "barlineRepeatLeft"; $image = "<img alt='' src='css/img/repeat-bar.svg' width=14 height=85>" ; break;		
				}
				
				if($classBarlineLeft != "")	$html .=  "<span class='barline ".$classBarlineLeft."'>".$image."</span>";

			}
			
			// MARQUEUR
			if($case["label"] != "")
			{					
				$label = "";
				switch($case["label"])
				{
					case "*A" : $label = "label_A"; break; 
					case "*B" : $label = "label_B"; break; 
					case "*C" : $label = "label_C"; break; 
					case "*D" : $label = "label_D"; break; 
					case "*i" : $label = "label_i"; break; 
					case "*v" : $label = "label_v"; break; 
				}
				
				if($label != "") $html .=  "<span class='mark'><img alt='' src='css/img/".$label.".svg' width=26 height=28></span>";
			}
			
			// SYMBOLE
			if($case["symbole"] != "")
			{
				
				$classSymbol = "";
				switch($case["symbole"])
				{
					case "Q" : $classSymbol = "coda"; break; 
					case "f" : $classSymbol = "fermata"; break; 
					case "S" : $classSymbol = "segno"; break; 
				}

				if($classSymbol != "") $html .= "<span class='symbol ".$classSymbol."'></span>";
			}
			
			// SIGNATURE RYTHMIQUE
			if($case["signature"] != "")
			{
				$nbBeat = ""; $typeBeat = "";
				$strechClass = "";
				switch($case["signature"])
				{
					case "T22" : $nbBeat = 2; $typeBeat = 2; break; 
					case "T32" : $nbBeat = 3; $typeBeat = 2; break; 
					case "T24" : $nbBeat = 2; $typeBeat = 4; break; 
					case "T34" : $nbBeat = 3; $typeBeat = 4; break; 
					case "T44" : $nbBeat = 4; $typeBeat = 4; break; 
					case "T54" : $nbBeat = 5; $typeBeat = 4; break; 
					case "T64" : $nbBeat = 6; $typeBeat = 4; break; 
					case "T74" : $nbBeat = 7; $typeBeat = 4; break; 
					case "T38" : $nbBeat = 3; $typeBeat = 8; break; 
					case "T58" : $nbBeat = 5; $typeBeat = 8; break; 
					case "T68" : $nbBeat = 6; $typeBeat = 8; break; 
					case "T78" : $nbBeat = 7; $typeBeat = 8; break; 
					case "T98" : $nbBeat = 9; $typeBeat = 8; break; 
					case "T12" : $nbBeat = 12; $typeBeat = 8; $strechClass = " strech"; break; 
				}

				if($nbBeat != "" && $typeBeat != "")
				{
					$html .= "<span class='nbBeat".$strechClass."'>".$nbBeat."</span>";
					$html .= "<span class='typeBeat'>".$typeBeat."</span>";
					$html .= "<span class='signatureBar'><img alt='' src='css/img/signature_bar.svg' width=19 height=3></span>";					
				}
			}
			
			// FINS
			if($case["fin"] != "")
			{
				$ending = "";
				switch($case["fin"])
				{
					case "N0" : $ending = " "; break; 
					case "N1" : $ending = "1."; break; 
					case "N2" : $ending = "2."; break; 
					case "N3" : $ending = "3."; break; 
				}

				if($ending != "") $html .=  "<span class='ending'>".$ending."<img alt='' src='css/img/ending.svg' width=119 height=23></span>";
			}
			
			// TEXTE
			if($case["commentaire"] != "")
			{
   				preg_match("/<(\*[0-9]{1,2})?(.*)?>/", $case["commentaire"], $resultRegexTxt);
   				if(count($resultRegexTxt) == 3)
   				{
   					$resultRegexTxt[2] = str_replace(" ", "&nbsp;", $resultRegexTxt[2]);
   					$bottom = mb_substr($resultRegexTxt[1],1);
   					if($bottom == "") $bottom = 0;
   					else $bottom *= 1.56; // mise à l'échelle pour le viewer.css
   					
					$html .= "<span class='commentaire' style='bottom:".$bottom."px'>".$resultRegexTxt[2]."</span>";
				}
			}
			
			// LES SYMBOLES D'ACCORDS
			if($case["accordSymbole"] != "")
			{
				$symbole = "";
				$image = "";
				switch($case["accordSymbole"])
				{
					case "n":	$symbole = "noChord";	break;	
					case "x":	$symbole = "rootX";	$image = "<img alt='' src='css/img/root-x.svg' width=46 height=37>" ; break;	
					case "r":	$symbole = "rootR";	$image = "<img alt='' src='css/img/root-r.svg' width=48 height=37>" ;break;	
				}

				if($symbole != "") $html .=  "<span class='".$symbole."'>".$image."</span>";
			}
			
			// LES ACCORDS
			{
				$html .= "<div class='accordRegulier'>".	KWAKERS_DISPLAY_VIEWER_chord($case["accordRegulier"], $noteTab, $tab["Tonalite"], $toneEnd)  ."</div>";
				$html .= "<div  class='accordAlternatif'>".	KWAKERS_DISPLAY_VIEWER_chord($case["accordAlternatif"],  $noteTab, $tab["Tonalite"], $toneEnd)  ."</div>";
			}
			
			// BARRE DE DROITE
			if($case["barreDroite"] != "")
			{
				$classBarlineRight = "";
				$image = "";
				switch($case["barreDroite"])
				{
					case "|" : $classBarlineRight = "barlineSingleRight"; 	$image = "<img alt='' src='css/img/single-bar.svg' width=2 height=77>" ; break;	 
					case "]" : $classBarlineRight = "barlineDoubleRight"; 	$image = "<img alt='' src='css/img/double-bar.svg' width=7 height=77>" ; break;	
					case "}" : $classBarlineRight = "barlineRepeatRight"; 	$image = "<img alt='' src='css/img/repeat-bar.svg' width=14 height=85>" ; break;		
					case "Z" : $classBarlineRight = "barlineFinalRight"; 	$image = "<img alt='' src='css/img/final-bar.svg' width=10 height=77>" ; break;		
				}	
						
				if($classBarlineRight != "") $html .= "<span class='barline ".$classBarlineRight."'>".$image."</span>";
			}
		$html .= "</td>";
	
		
		//ferme la ligne du tableau
		if($index % 16 == 15) $html .= "</tr>";	
	}

	$html .= "</table>";
	$html .= "<p style='height:".($decalage)."px'></p>";
	$html .= "</div>";

	return $html;
}


function KWAKERS_DISPLAY_VIEWER_chord($chord, $noteTab, $toneStart, $toneEnd)
{
	$html = "";
	
	// LES ACCORDS ET MOT CLES
	if($chord["fondamentale"] != "W" && $chord["fondamentale"] != "")
	{
		$fondamentale = KWAKERS_PROCESS_CHORD_transpose($chord["fondamentale"], $noteTab, $toneStart, $toneEnd);
		
		$note = mb_substr($fondamentale,0,1);
		$bemol = str_replace(array("b","#"), array("<span class='symbol♭'>♭</span>","<span class='symbol♯'>♯</span>"), mb_substr($fondamentale,1));


		$html .= "<span class='accordbemol'>".$bemol."</span>";
		$html .= "<span class='accord accord_".$note."'>".$note."</span>";		
	}
	
	if($chord["enrichissement"] != "")
	{	
	    $qualite = str_replace(array("-","b","#","^","h","o"),array("–","♭","♯","∆","Ø","°"), $chord["enrichissement"]);
	    
	    $qualiteSpan =  preg_replace('/(69)/', '<span class="bar"></span>$1', $qualite);
		$qualiteSpan =  preg_replace('/([1-9]{1})/', '<span class="chiffre">$1</span>', $qualiteSpan);
		$qualiteSpan = str_replace(array("+","–","add","sus","alt","♭","♯","∆","Ø","°"),
					array(  "<span class='symbolplus'>+</span>",
						 	"<span class='symbol-'>–</span>",
							"<span class='symboladd'>add</span>",
							"<span class='symbolsus'>sus</span>",
							"<span class='symbolalt'>alt</span>",
							"<span class='symbol♭'>♭</span>",
							"<span class='symbol♯'>♯</span>",
							"<span class='symbol∆'>∆</span>",
							"<span class='symbolØ'>Ø</span>",
							"<span class='symbol°'>°</span>"), $qualiteSpan);
		    								
		$html .= "<span class='accordquality quality_".$qualite."'>".$qualiteSpan."</span>";	
	}
	
	// BASSE DES ACCORDS
	if($chord["basse"] != "")
	{
		$basse = KWAKERS_PROCESS_CHORD_transpose(mb_substr($chord["basse"],1), $noteTab, $toneStart, $toneEnd);
		
		$note = mb_substr($basse,0,1);
		$bemol = str_replace(array("b","#"), array("<span class='symbol♭'>♭</span>","<span class='symbol♯'>♯</span>"), mb_substr($basse,1));
		
		$html  .= "<span class='accordbasse accord_".$note."'>".$note."</span>";
		$html  .= "<span class='accordbassebemol'>".$bemol."</span>";
		$html  .= "<span class='accordbasseSeparator'><img alt='' src='css/img/slash.svg' width=21 height=22></span>";
	}

	// TEXTE DES ACCORDS
	if($chord["texte"] != "")
	{
		//preg match pour prendre juste les truc entre *
		$texte = str_replace(" ", "&nbsp;", mb_substr($chord["texte"], 1, -1));
		$html  .= "<span class='accordtexte'>".$texte."</span>";
	}
	
	return $html;
}			
		
function KWAKERS_DISPLAY_VIEWER_menu($songToRead, $toneEnd)
{	
	$html = '<div id="song_menu" class="menu">';
		$html .= '<ul class="left">';
			$html .= '<li>';
			//previous ID		
			{				
				$requete = "SELECT Id FROM ".KWAKERS_TABLE_NAME." WHERE errorWhileAnalysing = 0 AND Id = (SELECT MAX(Id) FROM ".KWAKERS_TABLE_NAME." WHERE errorWhileAnalysing = 0 AND Id < ".$_REQUEST["id"].")";
				$queryResult = $GLOBALS["connection"]->query($requete);
				$tab = mysqli_fetch_array($queryResult);
				if(isset($tab["Id"]) && $tab["Id"] != "" && is_numeric($tab["Id"]))
				{
					$html .= '<a class="next" href="'.PAGE_VIEWER.'?id='.$tab['Id'].'">';
						$html .= '<span class="menu_icon menu_previous"></span>';
					$html .= '</a>';	
				}
			}	
			$html .= '</li>';
			$html .= '<li>';
				$html .= KWAKERS_DISPLAY_SONG_type($songToRead["Type"]);
			$html .= '</li>';	
			$html .= '<li>';
			//next ID
			{
				$requete = "SELECT Id FROM ".KWAKERS_TABLE_NAME." WHERE errorWhileAnalysing = 0 AND Id = (SELECT MIN(Id) FROM ".KWAKERS_TABLE_NAME." WHERE errorWhileAnalysing = 0 AND Id > ".$_REQUEST["id"].")";
				$queryResult = $GLOBALS["connection"]->query($requete);
				$tab = mysqli_fetch_array($queryResult);
				if(isset($tab["Id"]) && $tab["Id"] != "" && is_numeric($tab["Id"]))
				{
					$html .= '<a class="previous" href="'.PAGE_VIEWER.'?id='.$tab['Id'].'">';
						$html .= '<span class="menu_icon menu_next"></span>';
					$html .= '</a>';	
				}		
			}
			$html .= '</li>';
		$html .= '</ul>';

		$html .= '<ul class="right">';
			$html .= '<li>';
			$html .= '<a target="_blank" href="'.PAGE_DOWNLOAD.'?id='.$_REQUEST['id'].'">';			
				$html .= '<span class="menu_icon menu_download"></span>';
			$html .= '</a>';
			$html .= '</li>';
			$html .= '<li>';
				$html .= '<a onclick="window.print();return false;" href="#">';
					$html .= '<span class="menu_icon menu_print"></span>';
				$html .= '</a>';
			$html .= '</li>';
			$html .= '<li>';
				$html .=  KWAKERS_DISPLAY_VIEWER_transposeSelect($songToRead, $toneEnd);
			$html .= '</li>';	
		$html .= '</ul>';
	$html .= '</div>';
	
	return $html;
}


// affichage du type de grille
function KWAKERS_DISPLAY_SONG_type($type)
{
	$html = "";
	switch($type)
	{
		case IREALB_TYPE_IREALB : 
			$html .= '<span class="song_type type_irealb">IREALB</span>';
			break;
		case IREALB_TYPE_IREALBOOK : 
			$html .= '<span class="song_type type_irealbook">IREALBOOK</span>';
			break;
		case IREALB_TYPE_NONE : 
		default : 
			$html .= '<span class="song_type type_none">IREALB</span>';
			break;	
	}
	return $html;
}


function KWAKERS_DISPLAY_VIEWER_transposeSelect($song, $toneEnd = "C")
{
	$html = "";
	
	if(isset($_REQUEST["id"]) && $_REQUEST["id"] != "" && is_numeric($_REQUEST["id"]))
	{
		$html .= '<select id="transposeSelect">';

		$noteTab = array("C"=>0,"C#"=>1,"Db"=>1,"D"=>2,"D#"=>3,"Eb"=>3,"E"=>4,"F"=>5,"F#"=>6,"Gb"=>6,"G"=>7,"G#"=>8,"Ab"=>8,"A"=>9,"A#"=>10,"Bb"=>10,"B"=>11);

		$lien = PAGE_VIEWER.'?id='.$_REQUEST["id"];
		foreach($noteTab as $chord => $indexTranspose)
		{
			$selected = ($toneEnd == $chord)? 'selected="selected"' : '';
			$std = ($song["Tonalite"] == $chord)? ' (standard)' : '';
			$html .= '<option value="'.$lien.'&transpose='.urlencode($chord).'" '.$selected.'>'.$chord.$std.'</option>';
		}
		$html .= '</select>';	
	}
	return $html;
}

?>