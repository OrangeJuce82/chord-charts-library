<!DOCTYPE html>
<html>
<head> 
	<?php echo KWAKERS_DISPLAY_PAGE_meta(); ?>
	<link rel="icon" type="image/ico" href="favicon.png">
	<?php include(dirname(__FILE__)."/stylesheets.php"); ?> 
	<?php include(dirname(__FILE__)."/javascript.php"); ?> 
</head>
<body id="irealb">
	<!-- ANALYTICS -->
	<script>
	  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
	  ga('create', 'UA-74351972-1', 'auto');
	  ga('send', 'pageview');
	</script>
		
	<!-- MENU -->
	<div id="menu" class="menu">
		<?php echo KWAKERS_DISPLAY_PAGE_menu(); ?>
	</div>
	
	<!-- CONTENU -->
	<div id="page">
		<div id="content">			
			<?php echo KWAKERS_DISPLAY_PAGE_content(); ?>
		</div>
	</div>

	<!-- FOOTER -->
	<div id="footer">
		<?php echo KWAKERS_DISPLAY_PAGE_footer(); ?>
	</div>
</body>
</html>