'use strict';

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
	/**
	* This extension collects the IDs of each datasource the user is interested in
	* and stores this information in settings when the popup is closed.
	*/
	const wsNameSettingsKey = "ws_bar_name";
	const dsNameSettingsKey = "datasource_name";
	const dsIntervalSettingsKey = "datasource_interval";
	const rdrCfgSettingsKey = "radar_cfg_json";
	const msgNoOverride = "*** No ovverride *** using default";
	
	$(document).ready(function () {
		tableau.extensions.initializeDialogAsync().then(function (openPayload) {
			$('#closeButton').click(closeDialog);

			const dashboard = tableau.extensions.dashboardContent.dashboard;
			const wss = dashboard.worksheets;
			const curr_ws = tableau.extensions.settings.get(wsNameSettingsKey);
			const curr_ds = tableau.extensions.settings.get(dsNameSettingsKey);
			const curr_interv = tableau.extensions.settings.get(dsIntervalSettingsKey);
			const curr_cfg_str = tableau.extensions.settings.get(rdrCfgSettingsKey);
			const def_cfg = JSON.parse(openPayload)["default_radar_cfg"];
			
			var visibleDatasources = [];

			wss.forEach(function (worksheet) {
				var name = worksheet.name;
				var isActive = false;
				if(curr_ws){
					isActive = (curr_ws === name);
				}
				addWsItemToUI(name, isActive);
			});
			
			wss.forEach(function (worksheet) {
				worksheet.getDataSourcesAsync().then(function (datasources) {
					datasources.forEach(function (datasource) {
						var isActive = false;
						if(curr_ds){
							isActive = (curr_ds === datasource.name);
						}
						
						if (visibleDatasources.indexOf(datasource.name) < 0) {
							addDsItemToUI(datasource.name, isActive);
							visibleDatasources.push(datasource.name);
						}
					});
				});
			});
			
			
			if(Number.isInteger(curr_interv*1)){
				$('#interval').val(curr_interv);	
			}
			
			if(curr_cfg_str){
				try {
					$('#jcfg').val(JSON.stringify(JSON.parse(curr_cfg_str), null, '\t'));
				} catch (e) {
					$('#jcfg').val(msgNoOverride);
				}
			}
			if(def_cfg) {
				try {
					$('#jdefcfg').val(JSON.stringify(def_cfg, null, '\t'));
				} catch (e){ 
					console.log("err: " + e);
				}
			}

		});
	});

	function addRadioItemToUI (label, isActive, radioName, containerSelector) {
		const containerDiv = $('<div />');

		$('<input />', {
			type: 'radio',
			id: label,
			value: label,
			name: radioName,
			checked: isActive,
		}).appendTo(containerDiv);

		$('<label />', {
			for: label,
			text: label
		}).appendTo(containerDiv);

		$(containerSelector).append(containerDiv);
	}

	function addWsItemToUI (ws, isActive) {
		addRadioItemToUI(ws, isActive, wsNameSettingsKey, "#worksheets");
	}
	function addDsItemToUI (dm, isActive) {
		addRadioItemToUI(dm, isActive, dsNameSettingsKey, "#datasources");
	}


	function closeDialog () {
		const selected_ws = $("input[name='"+wsNameSettingsKey+"']:checked").val();
		const selected_ds = $("input[name='"+dsNameSettingsKey+"']:checked").val();
		const filled_interv = $("#interval").val() * 1;
		const jcfg = $("#jcfg").val();
		
		tableau.extensions.settings.set(wsNameSettingsKey, selected_ws);
		tableau.extensions.settings.set(dsNameSettingsKey, selected_ds);
		
		var parsed_jcfg = undefined;
		try {
			parsed_jcfg = JSON.stringify(JSON.parse(jcfg));
		} catch (e) {
			console.log("Err: " + e);
			parsed_jcfg = msgNoOverride;
		}
		tableau.extensions.settings.set(rdrCfgSettingsKey, parsed_jcfg);


		if(Number.isInteger(filled_interv)){
			tableau.extensions.settings.set(dsIntervalSettingsKey, filled_interv);
		}

		tableau.extensions.settings.saveAsync().then((newSavedSettings) => {
			tableau.extensions.ui.closeDialog("");
		});
	}
	
})();
