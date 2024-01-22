'use strict';
//TODO: Replace italian comments

(function () {
	$(document).ready(function () {
		
		const wsNameSettingsKey = "ws_bar_name";
		const dsNameSettingsKey = "datasource_name";
		const dsIntervalSettingsKey = "datasource_interval";
		const rdrCfgSettingsKey = "radar_cfg_json";
		const rdrDefCfgSettingsKey = "radar_defcfg_json";
		
		const repoFleetFieldName = "Flotta";
		const repoLegendLabelCurrent ="Disp. corrente";
		
		var ext_id = -1;
		var ws_bar = undefined;
		var wss = undefined;
		var ds_refresh_name = undefined;
		var ds_refresh_mins = undefined;
		
		var timer_refresh = undefined;
		var radar_cfg = undefined;
		
		const radar_def_cfg = {
			w: 240,
			h: 240,
			maxValue: 1,
			levels: 10,
			ExtraWidthX: 150,
			ExtraWidthY: 60,
			radius: 5,
			factor: 1,
			factorLegend: .85,
			ToRight: 0,
			TranslateX: 60,
			TranslateY: 30,
			colors_raw: ["#a8a8a8", "#265f95"]
		}
		
		function configure() { 

			const parentUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
			const popupUrl = `${parentUrl}/settings_dialog.html`;
			tableau.extensions.ui.displayDialogAsync(popupUrl, 0, { height: 500, width: 500 }).then((closePayload) => {
				updateExtensionBasedOnSettings(true);
			}).catch((error) => {
			});
		}
		
		
		function updateExtensionBasedOnSettings (onEvent = false) {
			const settings = tableau.extensions.settings.getAll();
						
			wss = tableau.extensions.dashboardContent.dashboard.worksheets;
			if(settings[wsNameSettingsKey]){
				var tmp_ws_bar = wss.find(function (sheet) {
					return sheet.name === settings[wsNameSettingsKey];
				});
				if(tmp_ws_bar){
					ws_bar = tmp_ws_bar;
				}	
			}
			if(settings[dsNameSettingsKey]){
				ds_refresh_name = settings[dsNameSettingsKey];
			}
			if(settings[dsIntervalSettingsKey]){
				ds_refresh_mins = settings[dsIntervalSettingsKey];
			}
						
			if(settings[rdrCfgSettingsKey]){
				radar_cfg = JSON.parse(settings[rdrCfgSettingsKey]);
			}
			
			if(onEvent){
				drawEveryRadar();	
				setTimerRefresh();
			}
		}

		function refreshDatasource(){
			ws_bar.getDataSourcesAsync().then(datasources =>
			{var dataSource = datasources.find(datasource => datasource.name === ds_refresh_name);
				return dataSource.refreshAsync()
			});
		}
		
		function setTimerRefresh() {
			if(timer_refresh){
				clearInterval(timer_refresh);
			}
			/* Negative or zero ds_refresh_mins means that auto refresh is disabled */
			if(ds_refresh_mins > 0) {
				timer_refresh = setInterval(function() {
					refreshDatasource();
					drawEveryRadar();
				}, ds_refresh_mins * 60 * 1000); 
			}
		}

		// funzione per estrarre un array contenente le dimensioni per i poligoni
		function getLegend(data){
			var legend = [];
			var i;
			for(i in data){
				legend[i]=data[i][2].formattedValue;
			}
			
			function onlyUnique(value, index, self) { 
				return self.indexOf(value) === index;
			}
			
			return legend.filter( onlyUnique )
		}
		  
		// funzione per estrarre un array contente lo stato di aggiornamento del dato per ogni treno
		function getColor(data){
			var row = [];
			var i;
			for(i in data){
				if(data[i][2].formattedValue==repoLegendLabelCurrent){
					row.push({
						axis: data[i][3].value,
						value: data[i][0].value
					})
				}
			}
			
			function sortFunc(a, b) {
				if (a.axis > b.axis){
					return -1;
				} else {
					return 1;
				}
			}
			
			var color = row.sort(sortFunc);
			return color;
		}
			
		// funzione per trasformare i dati in un array strutturato come serve alla funzione che disegna il radar
		function getBestData(data) {
			var i;
			var row;
			var legend_options = getLegend(data);
			var nicedata = [];
			
			function myfilt(row){
				return row[2].formattedValue == dim;
			}

			for(i=0; i< legend_options.length;i++){
				var dim = legend_options[i];
				nicedata[i]=data.filter( myfilt );
			}
			
			var bestdata = [];
			var test,c;

			for (i in nicedata) {
				row = [];
				for(c in nicedata[i]){
					
					if(nicedata[i][c][6].value == '%null%') {
						test = parseFloat(nicedata[i][c][5].value)
					} else {
						test = parseFloat(nicedata[i][c][6].value)
					}
				
					row.push({
						axis: nicedata[i][c][3].value,
						value: test
					})
					
					bestdata[i]=row;		
				}
			}
			
			function sortFunc(a, b) {
				if (a.axis > b.axis)  return -1;
				else return 1;
			}
			
			for(i in bestdata){
				bestdata[i]=bestdata[i].sort(sortFunc);
			}
			
			return bestdata;
		}
		
		// funzione che disegna il radar, qui si possono cambiare alcuni parametri come larghezza e altezza
		function drawRadar(best_data, legend_labels, colors, html_id){
						
			var my_cfg = JSON.parse(JSON.stringify(radar_cfg)); //Clone instead of assigning by reference
			
			my_cfg.color = d3.scale.ordinal().range(my_cfg.colors_raw);			
			my_cfg.colordata = colors;
			my_cfg.radians = 2 * Math.PI;
			
			RadarChart.draw(html_id, best_data, my_cfg);   
		}

		function drawARadar(ws, html_id){
			ws.getSummaryDataAsync().then(function (sumdata) {
				var legend_options = getLegend(sumdata.data);
				var color_data = getColor(sumdata.data);
				var d = getBestData(sumdata.data);
				drawRadar(d, legend_options, color_data, html_id);
			});
		}
	
		// funzione che disegna tutti i radar
		function drawEveryRadar(){
			drawARadar(ws_bar, "#the-radar");
		}
		
		
		function getWssNames(wss){
			var names = [];
			var i;
			for(i = 0; i < wss.length; i++){
				names.push("worksheet[" + i + "]: " + wss[i].name);
			}
			return names;
		}

		function debugAppendHeader(where){
			const label_node = document.createElement("h2");
			const label_val = document.createTextNode("Info");
			label_node.appendChild(label_val);
			where.appendChild(label_node);
			
			const text_node = document.createElement("p");
			var text_val = document.createTextNode("Come comportamento di default verranno stampate le proprietà di tutti i capi/colonne di tutti i worksheet. Per limitare a un solo worksheet aggiungere al nodo HTML TABLEAU-API-DEBUG l'attributo 'only-sheet=\"x\"' dove x è l'id del worksheet di cui si vogliono ottenere le info sui campi");
			text_node.appendChild(text_val);
			where.appendChild(text_node);
			
		}	

		function appendList(where, label, items){
			const label_node = document.createElement("h2");
			const label_val = document.createTextNode(label);
			label_node.appendChild(label_val);
			where.appendChild(label_node);
			const name_list = document.createElement("ul");
			for(i = 0; i < items.length; i++) {
				var li = document.createElement("li");
				var val = document.createTextNode(items[i]);
				li.appendChild(val);
				name_list.appendChild(li);
			}
			where.appendChild(name_list);
		}	

		function debugAppendWsFields(where, label, ws){
			var i;
			ws.getSummaryDataAsync().then(function (sum_data) {
				var columns = sum_data.columns;
				var column_names = [];
				for(i = 0; i < columns.length; i++){
					column_names.push("column[" + i + "] has type {" + columns[i].dataType + "} and name: " + columns[i].fieldName);
				}
				appendList(debug_element, label, column_names);
			});
		}

		function debugAppendWssFields(where, wss, id){
			var i;
			for(i = 0; i < wss.length; i++){
				if(id < 0 || id == i) {
					debugAppendWsFields(where, "Field names in worksheet " + wss[i].name + ":", wss[i]);	
				}
			}
		}
		
		function checkAndPrintDebug(){
			var debug_element = document.getElementById("TABLEAU-API-DEBUG");	
			if(debug_element != null){
				debugAppendHeader(debug_element);
				var wss = tableau.extensions.dashboardContent.dashboard.worksheets;
				appendList(debug_element, "worksheet names:", getWssNames(wss));
				var sheet_id = debug_element.getAttribute("only-sheet");
				if(sheet_id == null || sheet_id >= wss.length){
					sheet_id = -1;
				}
				debugAppendWssFields(debug_element, wss, sheet_id);
			}
		}
		
		function getCurrentTime(){
			var date = new Date();
			var current_time = date.getHours()+":"+date.getMinutes()+":"+ date.getSeconds();
			return current_time;
		}
		
		tableau.extensions.initializeAsync({'configure': configure}).then(function () {
			ext_id = tableau.extensions.dashboardObjectId;
			/* Initialize settings with defaults */	
			wss = tableau.extensions.dashboardContent.dashboard.worksheets;
			ws_bar = wss[0];
			ds_refresh_name = "datamapping";
			ds_refresh_mins = -1; //Disabled
			radar_cfg =  JSON.parse(JSON.stringify(radar_def_cfg)); //Clone instead of assigning by reference
			/* Load real persistent settings from tableau */
			updateExtensionBasedOnSettings(false);
			
			/* Print debug info in requested */
			checkAndPrintDebug();

			/* Run a first datasource refresh (only if auto refresh is enabled) */
			/* TODO: Check if it's better to remove it or if there is a real need */
			if(ds_refresh_mins > 0){
				refreshDatasource();
			}

			// deselezionano eventuali barre selezionate durante la navigazione
			ws_bar.selectMarksByValueAsync([{fieldName: repoFleetFieldName, value: ''}], 'select-replace');
			  
			/* Draw the radar una-tantum */
			drawEveryRadar();
			  
			/* Eventually add event listeners to redraw the radar ...*/
			/* ...Listen to parameter changes (e.g. change of in-service filter or 'previous' hours value) */
			tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(function (parameters) {
				parameters.forEach(function (p) {
					p.addEventListener(tableau.TableauEventType.ParameterChanged, drawEveryRadar);
				});
			});
			
			/* ...Listen to dashboard extension setting changes (to redray the radar asap when dashboad editor change a value in the configuration settings */
			tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, (settingsEvent) => {
				updateExtensionBasedOnSettings(true);
			});
			
			/* ...Listen to mark selection (e.g. user clicks on an item causing change of the selection) */
			ws_bar.addEventListener(tableau.TableauEventType.MarkSelectionChanged, drawEveryRadar);
			
			/* Set an interval to periodically redraw the radar (with an optional auto-refresh of the datasource)  */
			setTimerRefresh();
				
		}, function (err) {
			// Something went wrong in initialization.
			console.log('Error while Initializing: ' + err.toString());
		});
  });

})();

