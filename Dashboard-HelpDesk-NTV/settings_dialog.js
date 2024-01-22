'use strict';

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
	/**
	* This extension collects the IDs of each datasource the user is interested in
	* and stores this information in settings when the popup is closed.
	*/
	const wsNameSettingsKey = 'ws_bar_name';
	const dsNameSettingsKey = 'datasource_name';
	const dsIntervalSettingsKey = 'datasource_interval';
	

	$(document).ready(function () {
		// The only difference between an extension in a dashboard and an extension
		// running in a popup is that the popup extension must use the method
		// initializeDialogAsync instead of initializeAsync for initialization.
		// This has no affect on the development of the extension but is used internally.
		tableau.extensions.initializeDialogAsync().then(function (openPayload) {
			// The openPayload sent from the parent extension in this sample is the
			// default time interval for the refreshes.  This could alternatively be stored
			// in settings, but is used in this sample to demonstrate open and close payloads.
			$('#closeButton').click(closeDialog);

			const dashboard = tableau.extensions.dashboardContent.dashboard;
			const wss = dashboard.worksheets;
			const curr_ws = tableau.extensions.settings.get(wsNameSettingsKey);
			const curr_ds = tableau.extensions.settings.get(dsNameSettingsKey);
			const curr_interv = tableau.extensions.settings.get(dsIntervalSettingsKey);
			
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
					console.log("dumping wss " + datasources);
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
			
			
			if(curr_interv){
				$('#interval').val(curr_interv);	
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
	/**
	* Stores the selected datasource IDs in the extension settings,
	* closes the dialog, and sends a payload back to the parent.
	*/
	function closeDialog () {
		const selected_ws = $("input[name='"+wsNameSettingsKey+"']:checked").val();
		const selected_ds = $("input[name='"+dsNameSettingsKey+"']:checked").val();
		const filled_interv = $("#interval").val();
		tableau.extensions.settings.set(wsNameSettingsKey, selected_ws);
		tableau.extensions.settings.set(dsNameSettingsKey, selected_ds);
		if(filled_interv > 0){
			tableau.extensions.settings.set(dsIntervalSettingsKey, filled_interv);	
		}

		tableau.extensions.settings.saveAsync().then((newSavedSettings) => {
			tableau.extensions.ui.closeDialog("");
		});
	}
	
})();
