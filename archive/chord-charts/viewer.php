<?php
require_once(dirname(__FILE__)."/include/engine.php");
define("PAGE_CURRENT", 	PAGE_VIEWER);
KWAKERS_BDD_open();
$GLOBALS["content"] = KWAKERS_DISPLAY_VIEWER_content();
require_once(dirname(__FILE__)."/include/page.php");
KWAKERS_BDD_close();
?>