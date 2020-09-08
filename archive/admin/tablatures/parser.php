<?php
/* Utilise l'encodage interne UTF-8 */
mb_internal_encoding("UTF-8");
require_once("../include/engine.php");

$nbModified = 0;
$error = "";

$requete = "SELECT * FROM ".IREALB_TABLE_NAME." WHERE Type = 2 AND Id > 8500 LIMIT 500";
$query = mysql_query($requete);

?>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta charset="utf-8">
</head>
<body>
	<center>

<?php
	
while($tab = mysql_fetch_assoc($query))
{	
	//foreach($tab as $key => $value)
	{
		//echo("<p>".$key . " : " . htmlspecialchars(htmlspecialchars_decode(urldecode($value),ENT_QUOTES))."</p>");
		//echo("<p>". htmlspecialchars(urldecode($tab["Id"]))."</p>");
		//echo("<p>". htmlspecialchars(urldecode($tab["NewLien"]))."</p>");

		$grille = array();
		// trim, et suppresion de saut de ligne (%0A)=>chr(10)
		$input = rtrim(str_replace(chr(10),"",urldecode($tab["NewLien"])));
		$input = str_replace("}#","}",$input);
		$input = str_replace("ƒ","",$input);
		$input = str_replace("«","",$input);
		
		
		IREALB_PARSER_IREALB_stringToGrid($input, $grille);		
		//print_r($grille);
		//die;
	}
}


?>

	</center>
</body>
</html>