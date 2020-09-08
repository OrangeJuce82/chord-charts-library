
var canLoadMore = true;
function loadMoreResults()
{
	if(canLoadMore == false)
	{
		return;
	}
	canLoadMore = false;
	
	nbResults = $(".results tbody tr").length;
	$('#moreResults').hide();
	$('#moreResultsContainer .ajax-loader').show();
	
	$.ajax({
	  method: "POST",
	  url: "ajax/more-results.php",
	  data:{ lr: nbResults, q: getParameterByName("q"), fl: getParameterByName("fl") }
	}).done(function( msg ){
	
		if(msg == "")
		{
			canLoadMore = false;
			$('#moreResultsContainer').hide();
		}
		else
		{
			canLoadMore = true;
		    $(".results").append(msg);
		    
			$('#moreResultsContainer .ajax-loader').hide();
			$('#moreResults').show();
		}
	});
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

$(document).ready(function()
{
	if($(".tablesorter").length)
	{
		$(".tablesorter").tablesorter({headers:{4:{sorter: false},5:{sorter: false},6:{sorter: false},7:{sorter: false}}}); 
	}
	
	if($( "#moreResults" ).length)
	{	
		$(window).scroll(function() {
		   if($(window).scrollTop() + $(window).height() > $(document).height() - 200)
		   {
			   if(canLoadMore == true)
			   {
			   		loadMoreResults();
			   }
		   }
		});
		
		$('#moreResults').click(function(){
			loadMoreResults();
		});
	}
});