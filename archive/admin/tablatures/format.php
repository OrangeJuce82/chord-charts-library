<?php
/* Utilise l'encodage interne UTF-8 */
mb_internal_encoding("UTF-8");
require_once("../include/engine.php");

$nbModified = 0;
$error = "";

$requete = "SELECT * FROM ".IREALB_TABLE_NAME." WHERE Id=7037";//NewCompositeur = '' AND Type = 0 AND NewLien = ''";

$query = mysql_query($requete);

while($tab = mysql_fetch_assoc($query))
{	
	
	$newcompositeur = htmlspecialchars_decode(urldecode($tab["Compositeur"]),ENT_QUOTES);
	$newstyle = htmlspecialchars_decode(urldecode($tab["Style"]),ENT_QUOTES);
	$newtitre = htmlspecialchars_decode(urldecode($tab["Titre"]),ENT_QUOTES);
	
	$newlien = "";
	$type = 0;
	
	// COMPOSITEUR
	$compositeurTab = preg_split( "/ /", $tab["Compositeur"]);
	if(count($compositeurTab) == 2)
	{
		$newcompositeur = $compositeurTab[1]." ".$compositeurTab[0];//on inverse le nom et le prénom
	}
	
	// on peut trouver ce separateur ' + ' dans les liens ce qui n'a pas lieu d'etre
	$tab["Lien"] = str_replace("' + '", "", $tab["Lien"]);
	
	// LIEN 
	$link = htmlspecialchars_decode(urldecode($tab["Lien"]),ENT_QUOTES);
	
	//trouve la position de double slash et coupe la base et la donné
	$pos = strpos($link, "://");
	$baseUrl = substr($link, 0, $pos + 3);
	$dataLink = substr($link, $pos + 3);
	
	//sépare les chansons des playlists
	{	
		$newlien = "";
		$songData = preg_split( "/\%3D|\=/", $dataLink);
		$songLink = $baseUrl . $songs[$j];
	  	
/*
le tableau comporte 10 lignes mais seulement 8 champs sont remplis ce qui correspond à notre base de données

    [0] => Deja Vu
    [1] => Rosenwinkel Kurt
    [2] => 
    [3] => Waltz
    [4] => C
    [5] => 
    [6] => 1r34LbKcu7LD/#Fb^LZB-GZLE/DZLE/7-#ZFLB/EZL7-DZL7-b7/DLZG43T[ZLF/bC#-7,DZLbB/bEZL#F/BLZ7^FZL7-DZL7-#D/ALZD,7^BZC/GLZA-6 LZBb-7LZEb7susadd3LZC7susadd3LZx | 
    [7] => Jazz-Medium Swing
    [8] => 135
    [9] => 3


  ou le tableau contient 6 lignes mais seulement 5 champs sont remplis, ireal pro met le tempo , le groove, et les repetition par defaut 

  	[0] => Better Days Ahead
    [1] => Metheny Pat
    [2] => Bossa Nova
    [3] => C
    [4] => n
    [5] => [E^/F# B^ |G/A   |D^ D7 |G^   |E-7 F#-7 |T24B-7 |T34A-7 D7 |Ab-7 Db7 |T44F#^ |Fh Bb7b9 |Eb-7 Ab7 |Ab-7 Db7 |F#^ F#7#5 |B^ Bb-7 |Eb-7 Eb-7/Db |C-7b5   |B^   |F#^ A/F# |F#69 A/F# |F#^ A/F# |,Q,F#69 G/F# |Eb-7 Ab7 |Ab-7 Db7 |Gadd9       ]|QEb-7 Ab7 |Ab-7 Db7 |Bb-7 Eb7 |B-7 E7 |Bb-7 Eb7 |Ab-7 Db |Gadd9       Z 

*/
					  
					  
		if(count($songData) == 10)
		{
			$prefix = "1r34LbKcu7";
			$songWithoutPrefix = substr($songData[6], strlen($prefix));
			$songTruncate =  rtrim($songWithoutPrefix);
			echo $songWithoutPrefix;die;
			$arrChar = array();
			$nb = mb_strlen($songTruncate,'UTF-8');
			for($i = 0; $i < $nb; $i += 50)
			{
				$arrChar[] = mb_substr($songTruncate, $i + 0, 50, 'UTF-8');
			}
			
			
			$nbArrChar = count($arrChar);
			$newlien = "";
			
			$decrypted = "";
			for($indexArrChar = 0; $indexArrChar < $nbArrChar; $indexArrChar++)
			{
				//decrypte par tranche de 50 charactère sauf pour les 50 derniers.
				if($indexArrChar == $nbArrChar - 1)
				{
					$decrypted .= $arrChar[$indexArrChar];
					echo  $arrChar[$indexArrChar];
					die;
				}
				else
				{
					$decrypted .= IREALB_decrypt50($arrChar[$indexArrChar]);
				} 
			}
			$newlien = $decrypted;
			$type = 2;//"IREALB";
		}
		else if(count($songData) == 6)
		{
			$newlien = $songData[5];
			$type = 1;//"IREALBOOK";
		}
		else
		{
			echo "############## ERROR ##############";die;
			
		}			
	}		
	
	echo $link."<hr>\n".$newlien;die;
	
	$newcompositeur =  addslashes($newcompositeur);
	$newlien =  addslashes(urlencode($newlien));
	$newstyle =  addslashes($newstyle);
	$newtitre =  addslashes($newtitre);
	
	$requete = 'UPDATE '. IREALB_TABLE_NAME.'	 SET `Lien` =  "'. $tab["Lien"] .'", `Type` =  "'.$type.'",  `NewTitre` =  "'.$newtitre.'",  `NewStyle` =  "'.$newstyle.'", `NewCompositeur` =  "'.$newcompositeur.'",  `NewLien` = "'.$newlien.'" WHERE `Id` = '.$tab["Id"];
	
	//UPDATE ireal_songs_modif SET `Type` =  0, `NewCompositeur` =  "", `NewTitre` =  "", `NewStyle` =  "",  `NewLien` = "" WHERE 1

	//echo urldecode($newlien);die;
	
	if(mysql_query($requete))
   	{
		$nbModified++;
   	}
   	else
   	{
	  echo $requete; die;
   	}
}
	 					  
					  
?>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<!--  <meta http-equiv="refresh" content="60"> -->
  <meta charset="utf-8">
</head>
<body>
	<center>
		<h1>Importation de chansons</h1>
		<p><?php echo $nbModified; ?> chansons importées<br><br>
		<i> done...wait while refreshing.</i></p>

	</center>
</body>
</html>






