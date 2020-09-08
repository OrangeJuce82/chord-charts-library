<?php
/* Utilise l'encodage interne UTF-8 */
mb_internal_encoding("UTF-8");
require_once("../include/engine.php");

$nbModified = 0;
$error = "";

$requete = "SELECT * FROM ".IREALB_TABLE_NAME." WHERE Id > ".$_REQUEST["id"];
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
$index= 0;	
while($tab = mysql_fetch_assoc($query))
{	
  	$songToRead = array();				
	$songToRead["Titre"] = $tab["NewTitre"];
	$songToRead["Compositeur"] = $tab["NewCompositeur"];
	$songToRead["Style"] = $tab["NewStyle"];
	$songToRead["Tonalite"] = str_replace("-", "", $tab["Tonalite"]);
	$songToRead["Song"] = urldecode($tab["NewLien"]);
	$songToRead["Type"] = $tab["Type"];
		
	  	$ok = IREALB_PARSER_IREALB_stringToGrid($songToRead["Song"], $songToRead["Grille"]);
	  		 
	if($ok == false)
	{		
		$requete2 = "UPDATE ".IREALB_TABLE_NAME." SET `errorWhileAnalysing` = '1' WHERE `ireal_songs_modif`.`Id` =".$tab["Id"]." LIMIT 1"; 
		mysql_query($requete2);
		
		echo("\n");//.urldecode($tab["Id"])."\n" . urldecode($tab["NewLien"]));		echo("\n-----------------\n");
	}
}


?>

	</center>
</body>
</html>