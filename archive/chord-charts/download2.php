<?php
require_once(dirname(__FILE__)."/include/engine.php");
define("PAGE_CURRENT", PAGE_DOWNLOAD);
KWAKERS_BDD_open();
$link = PAGE_INDEX;
if(isset($_REQUEST["id"]) && $_REQUEST["id"] != "" && is_numeric($_REQUEST["id"]))
{
	KWAKERS_BDD_get("SELECT * FROM ".KWAKERS_TABLE_NAME." WHERE `Id` = ".$_REQUEST["id"]);
	if(isset($GLOBALS["results"]["data"][0]) && isset($GLOBALS["results"]["data"][0]["Lien"]))
	{
		KWAKERS_BDD_execute("UPDATE ".KWAKERS_TABLE_NAME." SET `DernierTelechargement` =  NOW(),  `NbTelechargement` = `NbTelechargement` + 1 WHERE `Id` = ".$_REQUEST["id"]);
		$link = htmlspecialchars_decode($GLOBALS["results"]["data"][0]["Lien"],ENT_QUOTES);
	}
}
KWAKERS_BDD_close();	
echo("<script>window.location.replace(\"".$link."\");</script>");
//header('Location: '.$link);
?>