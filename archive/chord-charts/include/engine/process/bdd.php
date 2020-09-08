<?php
	
//______________________________________________________________//
////////////// CONNEXION ET FONCTIONS DE LA BDD  /////////////////

// connexion à la base de données
function KWAKERS_BDD_open()
{	
	try
	{
		$GLOBALS["connection"] = mysqli_connect("sql.free.fr","kwakers","xVZ1KDc4","kwakers");
		$GLOBALS["connection"]->query("SET NAMES 'utf8'");
	}
	catch(Exception $e)
	{
	  	$GLOBALS["error"] = ERROR_BDD_ERROR;
	 	die();
	}
}

// fermeture de la base de données	
function KWAKERS_BDD_close()
{	
  if($GLOBALS["connection"])
  {
  		mysqli_close($GLOBALS["connection"]);
  }
}

// récupère les résultats de la base de données en fonction de la requete
function KWAKERS_BDD_get($requete = "")
{
	$GLOBALS["results"] = array("count" => 0, "data" => array());
	if($GLOBALS["connection"])
	{
		try
		{	
			if($requete != "")
			{
				$queryResult = $GLOBALS["connection"]->query($requete);
				if($queryResult)
				{	
					while($tab = mysqli_fetch_array($queryResult))
					{
						array_push($GLOBALS["results"]["data"], $tab);
						$GLOBALS["results"]["count"]++;
					}
					
					foreach($GLOBALS["results"]["data"] as $index => $tab)
					{
						foreach($tab as $key => $data)
						{
							$GLOBALS["results"]["data"][$index][$key] = $data;
						}
					}
				}
			}
		} 
		catch (Exception $e)
		{
		}
	}
}

// execute une requete et renvoie vrai ou faux si il y a une erreur d'execution
function KWAKERS_BDD_execute($requete = "")
{
	if($GLOBALS["connection"])
	{
		try
		{	
			if($requete != "")
			{
				if($GLOBALS["connection"]->query($requete))
				{	
					return true;
				}
			}
		} 
		catch (Exception $e)
		{
		}
	}
	return false;
}



?>