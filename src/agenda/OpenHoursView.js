
/* A subclass of AgendaView, it displays an arbitrary number of "agendaDay" views side by side
----------------------------------------------------------------------------------------------------------------------*/

var OpenHoursView = fc.OpenHoursView = AgendaView.extend({


	initialize: function() {
		this.timeGrid = new MultiTimeGrid(this);
		this.timeGrid.setCustomProperty("day");

		if (this.opt('allDaySlot')) { // should we display the "all-day" area?
			this.dayGrid = new DayGrid(this); // the all-day subcomponent of this view

			// the coordinate grid will be a combination of both subcomponents' grids
			this.coordMap = new ComboCoordMap([
				this.dayGrid.coordMap,
				this.timeGrid.coordMap
			]);
		}
		else {
			this.coordMap = this.timeGrid.coordMap;
		}

		this.setColumns([
			{id:"sun_hours", name:"Sunday"},
			{id:"mon_hours", name:"Monday"},
			{id:"tue_hours", name:"Tuesday"},
			{id:"wed_hours", name:"Wednesday"},
			{id:"thu_hours", name:"Thursday"},
			{id:"fri_hours", name:"Friday"},
			{id:"sat_hours", name:"Saturday"}
		], false);
	},

	renderEvents:function(events){
		this.lastEvents = events;
		this.timeGrid.setCustomColumns(this.columns, this.columnMap);
		this.timeGrid.rangeUpdated();
		this.renderDates();

		if(!$.isArray(events)) events = [];
		AgendaView.prototype.renderEvents.apply(this, arguments);
	},

	reDraw:function(){
		this.displayEvents(this.lastEvents);
	},

	updateTitle:function(){
		this.title = "Hours of Operation";
	},

	setColumns:function(columns, doRedraw){
		if(doRedraw === undefined){
			doRedraw = true;
		}

		this.columns = [];
		this.columnMap = {};
		if($.isArray(columns) && columns.length > 0){
			this.columns = columns;
			for (var i = columns.length - 1; i >= 0; i--) {
				var column = columns[i];
				if($.isPlainObject(column) && column.id !== undefined){
					this.columnMap[column.id] = column;
				}
			};
		}
		if(doRedraw == true){
			this.reDraw();
		}
	},


	triggerSelect:function(range, ev){
		this.trigger('select', null, range.start, range.end, ev, range.customProperty);
	}

});	