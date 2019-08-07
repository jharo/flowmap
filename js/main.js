const METERSPERSEC_MILESPERHOUR_FACTOR = 2.23693629;

//base uri for the json files
//var base_uri = "https://flowmap.nyctmc.org/flowmap_json_data_sources/";
var base_uri = "test_data/";

// appTimer is the timer for the entire application, 
// it will drive the refresh interval and the clock updates.
var appTimer;
var map;

//these are for the reader location icons
var readerLocationIcon = "img/icons/bullet_green.png";
var readerLocationIcon_good = "img/icons/bullet_green.png";
var readerLocationIcon_fail = "img/icons/bullet_black.png";

// arrays for the reader locations
var allReaderLocations;
var mimReaderLocations;
var transcomReaderLocations;
var wifiReaderLocations;

// arrays for the reader links
var mimJsonLinks;
var transcomLinks;
var wifiLinks;

//linkToolTip is an InfoBox class object that will appear when the user mouseover the link. it is defined by the Infobox class library
var linkToolTip;

//object to use for the polyline directional arrow
var arrowSymbol;

//objects to the display the date and time on the page
var myTime;
var myDate;

//dafault properties for the polylines
var defaultPolylineColorOptions = {
  strokeWeight: 2,
  strokeOpacity: 1
};
var onPolylineHoverColorOptions = {
  strokeWeight: 6,
  strokeOpacity: .50
};

//dataRefreshInterval_seconds is the amount of time that will pass before the timer resets and grabs new data for the links
//it used primaraly by the timer function and reset by it.
var dataRefreshInterval_seconds = 180;

//secondsToNextREfresh is a global var that will provide the amount of seconds to the next refresh.
//by default it is set to the number of dataREfreshInterval_seconds and it is updated by the timer function
var secondsToNextRefresh = dataRefreshInterval_seconds;

//event listener on the dom to load the map
google.maps.event.addDomListener(window, "load", initialize);

/**
 *initialize if the listener mothod from the google maps event to run when the windows load.
 * it willstart the map and being downloading the data
 */
function initialize() {
  //initialize the main variable objects
  allReaderLocations = new Array();
  mimReaderLocations = new Array();
  transcomReaderLocations = new Array();
  wifiReaderLocations = new Array();
  mimLinks = new Array();
  mimJsonLinks = new Array();
  transcomLinks = new Array();
  wifiLinks = new Array();
  appTimer = new Timer();
  appTimer.Interval = 1000;

  linkToolTip = new InfoBox({
    closeBoxURL: "",
    boxClass: "tooltip",
    disableAutoPan: true,
    maxWidth: 0,
    pixelOffset: new google.maps.Size(10, 10)
  });

  //create an arrow symbol for the polylines
  arrowSymbol = {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 2,
    strokeColor: "#444444",
    strokeWeight: 1,
    fillOpacity: 1,
    fillColor: "#444444"
  };

  //create a custom map style using the style defined in the gmap_style.js file
  var customMapStyle = style;
  var styledMap = new google.maps.StyledMapType(customMapStyle, {
    name: "tmc"
  });

  //create a set of options for the map to run
  var mapOptions = {
    center: new google.maps.LatLng(40.71462, -74.006600),
    zoom: 11,
    streetViewControl: true,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    },
    zoomControl: false,
    panControl: false,
    scaleControl: true,
    mapTypeControl: false,
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID, "map_style"],
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
      position: google.maps.ControlPosition.TOP_LEFT
    }
  };

  //set the map
  map = new google.maps.Map(document.getElementById("mapCanvas"), mapOptions);
  map.mapTypes.set("map_style", styledMap);
  map.setMapTypeId("map_style");
  google.maps.event.addListenerOnce(map, "tilesloaded", ontilesloaded);

  //set the application time and date
  myTime = moment().format("hh:mm:ss a");
  myDate = moment().format("dddd, MMMM DD");
  document.getElementById("timeDiv").innerHTML = myTime;
  document.getElementById("dateDiv").innerHTML = myDate;

  //here we add a set of custom map controls. The controls are stored in the "myCustomControls.js" file
  var mOptions = {
    gmap: map,
    position: google.maps.ControlPosition.TOP_RIGHT
  };

  var dOptions = {
    gmap: map,
    position: google.maps.ControlPosition.RIGHT_BOTTOM,
    message: "The link colors are derived from the aggregation of the last 15 minutes of data<br>The last data update occurred on: "
  };
  var legendOptions = {
    gmap: map,
    legendTitle: "Legend",
    position: google.maps.ControlPosition.RIGHT_BOTTOM
  };

  var myMenuControl = new myMapMenuCntrl(mOptions);
  var myMessageControl = new mapDesclaimer(dOptions);
  var myLegendControl = new mapLegend(legendOptions);

  //set the timer and Start
  appTimer.Tick = mytick;
  appTimer.Enable = true;
  appTimer.Start();

}

/**
 * onTilesLoaded is the listener method that will run once all the map tiles are
 * finished loading and the map is ready to go. once the map is ready we call 
 * on the invokeServer method to begin downloading data
 */
function ontilesloaded() {
  //console.log("tiles loaded...so begin the loading of the weborb objects");

  // mim data requests
  getMimLocations();
  getMimPolylines();

  // transcom data requests
  getTranscomLocations();
  getTranscomPolylines();

  // wifi data requests
  getWifiLocations();
  getWifiPolylines();
}


//#region functions to load the mim readers and poylines json
function getMimLocations() {
  $.ajax({
    type: "GET",
    url: base_uri + "mim_locations_info.json",
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: setMimLocations,
    error: function (e) {
      console.log("error loading the mim locations " + e);
    }
  });
}
function getMimPolylines() {
  $.ajax({
    type: "GET",
    url: base_uri + "mim_polylines_info.json",
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: setMimPolylines,
    error: function (e) {
      console.log("error loading the mim poylines " + e);
    }
  });
}
function setMimLocations(results) {
	console.log("success getting mim locations: " + results.RECORDS.length);
	if (results.RECORDS.length != 0 || results.RECORDS.length != null) {
		for (var i = 0; i < results.RECORDS.length; i++) {
			//console.log(results.RECORDS[i].lat+" "+results.RECORDS[i].lng);
			var readerMarker = new google.maps.Marker({
				position: new google.maps.LatLng(results.RECORDS[i].lat, results.RECORDS[i].lng),
				map: map,
				icon: {
					url: readerLocationIcon_good,
					size: new google.maps.Size(16, 16),
					origin: new google.maps.Point(0, 0),
					anchor: new google.maps.Point(8, 8)
				},
				title: results.RECORDS[i].location_name + " (location ID: " + results.RECORDS[i].lid + ")\ntotal number of readers at location: " + results.RECORDS[i].total_readers
			});
			mimReaderLocations.push(readerMarker);

		}
		//document.getElementById("mimReaderLocationsNumber").innerHTML += " " + results.RECORDS.length;
	}
}
function setMimPolylines(results) {
	console.log("sucess getting mim polylines: " + results.RECORDS.length);
	if (results != null || results.RECORDS.length != 0) {
	  for (var i = 0; i < results.RECORDS.length; i++) {
		var mypoly = new google.maps.Polyline({
		  path: google.maps.geometry.encoding.decodePath(results.RECORDS[i].polyline),
		  geodesic: true,
		  strokeOpacity: 1,
		  strokeWeight: 2,
		  icons: [{
			  icon: {
				path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
				scale: 2,
				strokeColor: "#444",
				strokeWeight: .5,
				fillOpacity: 1,
			  },
			  offset: "50%"
			}]
		});
		mypoly.linkName = results.RECORDS[i].linkName;
		mypoly.sid = results.RECORDS[i].sid;
		mypoly.lid0 = results.RECORDS[i].lid0;
		mypoly.lid1 = results.RECORDS[i].lid1;
		mypoly.road_designation = results.RECORDS[i].road_designation;
		mypoly.borough = results.RECORDS[i].borough;
		mypoly.middlepoint = getMostMiddlePoint(google.maps.geometry.encoding.decodePath(results.RECORDS[i].polyline));
		mypoly.linkLength = google.maps.geometry.spherical.computeLength(mypoly.getPath()).toFixed(2);
		mypoly.medianTtSeconds = 0;
		mypoly.medianSpeedMph = 0;
		mypoly.medianTtString = "undefined";
		mypoly.medianTtDatetime = new Date();
		mypoly.numberOfRecords = 0;
		mypoly.linkColor = "undefined";
  
		google.maps.event.addListener(mypoly, "click", onPolylineMouseClick);
		google.maps.event.addListener(mypoly, "mouseover", onMimPolylineMouseOver);
		google.maps.event.addListener(mypoly, "mouseout", onPolylineMouseOut);
		
		mypoly.setMap(map);
		mimJsonLinks.push(mypoly);
	  }
	  //after the polylines are drawn get the data for the first time
	  getMimJsonLinkData();
	} else {
	  alert("no polylines found on server");
	}
  }
  function onMimPolylineMouseOver(e) {
	var tooltipContent = "";
	this.setOptions(onPolylineHoverColorOptions);
	if (this.icons != null) {
	  this.icons[0].icon.scale = 3;
	}
	tooltipContent = "<span><b>" + this.linkName + "</b></span><hr>number of records: " + this.numberOfRecords;
	tooltipContent += "<br>borough: " + this.borough;
	tooltipContent += "<br>road designation: " + this.road_designation;
	tooltipContent += "<br>approx. median travel-time: " + this.medianTtString;
	tooltipContent += "<br>approx. median speed (mph): " + this.medianSpeedMph;
	tooltipContent += "<br>median record timestamp: " + moment(this.medianTtDatetime).format("M-DD-YY h:mm:ss a");
	tooltipContent += "<br>segment length: " + this.linkLength + " meters (" + (this.linkLength * 3.2808).toFixed(2) + " ft)";
	tooltipContent += "<br>segment ID " + this.sid;
	tooltipContent += "<br>segment points: " + this.lid0 + " to " + this.lid1;
  
	linkToolTip.setContent(tooltipContent);
	//here e is the overlay object and whenever we hover over the overlay we can get the coords to use with our infobox tooltip
	linkToolTip.setPosition(e.latLng);
	linkToolTip.open(map);
  }
  function getMimJsonLinkData() {
	$.ajax({
	  type: "GET",
	  url: base_uri + "mim_link_data_info.json",
	  async: true,
	  dataType: "json",
	  contentType: "application/json",
	  success: processMimJsonLinkData,
	  error: function (e) {
		console.log("error getting the mim json link data" + e);
	  }
	});
  }
  /* the function below will process the mim link data from the json file that updates every minute */
function processMimJsonLinkData(results) {
	console.log("success receiving the mim json link data: " + results.RECORDS.length + " records received");
	try {
	  if (results.RECORDS.length != 0 || results != null) {
		var mimJsonData = results.RECORDS;
		for (var i = 0; i < mimJsonData.length; i++) {
		  for (var j = 0; j < mimJsonLinks.length; j++) {
			if (mimJsonData[i].sid == mimJsonLinks[j].sid) {
			  
			  mimJsonLinks[j].numberOfRecords = mimJsonData[i].numberOfRecordsInAggregationPeriod;
			  mimJsonLinks[j].medianTtSeconds = mimJsonData[i].medianTravelTime_seconds;
			  mimJsonLinks[j].medianTtString = mimJsonData[i].medianTravelTime_timeString;
			  mimJsonLinks[j].medianTtDatetime = mimJsonData[i].medianTravelTime_timeStamp;
			  mimJsonLinks[j].medianSpeedMph = ((mimJsonLinks[j].linkLength / mimJsonData[i].medianTravelTime_seconds) * METERSPERSEC_MILESPERHOUR_FACTOR).toFixed(2);
  
			  mimJsonLinks[j].linkColor = getMimLinkColor(mimJsonLinks[j].road_designation, mimJsonLinks[j].medianTtSeconds, mimJsonLinks[j].medianSpeedMph, mimJsonLinks[j].numberOfRecords);
			  mimJsonLinks[j].setOptions({strokeColor: mimJsonLinks[j].linkColor});
			  mimJsonLinks[j].icons[0].icon.fillColor = mimJsonLinks[j].linkColor;
			  mimJsonLinks[j].icons[0].icon.strokeColor = mimJsonLinks[j].linkColor;
  
			}
		  }
		}
		//console.log("success parsing new travel time data - " + moment().format("MM-DD-YY HH:mm:ss"));
		mimJsonData = [];
	  }
	} catch (error) {
	  showDialog("Error Parsing the MIM travel time data", "There was an error parsing the travel time data received from the json file. Wait for next refresh cycle to correct the problem.");
	  console.log(error);
	}
  
  
  }
  function getMimLinkColor(road_designation, travelTime, speed, nRecords) {
	var linkColor = "#444";
	try {
	  if (travelTime <= 0) {
		linkColor = "#444";
		//linkColor = "#FFDF00";
	  } else {
		//decide what type of color system to use using the segmentID property.
		switch (road_designation) {
  
		  	/* The segments below are local streets outside of Midtown. if the segment is a local street not MIM then use the MUTCD local street speed system */
		  case "street":
			linkColor = applyLocalStreetColorSystem(speed, nRecords);
			break;

			/* the links below are highway type links. use the highway color system to assign a color*/
		  case "highway":
			linkColor = applyHighwaysColorSystem(speed, nRecords);
			break;
			
			/* as default, if the segment is not a local street or a highway, then use the MIM color scheme to assign the color to the link */
		  default:
			linkColor = applyMidtownInMotionColorSystem(speed, travelTime, nRecords);
			break;
		}
	  }
	  return linkColor;
	} catch (e) {
	  console.log("error assigning link color to a link: " + e);
	}
  }
  /**
 * applyLocalStreetColorSystem -
 * this function changes the color of the link based on the MUTCD local street color designations
 * @param {number} speed
 * @param {number} nRecords
 * */
function applyLocalStreetColorSystem(speed, nRecords) {
	var c = "#444";
	if (speed >= 0) {
	  if (nRecords < 5) {
		c = "#4E7AC7"; //blue
	  } else if (speed > 13) {
		c = "#32CD32"; //green
	  } else if ((speed <= 13) && (speed > 9)) {
		c = "#FFDF00"; //yellow
	  } else if ((speed <= 9) && (speed > 7)) {
		c = "#ffa500"; //orange
	  } else if (speed <= 7) {
		c = "#CC3333";	//red
	  }
	} else {
	  c = "#444";
  
	}
	return c;
  }
  
  /**
   * applyHighwayColorSystem is the method that will be used to change the color of the link in case the link
   * is a  highway type street. we use the speed and the number of records to check the color
   * @param {number} speed
   * @param {number} nRecords
   */
  function applyHighwaysColorSystem(speed, nRecords) {
	var c = "#444";
	if (speed > 0) {
	  if (nRecords < 5) {
		c = "#4E7AC7"; //blue
	  } else if (speed > 45.0) {
		c = "#32CD32"; //green
	  } else if ((speed <= 45.0) && (speed > 30.0)) {
		c = "#FFDF00"; //yellow
	  } else if ((speed <= 30.0) && (speed > 15.0)) {
		c = "#ffa500"; //orange
	  } else if (speed <= 15.0) {
		c = "#CC3333"; //red
	  }
  
	} else {
	  c = "#444";
	}
	return c;
  }
  
  function applyMidtownInMotionColorSystem(speed, travelTime, nRecords) {
	var c = "#444";
	if (speed > 0) {
	  if (nRecords < 5) {
		c = "#4E7AC7"; //blue
	  } else if (0 < travelTime && travelTime <= 180) {
		c = "#32CD32"; //green
	  } else if (180 < travelTime && travelTime <= 270) {
		c = "#FFDF00"; //yellow
	  } else if (270 < travelTime && travelTime <= 360) {
		c = "#ffa500"; //orange
	  } else if (360 < travelTime) {
		c = "#ff0000"; //red
	  }
	} else {
	  c = "#444";
	}
	return c;
  }
//#endregion

//#region functions to load the transcom readers and polylines json
function getTranscomLocations() {
  $.ajax({
    type: "GET",
    url: base_uri + "transcom_locations_info.json",
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: setTranscomLocations,
    error: function (e) {
      console.log("error loading the transcom locations " + e);
    }
  });
}
function getTranscomPolylines() {
  $.ajax({
    type: "GET",
    url: base_uri + "transcom_polylines_info.json",
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: setTranscomPolylines,
    error: function (e) {
      console.log("error loading the transcom polylines " + e);
    }
  });
}
function setTranscomLocations(results) {
	console.log("success setting transcom locations: " + results.RECORDS.length);
	if (results.RECORDS.length != 0 || results.RECORDS.length != null) {
	  for (var i = 0; i < results.RECORDS.length; i++) {
		//console.log(results.RECORDS[i].lat+" "+results.RECORDS[i].lng);
		var locationStatusIcon;
		if (results.RECORDS[i].userstatuscode == "4") {
		  locationStatusIcon = readerLocationIcon_fail;
  
		} else {
		  locationStatusIcon = readerLocationIcon_good;
		}
		var readerMarker = new google.maps.Marker({
		  position: new google.maps.LatLng(results.RECORDS[i].latitude, results.RECORDS[i].longitude),
		  map: map,
		  icon: {
			url: locationStatusIcon,
			size: new google.maps.Size(16, 16),
			origin: new google.maps.Point(0, 0),
			anchor: new google.maps.Point(8, 8)
		  },
		  title: results.RECORDS[i].readername + "\norg: " + results.RECORDS[i].serverset + ")\nstatus code: " + results.RECORDS[i].userstatuscode
		});
		transcomReaderLocations.push(readerMarker);
  
	  }
	  //document.getElementById("readerLocationsNumber").innerHTML += " " + results.RECORDS.length;
	}
  }
  function setTranscomPolylines(results) {
	  //console.log("sucess getting transcom polylines: "+results.RECORDS.length);
	  if (results.RECORDS != null && results.RECORDS.length != 0) {
		for (var i = 0; i < results.RECORDS.length; i++) {
		  //console.log(results.RECORDS[i].xcomID);
		  var mypoly = new google.maps.Polyline({
			path: google.maps.geometry.encoding.decodePath(results.RECORDS[i].polyline),
			geodesic: true,
			strokeOpacity: 1,
			strokeWeight: 2,
			icons: [{
				icon: {
				  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
				  scale: 2,
				  strokeColor: "#444",
				  strokeWeight: .5,
				  fillOpacity: 1,
				},
				offset: "50%"
			  }]
		  });
		  mypoly.id = results.RECORDS[i].ExternalId;
		  mypoly.linkName = results.RECORDS[i].Name;
		  mypoly.readersStatus = results.RECORDS[i].readersStatus;
		  mypoly.speedMph = 0;
		  mypoly.currTtSec = 0;
		  mypoly.SystemStatus = "undefined";
		  mypoly.NewMatchesInSamplePeriod = 0;
		  mypoly.VehiclesInSample = 0;
		  mypoly.ConfidenceLevel = 0;
		  mypoly.FromSyntheticSegment = "undefined";
		  mypoly.recordTimeStamp = "";
		  mypoly.linkColor = "undefined";
		  mypoly.linkLength = google.maps.geometry.spherical.computeLength(mypoly.getPath()).toFixed(2);
	
		  transcomLinks.push(mypoly);
		  mypoly.setMap(map);
	
		  //google.maps.event.addListener(mypoly, "click", onPolylineMouseClick);
		  google.maps.event.addListener(mypoly, "mouseover", onTranscomPolylineMouseOver);
		  google.maps.event.addListener(mypoly, "mouseout", onPolylineMouseOut);
		}
		//after the polylines are drawn get the data for the first time
		getTranscomLinkData();
	
	  } else {
		alert("no polylines found on server");
	  }
	
	}
	function onTranscomPolylineMouseOver(e) {
		var tooltipContent = "";
		this.setOptions(onPolylineHoverColorOptions);
		if (this.icons != null) {
		  this.icons[0].icon.scale = 3;
		}
		tooltipContent = "<span><b>" + this.linkName + "</b></span><hr>";
		tooltipContent += "<br>segment ID: " + this.id;
		tooltipContent += "<br>number of records: " + this.VehiclesInSample;
		tooltipContent += "<br>new matches in sample period: " + this.NewMatchesInSamplePeriod;
		tooltipContent += "<br>link readers status: " + this.readersStatus;
		tooltipContent += "<br>link status: " + this.SystemStatus;
		tooltipContent += "<br>approx. travel-time: " + this.currTtSec + " seconds";
		tooltipContent += "<br>approx. speed: " + this.speedMph + "(MPH)";
		tooltipContent += "<br>record timestamp: " + this.recordTimeStamp;
		tooltipContent += "<br>segment length: " + this.linkLength + " meters (" + (this.linkLength * 3.2808).toFixed(2) + " ft)";
		tooltipContent += "<br>confidence level: " + this.ConfidenceLevel;
		tooltipContent += "<br>Synthetic Link: " + this.FromSyntheticSegment;
	  
		linkToolTip.setContent(tooltipContent);
		//here e is the overlay object and whenever we hover over the overlay we can get the coords to use with our infobox tooltip
		linkToolTip.setPosition(e.latLng);
		linkToolTip.open(map);
	  }
	  function getTranscomLinkData() {
		$.ajax({
		  type: "GET",
		  url: base_uri + "transcom_link_data.json",
		  async: true,
		  dataType: "json",
		  contentType: "application/json", // content type sent to server
		  success: processTranscomLinkData_success,
		  error: function (e) {
			console.log("error loading the transcom link data " + e);
		  }
		});
	  }

	  function processTranscomLinkData_success(results) {
		console.log("success getting transcom link data: " + results.RECORDS.length + " records obtained");
		for (var i = 0; i < results.RECORDS.length; i++) {
		  var id = results.RECORDS[i].ExternalId;
		  for (var j = 0; j < transcomLinks.length; j++) {
			if (id == transcomLinks[j].id) {
			  //console.log(id+" = "+transcomLinks[j].id);
			  transcomLinks[j].speedMph = results.RECORDS[i].speed_mph;
			  transcomLinks[j].currTtSec = results.RECORDS[i].CurrentTravelTimeSeconds;
			  transcomLinks[j].SystemStatus = results.RECORDS[i].SystemStatus;
			  transcomLinks[j].VehiclesInSample = results.RECORDS[i].VehiclesInSample;
			  transcomLinks[j].NewMatchesInSamplePeriod = results.RECORDS[i].NewMatchesInSamplePeriod;
			  transcomLinks[j].ConfidenceLevel = results.RECORDS[i].ConfidenceLevel;
			  transcomLinks[j].FromSyntheticSegment = results.RECORDS[i].FromSyntheticSegment;
			  transcomLinks[j].recordTimeStamp = results.RECORDS[i].TimeStamp;
			  transcomLinks[j].linkColor = transcomGetLinkColor(transcomLinks[j].VehiclesInSample, transcomLinks[j].speedMph, transcomLinks[j].SystemStatus);
			  transcomLinks[j].setOptions({strokeColor: transcomLinks[j].linkColor});
			}
		  }
		}
	  }
	  
	  function transcomGetLinkColor(nRecords, speed, status) {
		var c = "#444";
		if ((speed > 0) && (status == "Operational" || status == "Unknown" || status == "Warning")) {
		  if (nRecords < 5) {
			c = "#4E7AC7"; //blue
		  } else if (speed > 45.0) {
			c = "#32CD32"; //green
		  } else if ((speed <= 45.0) && (speed > 30.0)) {
			c = "#FFDF00"; //yellow
		  } else if ((speed <= 30.0) && (speed > 15.0)) {
			c = "#ffa500"; //orange
		  } else if (speed <= 15.0) {
			c = "#CC3333"; //red
		  }
	  
		} else {
		  c = "#444";
		}
		return c;
	  }
//#endregion

//#region functions to load the wifi readers and polylines json
function getWifiPolylines() {
  $.ajax({
    type: "GET",
    url: base_uri + "wifi_polylines_info.json",
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: setWifiPolylines,
    error: function(e){console.log("error loading the wifi polylines"+e);}
  });
}

function getWifiLocations() {
  $.ajax({
    type: "GET",
    url: base_uri + "wifi_locations_info.json",
    async: true,
    dataType: "json",
    contentType: "application/json", // content type sent to server
    success: setWiFiLocations,
    error: function(e){console.log("error loading the wifi locations "+e);}
  });
}

function setWiFiLocations(results) {
	console.log("success got wifi locations: " + results.RECORDS.length);
	if (results.RECORDS.length != 0 || results.RECORDS.length != null) {
		for (var i = 0; i < results.RECORDS.length; i++) {
			//console.log(results.RECORDS[i].lat+" "+results.RECORDS[i].lng);
			var readerMarker = new google.maps.Marker({
				position: new google.maps.LatLng(results.RECORDS[i].lat, results.RECORDS[i].lng),
				map: map,
				icon: {
					url: readerLocationIcon_good,
					size: new google.maps.Size(16, 16),
					origin: new google.maps.Point(0, 0),
					anchor: new google.maps.Point(8, 8)
				},
				title: results.RECORDS[i].location_name + " (location ID: " + results.RECORDS[i].lid + ")\nHEX: " + results.RECORDS[i].moxa_hex
			});
		}
	}
}

function setWifiPolylines(results) {
  if (results.RECORDS != null && results.RECORDS.length != 0) {
    for (var i = 0; i < results.RECORDS.length; i++) {
      var mypoly = new google.maps.Polyline({
        path: google.maps.geometry.encoding.decodePath(results.RECORDS[i].polyline),
        geodesic: true,
        strokeOpacity: 1,
		strokeWeight: 2,
		icons: [{
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 2,
              strokeColor: "#444",
              strokeWeight: .5,
              fillOpacity: 1
            },
            offset: "50%"
          }]
      });
      mypoly.id = results.RECORDS[i].sid;
      mypoly.linkName = results.RECORDS[i].location_name;
      mypoly.streetType = results.RECORDS[i].type;
      //mypoly.speedMph = 0;
      mypoly.medianTt_sec = 0;
      mypoly.medianTt = "undefined"
      mypoly.numberOfRecords = 0;
      mypoly.recordTimeStamp = "";
      mypoly.linkColor = "undefined";
      mypoly.linkLength = google.maps.geometry.spherical.computeLength(mypoly.getPath()).toFixed(2);

      wifiLinks.push(mypoly);
      mypoly.setMap(map);

      google.maps.event.addListener(mypoly, "mouseover", onWifiPolylineMouseOver);
      google.maps.event.addListener(mypoly, "mouseout", onWifiPolylineMouseOut);
    }
    //after the polylines are drawn get the data for the first time
    getWifiLinkData();
  } else {
    alert("no polylines found on server");
  }

}

function onWifiPolylineMouseOver(e) {
	var tooltipContent = "";
	this.setOptions(onPolylineHoverColorOptions);
	if (this.icons != null) {
	  this.icons[0].icon.scale = 3;
	}
	tooltipContent = "<span><b>" + this.linkName + "</b></span><hr>";
	tooltipContent += "<br>segment ID: " + this.id;
	tooltipContent += "<br>number of records: " + this.numberOfRecords;
	tooltipContent += "<br>approx. median travel-time: " + this.medianTt_sec + " seconds ( " + this.medianTt + " )";
	tooltipContent += "<br>record timestamp: " + this.recordTimeStamp;
	tooltipContent += "<br>segment length: " + this.linkLength + " meters (" + (this.linkLength * 3.2808).toFixed(2) + " ft)";
	linkToolTip.setContent(tooltipContent);
	//here e is the overlay object and whenever we hover over the overlay we can get the coords to use with our infobox tooltip
	linkToolTip.setPosition(e.latLng);
	linkToolTip.open(map);
  }

  function onWifiPolylineMouseOut() {
	this.setOptions(defaultPolylineColorOptions);
	if (this.icons != null) {
	  this.icons[0].icon.scale = 2;
	}
	linkToolTip.close();
  }

  function getWifiLinkData() {
	$.ajax({
	  type: "GET",
	  url: base_uri + "wifi_median_traveltime_data.json",
	  async: true,
	  dataType: "json",
	  contentType: "application/json", // content type sent to server
	  success: processWifiLinkData_success,
	  error: function (e) {
		console.log("error loading the wifi link data " + e);
	  }
	});
  }
  
  function processWifiLinkData_success(results) {
	console.log("success getting wifi link data: " + results.RECORDS.length + " records obtained");
	for (var i = 0; i < results.RECORDS.length; i++) {
	  var id = results.RECORDS[i].sid;
	  for (var j = 0; j < wifiLinks.length; j++) {
		if (id == wifiLinks[j].id) {
		  wifiLinks[j].medianTt_sec = results.RECORDS[i].median_tt_sec;
		  wifiLinks[j].medianTt = results.RECORDS[i].median_tt;
		  wifiLinks[j].numberOfRecords = results.RECORDS[i].n_records;
		  wifiLinks[j].recordTimeStamp = results.RECORDS[i].time_stamp;
		  wifiLinks[j].linkColor = getWifiLinkColor(1, wifiLinks[j].medianTt_sec, wifiLinks[j].numberOfRecords);
		  wifiLinks[j].setOptions({strokeColor: wifiLinks[j].linkColor});
		  wifiLinks[j].icons[0].icon.fillColor = wifiLinks[j].linkColor;
		  wifiLinks[j].icons[0].icon.strokeColor = wifiLinks[j].linkColor;
		}
	  }
	}
  }

  function getWifiLinkColor(speed, travelTime, nRecords) {
	var c = "#444";
	if (speed > 0) {
	  if ((nRecords < 2) && (nRecords > 0)) {
		c = "#4E7AC7";
		//blue
	  } else if ((0 < travelTime) && (travelTime <= 180)) {
		c = "#32CD32";
		//green
	  } else if ((180 < travelTime) && (travelTime <= 270)) {
		c = "#FFDF00";
		//yellow
	  } else if ((270 < travelTime) && (travelTime <= 360)) {
		c = "#ffa500";
		//orange
	  } else if (360 < travelTime) {
		c = "#ff0000";
		//red
	  }
  
	} else {
	  c = "#444";
	}
	return c;
  }
//#endregion




/**
 * onPolylineMouseOut is a google maps event listener function
 *  that will run when the user removes the mouse from the poyline. it will 
 * change the poyline options to default and clear the tooltip
 */
function onPolylineMouseOut() {
  this.setOptions(defaultPolylineColorOptions);
  if (this.icons != null) {
    this.icons[0].icon.scale = 2;
  }
  linkToolTip.close();
}

/**
 * mytick is the main timer for the application. It must be defined for the "appTimer" object.
 * it will drive the time and date components and more importantly it drives the refresh interval of the link data.
 * the method is called each timer ticks (refreshes) according to the timer definition.
 */
function mytick() {
  //console.log("from timer tick: "+new Date() + ", and current count: "+appTimer.currentCount);
  myTime = moment().format("hh:mm:ss A");
  myDate = moment().format("dddd, MMMM DD, YYYY");

  document.getElementById("timeDiv").innerHTML = myTime;
  document.getElementById("dateDiv").innerHTML = myDate;
  document.getElementById("timeLeft").innerHTML = "Seconds left until next refresh: " + (secondsToNextRefresh--);
  //console.log(myDate+" "+myTime+" timer current count: "+appTimer.currentCount);
  if (appTimer.currentCount == dataRefreshInterval_seconds) {
    getMimJsonLinkData()
    getTranscomLinkData();
    getWifiLinkData();
    //reset the timer so the current count resets as well
    appTimer.Reset();
    document.getElementById("disclaimerDateTime").innerHTML = moment().format("MMMM Do YYYY, h:mm:ss a");
    secondsToNextRefresh = dataRefreshInterval_seconds;
  }

};


/**
 * onPolylineMouseClick is a google maps event listener method that will run when a polyline is clicked
 * it will execute the showChart method which will open up the chart object div
 */
function onPolylineMouseClick() {
  //this is the actual polyline object
  showChart(this);
}

/**
 * this method will obtain the middle point of the polyline path array in order to display the infowindow at this location
 * @param {Array} an Array containing the polyline path
 */
function getMostMiddlePoint(arr) {
  var middle = arr[Math.floor((arr.length - 1) / 2)];
  return middle;
}


/**
 * the showChart function will "pop up" the overlay div which is hidden intially through css. once a call to this function is made, the
 * modal pop up will show. The important things to rememeber are the css for the overlay div and to put it at the end of your document
 * after the </html> tag.
 */
function showChart(link) {
  //console.log("showing chart");
  var el = document.getElementById("overlay");
  var oc = document.getElementById("overlayContent");
  var chartPopUp = new PolylineInfoWindowControl(link);

  el.style.visibility = "visible";
  el.style.opacity = 1;

  //this is needed for IE9+ since opacity property doest work, instead ie uses filter
  el.style.filter = "alpha(opacity=100)";
  oc.appendChild(chartPopUp);
}

/**
 * the closeChart function is bound to the close button element onclick event. it will clear the modal chart from the screen
 * please note that you must define the actual chart element and it"s parent to delete it from the stage
 */
function closeChartIw() {
  var el = document.getElementById("overlay");
  //this is the actual overlay node that will dissapear
  var chartDiv = document.getElementById("chartWrapper");

  chartDiv.parentNode.removeChild(chartDiv);
  //we call the parent of the chart node to remove the child.

  el.style.opacity = 0;
  //we set the opacity back to zero to reset the transition effect
  el.style.filter = "alpha(opacity=0)";
  el.style.visibility = "hidden";
  //we clear the overlay from the screeen chartData and chart are object for the amchart in the mycustomcontrols lib
  chartData = [];
  chart.clear();
  clearInterval(refreshLiveDataTimer);
}
