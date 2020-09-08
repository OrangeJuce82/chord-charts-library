<?php
require_once(dirname(__FILE__)."/include/engine.php");
define("PAGE_CURRENT", PAGE_RANDOM);
KWAKERS_BDD_open();
$link = PAGE_INDEX;
if(isset($_REQUEST["type"]) && $_REQUEST["type"] != "")
{
	KWAKERS_BDD_get("SELECT * FROM `".KWAKERS_TABLE_NAME."` WHERE errorWhileAnalysing = 0 ORDER BY rand() limit 1");
	if(isset($GLOBALS["results"]["data"][0]) && isset($GLOBALS["results"]["data"][0]["Id"]))
	{
		$link = PAGE_VIEWER."?id=".$GLOBALS["results"]["data"][0]["Id"];	
	}	
}
KWAKERS_BDD_close();
header('Location: '.$link);
?>