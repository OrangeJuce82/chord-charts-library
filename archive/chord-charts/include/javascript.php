<!-- Importation javascript généraliste à toutes les pages -->

<script type="text/javascript" src="js/jquery.js"></script>
<!-- <script type="text/javascript" src="js/social/socialShare.min.js"></script>


Activation du plugin de réseau sociaux
<script type="text/javascript">
$(document).ready(function()
{
	$('.socialButton').socialShare({social: 'blogger,delicious,digg,facebook,friendfeed,google,linkedin,myspace,pinterest,reddit,stumbleupon,tumblr,twitter,windows,yahoo',whenSelect: true,selectContainer: '.socialButton'});
	
});
</script>
-->

<!-- Importation spécifique à chaque page -->
<?php
	switch(PAGE_CURRENT)
	{
		case PAGE_INDEX : ?>	
			<script type="text/javascript" src="js/index.js"></script>	
			<?php break;
		
		case PAGE_VIEWER : ?>  	
			<script type="text/javascript" src="js/viewer.js"></script>	
			<?php break;
				
		case PAGE_STATS : ?>
			<script type="text/javascript" src='https://www.google.com/jsapi?autoload={"modules":[{"name":"visualization","version":"1"}]}'></script>
			<script type="text/javascript" src="js/stats.js"></script>
		  <?php break;
	
	}
?>

