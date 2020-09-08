<?php
require_once(dirname(__FILE__)."/include/engine.php");
define("PAGE_CURRENT", 	PAGE_INDEX);
KWAKERS_BDD_open();
$GLOBALS["content"] .= KWAKERS_DISPLAY_INDEX_menu();
if(isset($_REQUEST["q"]) || isset($_REQUEST["fl"]))
{
	KWAKERS_DISPLAY_INDEX_search();
	if($GLOBALS["results"]["count"] > 0)
	{
		$GLOBALS["content"] .= KWAKERS_DISPLAY_RESULTS_Table("", "results", true);
	}
	else
	{
		$GLOBALS["content"] .= KWAKERS_DISPLAY_MESSAGE_infos(INFOS_NO_RESULTS);
	}
}
else
{
	$GLOBALS["content"] .= KWAKERS_DISPLAY_INDEX_content();	
}
require_once(dirname(__FILE__)."/include/page.php");
KWAKERS_BDD_close();
?>