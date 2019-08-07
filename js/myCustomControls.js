/**
 * @author Administrator
 */

//msg is an obejct we are going to use to create a modal message using the jquery dialog box
var msg = document.createElement("div");
msg.id = "msgDiv";
msg.className = "msg";

// the global vars below are used with the chart. they are global because we will need to access them from some other js file

/*
 * chart data is an array type that will hold the actual data when called from the server
 * @this{Array}
 */
var chartData;

var chart;
//chart = new AmCharts.AmStockChart();
var dataSet;
var refreshLiveDataTimer;

var chartLoaderImg = "img/loading51.gif";

/*
 * these two mehods below are needed to use the custom jquery datetime picker.
 * they modify the Date type in javascript so we can use the moment library to format
 * dates and times using the picker itself
 */
Date.parseDate = function(input, format)
{
	return moment(input, format).toDate();
};
Date.prototype.dateFormat = function(format)
{
	return moment(this).format(format);
};

//this creates a menuObject
function myMapMenuCntrl(opts)
{
	//lets start by creating a div for the menu that will be added to the dom
	var menuDiv = document.createElement('div');
	//IMPORTANT!!! - this menu list is setup using css so the id must be set - or you can use a class if you want, but the css is the actual script giving functionality....see the main.css sheet to see how it works
	menuDiv.id = 'cssmenu';

	//create an un-order list for the menu
	var menuList = document.createElement('ul');

	//this list can be an opts object parameter that gets passed from the calling function or script, for now i just built it in into the object
	var mi = [
	{
		l : "Map Type",
		children : [
		{
			label : "Default Map",
			index : 0
		},
		{
			label : "Satellite",
			index : 1
		},
		{
			label : "Custom Map",
			index : 2
		}]
	},
	{
		l : "Map Layers",
		children : [
		{
			label : "Cameras",
			index : 0
		},
		{
			label : "Reader Locations",
			index : 1
		},
		{
			label : "Link Segments",
			index : 2
		}]
	},
	{
		l : "Info Items",
		children : [
		{
			label : "Legend",
			index : 0
		},
		{
			label : "Disclaimer",
			index : 1
		}]
	}];

	//now we traverse through the menu items obejct and create the lists.
	//this first loop adds the top level menu nodes -  i called them the parent nodes
	for (var k = 0; k < mi.length; k++)
	{
		//i create a var to hold the toplevel node elements
		var menuItem = mi[k];
		//console.log("trace from object: "+menuItem.l); //just a trace for testing, you can delete if you want

		//if the menu has a label (l) then we create it in the dom
		if (menuItem.l != null)
		{

			//the dom elements that create the top level items
			var parentNode = document.createElement('li');
			var anchortag = document.createElement('a');
			var pns = document.createElement('span');

			//attribute to set to the anchor tag
			anchortag.setAttribute('href', '#');
			//set the label of the button level items to the span tag we created above
			pns.innerHTML = menuItem.l;

			//add the span element to the anchor element and the anchor to the list item parent node
			parentNode.appendChild(anchortag);
			anchortag.appendChild(pns);
			menuList.appendChild(parentNode);

			//we now check if the top level menu item has childre - this paramenter will come from the array object we are using to create the menubar
			//if it has children, then begin creating the subchildren elements
			if (menuItem.children != null || menuItem.children != 0)
			{
				//console.log('children: '+menuItem.children.length); //trace for testing, you can delete if you want
				//set the class from the css that tells the node that there are other items below it
				parentNode.className = 'has-sub';
				//create a var for the children array of the parent node
				var menuChildren = menuItem.children;
				//setup another un-oredered list for the children and added it to the top level menu item dom element
				var childrenList = document.createElement('ul');
				parentNode.appendChild(childrenList);

				//traverse through the children since the array is not empty. this is similar to what i did for the parent elements. in order to make it a bit faster in the future
				//, i will try to make this function recursive
				for (var mc = 0; mc < menuChildren.length; mc++)
				{
					//create a var to hold the current child
					var child = menuChildren[mc];
					//console.log('child label: '+child.label); //trace for testing, you can delete it if you want

					//create a set of dom elements for the children
					var childNode = document.createElement('li');
					var childanchortag = document.createElement('a');
					var childNodeSpan = document.createElement('span');

					//set attributes and the label for each child
					childanchortag.setAttribute('href', '#');
					childNodeSpan.innerHTML = child.label;
					//append the elements to each other
					childanchortag.appendChild(childNodeSpan);
					childNode.appendChild(childanchortag);

					//add a click event listener to the child item node
					childNodeSpan.onclick = menuItemClick;

					//now, if we reach the last element we must assign a css class to it in order to end the list
					if (mc == (menuChildren.length - 1))
					{
						childNode.className = 'last';
					}
					//finally append the child to the unordered element list
					childrenList.appendChild(childNode);
				}

				//add the unordered element list of children to the parent node (the top level menu element)
				parentNode.appendChild(childrenList);
			}

			//again, check to see if this is the last element in the main unordered list and set the css class to it
			if (k == (mi.length - 1))
			{
				parentNode.className = 'last';
			}

		}

	}
	//finally, add the list of object to the main div and set the main div on the map according to the passed parement list
	menuDiv.appendChild(menuList);
	menuDiv.style.margin = '0px 0px 10px 10px';
	opts.gmap.controls[opts.position].push(menuDiv);

}

var menuItemClick = function onitemclick(e)
{
	e.preventDefault();
	e.stopPropagation();
	//console.log(e.target.innerHTML);
	switch(e.target.innerHTML) {

		//case if the menu button is to show the camera clusters
		case "Cameras":
			if (markerCluster)
			{
				markerCluster.clearMarkers();
				console.log("markercluster length: " + myCameraMarkers.length);
				markerCluster = null;
			}
			else
			{
				markerCluster = new MarkerClusterer(map, myCameraMarkers,
				{
					styles : cctvClusterStyle
				});
			}
			break;

		//case if the menu button is to show the reader locations
		case "Reader Locations":
			if (e.target.state == null || e.target.state == "on")
			{
				showReaderLocationMarkers(null);
				e.target.state = "off";
			}
			else
			{
				showReaderLocationMarkers(map);
				e.target.state = "on";
			}

			break;

		//case if menu button is to show the links
		case "Link Segments":
			if (e.target.state == null || e.target.state == "on")
			{
				showLinkPolylines(null);
				e.target.state = "off";
			}
			else
			{
				showLinkPolylines(map);
				e.target.state = "on";
			}
			break;

		//case if menu buttons is legend or disclaimer
		case "Disclaimer":
			var d = document.getElementById("disclaimerDiv");
			if (d.style.visibility == "visible" || d.style.visibility == "")
			{
				d.style.visibility = "hidden";
			}
			else
			{
				d.style.visibility = "visible";
			}
			break;

		case "Legend":
			var d = document.getElementById("legendDiv");
			if (d.style.visibility == "visible" || d.style.visibility == "")
			{
				d.style.visibility = "hidden";
			}
			else
			{
				d.style.visibility = "visible";
			}
			break;

		//these cases are to set the map type
		case "Default Map":
			map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
			break;
		case "Satellite":
			map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
			break;
		case "Custom Map":
			map.setMapTypeId("map_style");
			break;
		default:
			alert(e.target.innerHTML);
	}
};

/**
 * showLinks hides or shows the links on the map based on the passed showHide parameter
 * @param {object} showhide is an object type that can be either a google map object or a null value.
 *  a null will hide the links from the map, while a map object will show the links on the map
 */
function showLinkPolylines(showHide)
{
	for (var i = 0; i < mimLinks.length; i++)
	{
		mimLinks[i].setMap(showHide);
	}
}

/**
 * showREaderLocationsMarkers hides or shows the reader locations markers on the map
 * @param {object} showHide is an object type that can be null to hide the readre locations or a google map object to display the locations.
 */
function showReaderLocationMarkers(showHide)
{
	for (var i = 0; i < readerLocations.length; i++)
	{
		readerLocations[i].setMap(showHide);
	}
}

function mapDesclaimer(mapDesclaimerControlOpts)
{
	var dDiv = document.createElement('div');
	//dDiv.id = "disclaimerDiv";
	var dWrapper = document.createElement('div');
	dWrapper.id = "disclaimerDiv";
	var dContents = document.createElement('div');
	var dTextMessage = document.createElement('span');
	var dDateTime = document.createElement('span');

	dTextMessage.innerHTML = mapDesclaimerControlOpts.message;
	dDateTime.id = 'disclaimerDateTime';
	dDateTime.innerHTML = moment().format('MMMM Do YYYY, h:mm:ss a');

	dContents.appendChild(dTextMessage);
	dContents.appendChild(dDateTime);
	dWrapper.appendChild(dContents);
	dDiv.appendChild(dWrapper);

	dWrapper.className = 'disclaimer';
	dTextMessage.className = 'disclaimerMsg';
	dDateTime.className = 'disclaimerDateTime';

	mapDesclaimerControlOpts.gmap.controls[mapDesclaimerControlOpts.position].push(dDiv);
}

function mapLegend(lOpts)
{
	var lDiv = document.createElement('div');
	var lWrapper = document.createElement('div');
	lWrapper.id = "legendDiv";
	var lHeader = document.createElement('div');
	var lContents = document.createElement('div');
	var lTitle = document.createElement('span');

	//you will obtain the contents of the legend from an array  of objects
	//the format for the object array is below
	//
	var legendContentItems = [
	{
		itemName : 'light',
		itemColor : '#32CD32',
		tt : 'traffic is light and moving'
	},
	{
		itemName : 'moderate',
		itemColor : '#FFDF00',
		tt : 'traffic is moderate and moving'
	},
	{
		itemName : 'moderate-heavy',
		itemColor : '#ffa500',
		tt : 'traffic is approching capacity'
	},
	{
		itemName : 'heavy',
		itemColor : '#CC3333',
		tt : 'traffic is heavy and at/over capacity'
	},
	{
		itemName : 'not enough sightings',
		itemColor : '#4E7AC7',
		tt : 'there were not enough detector sightings to provide a confident travel time'
	},
	{
		itemName : 'no data',
		itemColor : '#444444',
		tt : 'there is no data available'
	}];
	//var legendContentItems = lOpts.legendItems;

	lTitle.innerHTML = lOpts.legendTitle;

	lHeader.className = 'legendHeader';
	lHeader.appendChild(lTitle);

	//lWrapper.appendChild(lHeader);

	//lets create a list for the legend items
	var legendList = document.createElement('ul');
	legendList.id = "losLegendListUl";
	legendList.className = 'legendList';

	for (var x = 0; x < legendContentItems.length; x++)
	{
		//let create a temp object to hold each of the legend items in the array
		var lo = legendContentItems[x];
		//create a list item to append to the legendList
		var listItem = document.createElement('li');
		listItem.style.display = 'inline-block';
		if (x == legendContentItems.length - 1)
		{
			listItem.style.margin = '0';
		}
		else
		{
			listItem.style.margin = '0 2px 0 0';
		}
		//set a tootltip for the list item
		if (lo.tt != null || lo.tt != "")
		{
			listItem.title = lo.tt;
		}
		else
		{
			listItem.title = lo.itemName;
		}
		//create a div for the color box
		var colorBox = document.createElement('div');
		//add some css to the box
		colorBox.className = 'legendColorBox';
		colorBox.style.backgroundColor = lo.itemColor;
		colorBox.innerHTML = lo.itemName;
		//we'll get the color from the code above
		listItem.appendChild(colorBox);
		//add the div to the list item tag

		var labelTxt = document.createElement('div');
		//crate a div for the label for each of the items
		//add some styling
		labelTxt.style.display = 'inline-block';
		labelTxt.style.verticalAlign = 'middle';
		labelTxt.style.color = '#ffffff';
		//labelTxt.innerHTML = lo.itemName;
		labelTxt.className = 'noTxtSelect';
		//add the label div to the list item tag
		listItem.appendChild(labelTxt);

		//once evreything is created and set add the legend item to the list
		legendList.appendChild(listItem);

	}

	lContents.appendChild(legendList);
	lWrapper.appendChild(lContents);
	lDiv.appendChild(lWrapper);

	lWrapper.className = 'legend';
	lOpts.gmap.controls[lOpts.position].push(lDiv);
}

function PolylineInfoWindowControl(opts)
{
	chartData = [];

	var wrapper = document.createElement('div');
	wrapper.id = 'chartWrapper';
	wrapper.className = 'chartWrapper';

	var header = document.createElement('div');
	header.id = 'chartHeader';
	header.className = 'chartHeader';

	var contents = document.createElement('div');
	contents.id = 'chartContents';
	contents.className = 'chartContents';

	var chartLoader = document.createElement("img");
	chartLoader.id = "chartLoader";
	chartLoader.src = chartLoaderImg;
	chartLoader.style.margin = "0 auto";
	//below are the items neccessary to create the footer content

	//first, these two vars will hold the neccessary date-time string that we will pass to the weborb method that will return the historical data.
	//start datetime
	var sDateRequest = "";
	//end datetime
	var eDateRequest = "";

	var footer = document.createElement('div');
	footer.className = 'chartFooter';

	
	var historicalDataForm = document.createElement('div');
	historicalDataForm.className = 'historicalDataForm';
	
	var startDateWrapper = document.createElement('div');
	startDateWrapper.id = 'startDateWrapperDiv';
	startDateWrapper.className = 'historicalFormSections';

	var sDateLabel = document.createElement('label');
	sDateLabel.innerHTML = 'Start Date & Time:';
	sDateLabel.for = 'startDate';
	sDateLabel.className = 'formLabels';

	var startDateInput = document.createElement('input');
	startDateInput.id = 'startDate';
	startDateInput.type = 'date';
	var startTimeInput = document.createElement('input');
	startTimeInput.id = 'startTime';
	startTimeInput.type = 'time';
	
	startDateWrapper.appendChild(sDateLabel);
	startDateWrapper.appendChild(startDateInput);
	startDateWrapper.appendChild(startTimeInput);
	

	
	var endDateWrapper = document.createElement('div');
	endDateWrapper.id = 'endDateWrapperDiv';
	endDateWrapper.className = 'historicalFormSections';
	
	var eDateLabel = document.createElement('label');
	eDateLabel.innerHTML = 'End Date & Time:';
	eDateLabel.className = 'formLabels';
	eDateLabel.for = 'endDate';
	var endDateInput = document.createElement('input');
	endDateInput.id = 'endDate';
	endDateInput.type = 'date';
	var endTimeInput = document.createElement('input');
	endTimeInput.id = 'endTime';
	endTimeInput.type = 'time';
	
	endDateWrapper.appendChild(eDateLabel);
	endDateWrapper.appendChild(endDateInput);
	endDateWrapper.appendChild(endTimeInput);

	//check to see if the input types are supported using Modernizr
	if (!Modernizr.inputtypes.date)
	{
		//since the browser dosnt support the date and time inptu types, we will hide the time input and only use the jquery datetime picker object
		//on the startdate and enddate input fields.
		startTimeInput.style.visibility = 'hidden';
		endTimeInput.style.visibility = 'hidden';
		$(startDateInput).datetimepicker(
		{
			format : "YYYY-MM-DD HH:mm:ss",
			formatTime : "HH:mm",
			formatDate : "MM/DD/YYYY",
			maxDate : 0
		});
		$(endDateInput).datetimepicker(
		{
			format : "YYYY-MM-DD HH:mm:ss",
			formatTime : "HH:mm",
			formatDate : "MM/DD/YYYY",
			maxDate : 0
		});
	}

	var historicalDataBtnWrapper = document.createElement("div");
	historicalDataBtnWrapper.id = "historicalDataBtnSection";
	historicalDataBtnWrapper.className = "historicalFormSections";

	var getHistoricalInfoDataBtn = document.createElement('input');
	getHistoricalInfoDataBtn.type = 'button';
	getHistoricalInfoDataBtn.id = 'getHistoricalData';
	getHistoricalInfoDataBtn.value = 'Get Historical Data';
	getHistoricalInfoDataBtn.className = "getHistoricalDataBtn";

	getHistoricalInfoDataBtn.addEventListener("click", function()
	{
		if (!Modernizr.inputtypes.date)
		{
			sDateRequest = startDateInput.value;
			eDateRequest = endDateInput.value;
		}
		else
		{
			sDateRequest = moment(startDateInput.value.toString() + " " + startTimeInput.value.toString()).format("YYYY-MM-DD HH:mm:ss");
			eDateRequest = moment(endDateInput.value + " " + endTimeInput.value).format("YYYY-MM-DD HH:mm:ss");
		}

		//console.log("start datetime: " + sDateRequest + " | end datetime: " + eDateRequest);

		
		
		if(chart!=null)
		{	//clear the dataset and the chart if it was already called. also, stop the timer that retrieves data if it was called.*/
			chartData = [];
			chart.clear();
			clearInterval(refreshLiveDataTimer);
			console.log("chart is not null");
		}
		//call the server for the historucal data
		proxy.getHistMidtownEzPassTT(opts.lid0, opts.lid1, 10000, sDateRequest, eDateRequest, new Async(onDataReceived, onDataFail));
		//console.log("historical data button clicked: " + new Date());
		contents.appendChild(chartLoader);

	});
	historicalDataBtnWrapper.appendChild(getHistoricalInfoDataBtn);

	var historicalDataFormTitle = document.createElement('div');
	historicalDataFormTitle.className = 'chartFooterSectionTitle';
	historicalDataFormTitle.innerHTML = "Historical Information";
	
	historicalDataForm.appendChild(historicalDataFormTitle);
	historicalDataForm.appendChild(startDateWrapper);
	historicalDataForm.appendChild(endDateWrapper);
	historicalDataForm.appendChild(historicalDataBtnWrapper);

	var liveDataForm = document.createElement("div");
	var cancelDataForm = document.createElement("div");
	var saveDataForm = document.createElement("div");

	liveDataForm.className = "chartFooterSection";
	cancelDataForm.className = "chartFooterSection";
	//cancelDataForm.style.right = "0";
	saveDataForm.className = "chartFooterSection";

	var liveDataBtn = document.createElement("input");
	liveDataBtn.type = "button";
	liveDataBtn.value = "Get Live Data";

	//event listener for the new data button.
	liveDataBtn.addEventListener("click", function()
	{
		//get the data from the server
		try
		{
			//first get the data to fill the dataset for the first time. on success of data download, the onDataReceived function will create the chart
			//proxy is an object for the weborb data binding that is defined in the main.js file getLiveMidtownEzPassTT is the weborb method that will
			//retrieve live data based on the last index. if calling for data for the first time, then we pass an "x" as the first parameter, this
			//will let the method know to grab one hours worth of data
			proxy.getLiveMidtownEzPassTT("x", opts.lid0, opts.lid1, 10000, new Async(onDataReceived, onDataFail));

			//after the first call to onDataREceived, we will set a timer to get the new live data
			refreshLiveDataTimer = setInterval(function()
			{
				//you need to keep track of the lastREcordId in the data you receive as it will be used as an index to receive fresh new data
				var lastRecordId = chartData[chartData.length - 1].uid;
				//call the data function again.
				proxy.getLiveMidtownEzPassTT(lastRecordId, opts.lid0, opts.lid1, 10000, new Async(onDataReceived, onDataFail));

			}, 10000);

		} catch(e)
		{
			alert("error requesting data:" + e.message + "\n" + e.stack);
			alert(e.description);
			alert(e.details);
		}

	});

	var cancelDataBtn = document.createElement("input");
	cancelDataBtn.type = "button";
	cancelDataBtn.value = "Clear Data";

	var saveDataBtn = document.createElement("input");
	saveDataBtn.type = "button";
	saveDataBtn.value = "Save Data";


	saveDataBtn.addEventListener("click", function()
	{
		if (chartData.length == 0 || chartData == null)
		{
			showDialog("No Data to Download", "There is no data to Download. Please request data to graph and try to download again");
		}
		else
		{
			try
			{
				
				var data = chartData;
				var headerKey = ["uid", "Date", "time", "travelTime"];
				var stringOutput;
				var orderedData = [];
				
				
				for (var i = 0; i < data.length; i++)
				{
					orderedData.push(data[i].uid + "," + moment(data[i].time).format("MM-DD-YY") + "," + moment(data[i].time).format("HH:mm:ss") + "," + data[i].tt);
					//console.log(data[i].uid + "," + moment(data[i].time).format("MM-DD-YY") + "," + moment(data[i].time).format("HH:mm:ss") + "," + data[i].tt);
				}

				stringOutput = headerKey.join(",") + "\r\n" + orderedData.join("\r\n");
				
				var downloadLink = document.createElement("a");
				var blob = new Blob(["\ufeff",stringOutput]);
				var url = URL.createObjectURL(blob);
				downloadLink.href = url;
				downloadLink.download = "mim_data_"+moment().format("MM_DD_YY")+".csv";
				
				document.body.appendChild(downloadLink);
				downloadLink.click();
				document.body.removeChild(downloadLink);
				
				
				
			} catch(error)
			{
				showDialog("Error Downloading Data","There was an error downloading the data or creating the CSV file. Please try again");

			}

		}
	});

	cancelDataBtn.addEventListener("click", function()
	{
		//console.log("cancel data button is clicked");

		chartData = [];
		chart.clear();
		clearInterval(refreshLiveDataTimer);
	});

	liveDataForm.appendChild(liveDataBtn);
	cancelDataForm.appendChild(cancelDataBtn);
	saveDataForm.appendChild(saveDataBtn);

	footer.appendChild(historicalDataForm);
	footer.appendChild(liveDataForm);
	footer.appendChild(saveDataForm);
	footer.appendChild(cancelDataForm);

	//add the title
	var title = document.createElement('div');
	title.innerHTML = opts.linkName;
	title.className = "chartTitle";
	header.appendChild(title);

	wrapper.appendChild(header);
	wrapper.appendChild(contents);
	wrapper.appendChild(document.createElement('hr'));
	wrapper.appendChild(footer);
	return wrapper;

}

/**
 * onDataReceived is the handler function to the async method call for live travel time data from the weborb server. this method is called only if the call
 * to the weborb server was successfull.
 *
 * @param {Array} result is an array of object returned if the server call successful
 */
function onDataReceived(result)
{

	//console.log("historical data received: " + new Date());
	if (chartData.length == 0)
	{
		chartData = result;
		/*
		for(var x=0; x<result.length;x++)
		{
			console.log(result[x].time+" -- "+result[x].tt);
		}
		*/
		createChart();
		
		//console.log("first time success - size of results: " + result.length + "| size of chartData: " + dataSet.dataProvider.length + " ");
	}
	else
	{
		for (var i = 0; i < result.length; i++)
		{
			//dataSet.dataProvider.shift();
			dataSet.dataProvider.push(result[i]);
			chart.zoomOut();

		}

		chart.validateData();
		//console.log("success! - size of results: " + result.length + "| size of chartData: " + dataSet.dataProvider.length + " ");
	}

}

/**
 * onDataFail is the handler function to the async method call for live travel time data in case the weborb server returns an error
 *
 * @param {Object} e
 */
function onDataFail(e)
{
	showDialog("Error Downloading Data", "There was an error downloading data from the server." + "\n" + e.message);
}

/**
 * createChart is the method responsible for setting up the AMChart to display the travel time server data.
 */
function createChart()
{

	//start creatign the chart--------------------//

	chart = new AmCharts.AmStockChart();
	chart.addListener("rendered", function()
	{
		console.log("historical data chart is redenred:" + new Date());
	});
	dataSet = new AmCharts.DataSet();

	chart.pathToImages = "img/images/";
	chart.zoomOutOnDataSetChange = true;

	//we define the dataset that the chart is going to show
	dataSet.dataProvider = chartData;
	dataSet.fieldMappings = [
	{
		fromField : "tt",
		toField : "value"
	}];
	dataSet.categoryField = "time";

	//add the category or x-axis settings for the date and time
	var categoryAxesSettings = new AmCharts.CategoryAxesSettings();
	categoryAxesSettings.minPeriod = "fff";

	//----important!!!! if you don't set this parameter to zero, then the data will be grouped --read the documentation
	categoryAxesSettings.maxSeries = 0;
	categoryAxesSettings.autoGridCount = true;
	chart.categoryAxesSettings = categoryAxesSettings;

	//this is where you tell the chart the field name of the data we obtain
	dataSet.title = "This is my dataset title";
	dataSet.color = "#ff0000";

	//we pass an array of datasets to the chart
	chart.dataSets = [dataSet];

	//the pannels
	var stockPanel = new AmCharts.StockPanel();
	chart.panels = [stockPanel];
	var panelsSettings = new AmCharts.PanelsSettings();
	//panelsSettings.startAlpha = 0;
	//panelsSettings.startEffect = 'easeOutSine';
	panelsSettings.startDuration = 1;
	chart.panelsSettings = panelsSettings;

	//create a graph for the panel above
	var graph = new AmCharts.StockGraph();
	graph.animationPlayed = false;
	graph.valueField = "value";
	graph.type = "line";
	graph.lineAlpha = 0;
	graph.fillAlphas = 0;
	graph.bullet = "round";
	graph.bulletSize = 4;
	graph.title = "this is my graph title";

	//add the graph to the panel
	stockPanel.addStockGraph(graph);

	//add the chart to the holder div: - i've added this line to the event listener callback for the get live data button
	//since the holder div needed to be created on the stage first before writing
	chart.write("chartContents");

}

/**
 *
 * @param {Object} camName
 * @param {Object} camUrl
 * @param {Object} camLogo
 */
var CameraIW = function(camName, camUrl, camLogo, camPosition)
{

	//the main container
	var wrapper = document.createElement("div");
	wrapper.id = "cameraInfoWindow";
	wrapper.className = "camIw";

	//the header
	var camIwHeader = document.createElement("div");
	camIwHeader.className = "camIwHeader";

	var headerLine = document.createElement("diV");
	headerLine.className = "headerLine";

	var camIwTitle = document.createElement("div");
	camIwTitle.className = "camIwTitle";
	camIwTitle.innerHTML = camName;

	var camIwCloseBtn = document.createElement("div");
	camIwCloseBtn.id = "camIwCloseBtn";
	camIwCloseBtn.innerHTML = "x";
	camIwCloseBtn.className = "camIwCloseBtn";
	camIwCloseBtn.addEventListener("click", stopCameraInfoWindow);

	camIwHeader.appendChild(headerLine);
	headerLine.appendChild(camIwTitle);
	headerLine.appendChild(camIwCloseBtn);

	var camIwContents = document.createElement("div");
	camIwContents.id = "camIwContent";
	camIwContents.className = "camIwContent";
	
	var camLoader = document.createElement("div");
	camLoader.id = "camLoader";
	camLoader.style.width = "352px";
	camLoader.style.height = "240px";
	camLoader.style.position = "relative";
	var camLoaderImg = document.createElement("img");
	camLoaderImg.src = "img/loading3.gif";
	camLoaderImg.style.position = "absolute";
	camLoaderImg.style.top = "50%";
	camLoaderImg.style.left = "45%";
	camLoader.appendChild(camLoaderImg);
	
	//camIwContents.appendChild(camLoader);
	

	//this is the actual image element that will change each time a new image is requested
	var camImage = document.createElement('img');
	camImage.id = "myImg";
	camImage.className = "myImg";

	camImage.src = camUrl;
	camImage.alt = "cctvImage";

	camIwContents.appendChild(camImage); 

	//an image element for the logo
	var logo = document.createElement("img");
	logo.src = camLogo;
	logo.alt = "agencyLogo";
	logo.className = "camLogo";
	camIwContents.appendChild(logo);

	//the footer
	var camIwFooter = document.createElement("div");
	camIwFooter.className = "camIwFooter";
	/*

	 these lines can be used to display a streetview whenenever we click on a button we create in the footer
	 the only problem i am having is when the window closes, i cannot remove the pegman from the map

	 var panoBtn = document.createElement("input");
	 panoBtn.id = "panoBtn";
	 panoBtn.type = "button";
	 panoBtn.value = "my pano button";

	 panoBtn.addEventListener("click", function()
	 {
	 var panoOpts =
	 {
	 position : camPosition,
	 pov :
	 {
	 heading : 34,
	 pitch : 10
	 }
	 };
	 stopCameraInfoWindow();
	 var infoWindowPanorama = new google.maps.StreetViewPanorama(document.getElementById("camIwContent"), panoOpts);
	 google.maps.event.addListener(infoWindowPanorama, "visible_changed", function(e)
	 {
	 console.log("pano visible changed to: " + infoWindowPanorama.getVisible());
	 });
	 google.maps.event.addListener(infoWindowPanorama, "pano_changed", function(e)
	 {
	 console.log("pano changed to: " + infoWindowPanorama.getVisible());
	 });
	 google.maps.event.addListener(infoWindowPanorama, "closeClick", function(e)
	 {
	 console.log("pano closed click: " + infoWindowPanorama.getVisible());
	 });
	 infoWindowPanorama.setOptions(panoOpts);
	 map.setStreetView(infoWindowPanorama);
	 });

	 camIwFooter.appendChild(panoBtn);
	 */


	


	
	

	wrapper.appendChild(camIwHeader);
	wrapper.appendChild(camIwContents);
	wrapper.appendChild(camIwFooter);

	return wrapper;

};

/**
 * showDialog creates a jquery ui dialog box to display a modal popup for an alert message
 * @param {String} dialogTitle a string to use as the title
 * @param {String} dialogMsg a string to use as the message
 */
function showDialog(dialogTitle, dialogMsg)
{
	msg.title = dialogTitle;
	msg.innerHTML = dialogMsg;

	$(function()
	{
		$(msg).dialog(
		{
			modal : true,
			dialogClass : "jqueryDialog",
			show :
			{
				effect : "fade",
				duration : 300
			},
			hide :
			{
				effect : "fade",
				duration : 300
			}
		});
	});
}

