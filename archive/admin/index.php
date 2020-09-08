<!DOCTYPE html>
<html>
<head>
  <title></title>
  <!--Load the AJAX API-->
  <script type="text/javascript"
    src='https://www.google.com/jsapi?autoload={"modules":[{"name":"visualization","version":"1"}]}'>
  </script>

  <!-- Visualization -->
  <!-- https://developers.google.com/chart/interactive/docs/reference#google.visualization.drawchart -->
  <script type="text/javascript">
    google.setOnLoadCallback(drawVisualization);

    function drawVisualization() {
      var countryWrapper = new google.visualization.ChartWrapper({
          "chartType": "GeoChart",
          "dataSourceUrl": "https://kwakers-music.appspot.com/query?id=ag9zfmt3YWtlcnMtbXVzaWNyFQsSCEFwaVF1ZXJ5GICAgICAgIAKDA&format=data-table-response",
          "refreshInterval": 1000,
          "options": {"title": "Countries"},
          "containerId": "country",
          options : {
	        sizeAxis: { minValue: 0, maxValue: 100 },
	        colorAxis: {colors: ['#9cd3d1', '#0a7671']} // green light to green dark
	      }
        });
      countryWrapper.draw();
    }
  </script>
</head>
<body>
	Bienvenue sur le panneau d'administration
  <div id="country" style="margin:auto;width:630px;"></div>
   <?php
	echo phpinfo();
	print_r($_SERVER);  
   ?>
</body>
</html>