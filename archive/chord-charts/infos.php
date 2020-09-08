<?php
require_once(dirname(__FILE__)."/include/engine.php");
define("PAGE_CURRENT", 	PAGE_INFOS);
$GLOBALS["content"] = KWAKERS_DISPLAY_INFOS_content();
require_once(dirname(__FILE__)."/include/page.php");
?>