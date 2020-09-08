
<?php
require_once("../include/connect.php");


$dir = "thread";
$files_tab = array("count"=>0,"data"=>array());
if(is_dir($dir))
{
    if($dh=opendir($dir))
    {
    	while(($file = readdir($dh)) !== false)
    	{
   			$files_tab["count"]++;
   			$files_tab["data"][] =  $file;
	    }
	}
}

$nbImported = 0;
$error = "";
for($i = 2; $i < $files_tab["count"]; $i++)
{
	$filepath = $_SERVER["DOCUMENT_ROOT"]."/tablatures/thread/".$files_tab["data"][$i];
	if(file_exists($filepath))
	{
		$handle = fopen($filepath, "r");
		if ($handle) {
			$html = "";
		    while (($buffer = fgets($handle, 4096)) !== false)
		    {
		        $html .= $buffer;
		    }

		    if( $html != "")
		    {	
			    //recupère toute les adresses qui ressemble à des tablatures
			  	$url = preg_match_all('/href="(irealb.*?)"/', $html, $match);

			  	for($k = 0 ; $k < count($match[1]) ; $k++)
			  	{
			  		//recup lien
					$link = $match[1][$k];

					//trouve la position de double slash et coupe la base et la donné
					$pos = strpos($link, "://");
					$baseUrl = substr($link, 0, $pos + 3);
					$dataLink = substr($link, $pos + 3);

					//sépare les chansons des playlists
					$songs = preg_split( "/\%3D\%3D\%3D|\=\=\=/", $dataLink);

					$nb = count($songs);

					for($j = 0; $j < $nb; $j++)
					{   
					  	$songData = preg_split( "/\%3D|\=/", $songs[$j]);
					  	$songLink = $baseUrl . $songs[$j];

					  	$songToImport = array("Titre"  => "","Compositeur"  => "","Style"  => "","Tonalite"  => "","Lien"  => "");
						$importSong = true;
						if(count($songData) == 10)
						{
							$songToImport["Titre"] = urldecode($songData[0]);
							$songToImport["Compositeur"] = urldecode($songData[1]);
							$songToImport["Style"] = urldecode($songData[3]);
							$songToImport["Tonalite"] = urldecode($songData[4]);
							$songToImport["Lien"] = $songLink;
						}
						else if(count($songData) == 6)
						{
							$songToImport["Titre"] = urldecode($songData[0]);
							$songToImport["Compositeur"] = urldecode($songData[1]);
							$songToImport["Style"] = urldecode($songData[2]);
							$songToImport["Tonalite"] = urldecode($songData[3]);
							$songToImport["Lien"] = $songLink;				
						}
						else
						{
							$importSong = false;
						}


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


					  ou le tableau ne contient qu'une ligne et c'est le nom d'une compilation, mais on ne s'en préocuppe pas pour le moment 

					  */
						
						if($importSong)
						{
							/*
							print_r($songToImport);
							print_r($songLink);
							echo "<a href='".$songLink."'>".$songLink."</a><br>";//.$link."<br>";
							*/

						    $values = array_map('mysql_real_escape_string', array_values($songToImport));
						    $keys = array_keys($songToImport);
						    
						    //print_r($values);
						    //print_r($keys);
						    $requete =  "INSERT INTO irealb_songs (`".implode('`,`', $keys)."`) VALUES ('".implode('\',\'', $values)."')";
						   	
						   	if(mysql_query($requete))
						   	{
								$nbImported++;
						   	}
						   	else
						   	{
						   		//$error .= $requete."<br>";
						   	}		
						}
					 	 
					}
				}
		    }
		    fclose($handle);

		}
		//penser à supprimer le fichier 
		unlink($filepath);
	}
}



?>




<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="refresh" content="60">
  <meta charset="utf-8">
</head>
<body>
	<center>
		<h1>Importation de chansons</h1>
		<p><?php echo $nbImported; ?> chansons importées<br><br>
		<i> done...wait while refreshing.</i></p>

		<p><?php echo $error; ?></p>
	</center>
</body>
</html>


