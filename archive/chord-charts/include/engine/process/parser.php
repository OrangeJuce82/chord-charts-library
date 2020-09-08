<?php
	
//_____________________________________//
////////////// PARSER  /////////////////

function KWAKERS_PARSER_IREALB_pregMatch($regexp, & $input, & $output, $virgule = false)
{
	//teste une expression reguliere et ajoute à la valeur au tableau passé en paramètre
	// l'expression doit être de la forme (?P<barreGauche>[\|\[\{]), avec un seul label au sein de l'expression
	//si l'expression a été trouvé la chaine en entrée est tronquée /// ABC trouve A donne BCaa@
	// retourne 1 si ok, 0 si l'expression n'a rien trouvé,

	//supprime tout les virgules en début de chaine
	if($virgule && preg_match("/^(?P<virgule>\,*)/", $input, $matches) === 1)
	{
		$input = mb_substr($input,mb_strlen($matches["virgule"]));		
	}
	
	if(preg_match("/^". $regexp . "/", $input, $matches) === 1)
	{		
		//parcours toutes les autres valeurs et les ajoute au tableau
		foreach($matches as $key => $value)
		{
			//on ne prend que les ID associatif, pas les numeriques
			if(is_numeric($key))
			{
				continue;
			}
			
			// ajoute la valeur et raccourci la chaine de caractère
			$output[$key] = $value;				
			$input = mb_substr($input,mb_strlen($value));
		}
		return true;
	}
	return false;
}



 //___________________________________________________//
////////////// FONCTIONS DE DECRYPTAGE ////////////////

// fonction qui inverse une chaine de caractère
function KWAKERS_PARSER_reverse($input){
    preg_match_all('/./us', $input, $matches);
    return join('', array_reverse($matches[0]));
}

// fonction de décryptage nécessaire pour les fichiers IREALB
function KWAKERS_PARSER_decrypt50($input)
{
	if(mb_strlen($input) < 50)
	{
		return $input;
	}
	
	return (KWAKERS_PARSER_reverse(mb_substr($input,45,5,'UTF-8'))
				. mb_substr($input,5,5,'UTF-8')
				. KWAKERS_PARSER_reverse(mb_substr($input,26,14,'UTF-8'))
				. mb_substr($input,24,2,'UTF-8')
				. KWAKERS_PARSER_reverse(mb_substr($input,10,14,'UTF-8'))
				. mb_substr($input,40,5,'UTF-8')
				. KWAKERS_PARSER_reverse(mb_substr($input,0,5,'UTF-8')));
}





function KWAKERS_PARSER_IREALB_stringToGrid(& $input, & $grille)
{	
	//tout d'abord on remplace XyQ par trois espaces blancs et Kcl par '| x'
	$input = str_replace(array('XyQ','Kcl'), array('   ','| x'), $input);
	
	$accord = array("fondamentale" => "",	"enrichissement" => "", 	"texte" => "",		"basse" => "");
	$case = array(	"barreGauche" => "",
					"decalage" => "",
					"label" => "",
					"commentaire" => "",
					"symbole" => "",
					"stop" => "",
					"signature" => "",
					"fin" => "",
					"taille" => "",
					"accordSymbole" => "",
					"accordRegulier" => $accord,
					"accordAlternatif" => $accord,
					"barreDroite" => "");
	
	// init regexp					
	$regexpGauche = array(
					"(?P<barreGauche>[\|\[\{])",
					"(?P<decalage>[Y]{1,3})",	
					"(?P<label>\*[ABCDiv])",	
					"(?P<commentaire>\<.*?\>)",	
					"(?P<symbole>[QSf])",	
					"(?P<stop>[U])",
					"(?P<signature>T[0-9][0-9])",	
					"(?P<fin>N[0-3])",	
					"(?P<taille>[ls])");
	
	$regexpQualite = str_replace(array("-","^","+"),array("\-","\^","\+"),ACCORDS_QUALITE_LISTE);	
	$regexpAccord = str_replace("#","\#",ACCORDS_LISTE);				
	$regexpAccordBasse = "\/".str_replace("|","|\/",$regexpAccord);	
	
	// une grille est composé de plusieurs lignes de 16 cases
	// chaque case peut se voir attribuer plusieurs élements dans une certaine logique
	// nous allons parser la chaine ireal, pour ranger les élèments dans notre tableau
	try
	{
		do
		{	
			$currentCase = $case;
			$oldInput = $input;
			
			// vu que les données peuvent parfois être mélangés, on parcours toutes les regexp qui sont à gauche des accords pour vérifier qu'on les trouves pas, et si on en trouve plus alors on passe aux regexp des accords.			
			{
				// reinitialise les regexp de gauche
				$regexps = $regexpGauche;
				$test = false;
				do
				{
					$test = false;
					foreach($regexps as $index => $regexp)
					{
						if(KWAKERS_PARSER_IREALB_pregMatch($regexp, $input, $currentCase, true))
						{
							unset($regexps[$index]);				
							$test = true;
						} 	
					}
					
				}
				while($test);
			}
						
			//si je trouve quelque choses qui n'est pas un accord, alors je peux sauter les deux étapes d'après
			if(KWAKERS_PARSER_IREALB_pregMatch("(?P<accordSymbole>LZ|[n|x|r|p| ])", $input, $currentCase, true) == false)
			{
				//si je trouve un accord , alors je peux trouver un enrichissement ou un texte d'accord, puis un basse
				//le W est une fondamentale vide
				 
				$regulier = $accord;
				if(KWAKERS_PARSER_IREALB_pregMatch("(?P<fondamentale>".$regexpAccord."|W)", $input, $regulier, true))
				{	
					KWAKERS_PARSER_IREALB_pregMatch("(?P<enrichissement>".$regexpQualite.")", $input, $regulier, false);
					KWAKERS_PARSER_IREALB_pregMatch("(?P<texte>\*.*?\*)", $input, $regulier, false);
					KWAKERS_PARSER_IREALB_pregMatch("(?P<basse>".$regexpAccordBasse.")", $input, $regulier, false);
					
					// astuce pour ID 776 => 
					//KWAKERS_PARSER_IREALB_pregMatch("(?P<texte>[a-zA-Z0-9]+) ", $input, $regulier, false);
					
					$currentCase["accordRegulier"] = $regulier;
				}
			}
			
			// si je trouve un contenu entre parenthese alors j'ai trouvé un accord alternatif
			if(preg_match("/^\,?(?P<accordAlternatif>\(.*?\))/", $input, $matches))
			{
				$input = mb_substr($input,mb_strlen($matches["accordAlternatif"]));
				
				$matches["accordAlternatif"] = mb_substr($matches["accordAlternatif"],1, -1);
				
				$alternatif = $accord;
				KWAKERS_PARSER_IREALB_pregMatch("(?P<fondamentale>".$regexpAccord."|W)", $matches["accordAlternatif"], $alternatif, false);
				KWAKERS_PARSER_IREALB_pregMatch("(?P<enrichissement>".$regexpQualite.")", $matches["accordAlternatif"], $alternatif, false);
				KWAKERS_PARSER_IREALB_pregMatch("(?P<texte>\*.*?\*)", $matches["accordAlternatif"], $alternatif, false);
				KWAKERS_PARSER_IREALB_pregMatch("(?P<basse>".$regexpAccordBasse.")", $matches["accordAlternatif"], $alternatif, false);
				$currentCase["accordAlternatif"] = $alternatif;
					
			}
			
			KWAKERS_PARSER_IREALB_pregMatch("(?P<barreDroite>[Z\|\]\}])", $input, $currentCase, true);
			
			if(isset($_REQUEST["debug"])){
				
		  	  	print_r($currentCase);
		  	  	print_r($input);
		  	}
	  	  	
			if($oldInput != $input)
			{
				$grille[] = $currentCase;	
			}
			else
			{
				//print_r($input);
				//print_r($grille);
				//die;
				return false;	
			}
		}
		while($input != "");
		
		// parcours toute la grille et corrige certaines erreurs, ou bizarrerie comme LZ, et les barre de fin qui se repetent en debut de ligne
		$nbCase = count($grille);
		for($i = 0 ; $i < $nbCase; $i++)
		{
			// si LZ on rajoute une barre gauche à l'élement suivant, cela évite d'avoir une barre gauche et droite à la fois
			if($grille[$i]["accordSymbole"] == "LZ" && isset($grille[$i+1]))
			{
				$grille[$i+1]["barreGauche"] = "|";
			}
			
			// si la barre gauche est en début de ligne, on l'ajoute à la fin de la ligne précedente 
			if($grille[$i]["barreGauche"] == "|" && ($i % 16) == 0  && isset($grille[$i-1]) && $grille[$i-1]["barreDroite"] == "")
			{
				$grille[$i-1]["barreDroite"] = "|";
			}
			
			// si la barre de droite est en fin de ligne, on l'ajoute à la fin de la ligne précedente 
			if($grille[$i]["barreDroite"] == "|" && ($i % 16) == 15  && isset($grille[$i+1]) && $grille[$i+1]["barreGauche"] == "")
			{
				$grille[$i+1]["barreGauche"] = "|";
			}
		}
		
		// ajoute des lignes au tableau si, l'index n'est pas modulo de 16
		$mod16 = (count($grille) % 16);
		if($mod16 != 0)
		{		
			for( ; $mod16 < 16; $mod16++)
			{
				$grille[] = $case;
			}	
		}
	}
	catch (Exception $e)
	{
		//print_r($grille);
		//print_r($input);
		return false;
	}
	
	return true;
}
	
	
?>