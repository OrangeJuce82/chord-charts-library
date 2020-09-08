<?php
require_once(dirname(__FILE__)."/../include/engine.php");
KWAKERS_BDD_open();
//remplissage des champs nécessaire à l'affichage de la page
$html = "";
$requestSearchBar="";
if((isset($_REQUEST["q"]) && $_REQUEST["q"] != "") 
|| (isset($_REQUEST["fl"]) && $_REQUEST["fl"] != ""))
{
	//lr = last Record
	$lastRecord = (isset($_REQUEST["lr"]) && $_REQUEST["lr"] != "" && is_numeric($_REQUEST["lr"]))? $_REQUEST["lr"] : 0;
			
	KWAKERS_DISPLAY_INDEX_search($lastRecord);
	if($GLOBALS["results"]["count"] > 0)
	{ 
		foreach($GLOBALS["results"]["data"] as $song)
		{
			$html .= KWAKERS_DISPLAY_RESULTS_line($song);
		}
	}
}
echo $html;
KWAKERS_BDD_close();
?>