<?php
require_once(dirname(__FILE__)."/include/engine.php");
define("PAGE_CURRENT", 	PAGE_STATS);
KWAKERS_BDD_open();
$GLOBALS["content"] = KWAKERS_DISPLAY_STATS_content();
require_once(dirname(__FILE__)."/include/page.php");
KWAKERS_BDD_close();
?>