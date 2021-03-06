
/* A subclass of AgendaView, it displays an arbitrary number of "agendaDay" views side by side
----------------------------------------------------------------------------------------------------------------------*/

var MultiAgendaView = fc.MultiAgendaView = AgendaView.extend({

	initialize: function() {
		this.timeGrid = new MultiTimeGrid(this);
		this.timeGrid.setCustomProperty("staff");

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
	},

	renderEvents:function(events){
		//this.calculateColumns(events);
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
		this.title = "Multi " + this.computeTitle();
	},

	setColumns:function(columns){
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
		this.reDraw();
	},

	calculateColumns:function(events){
		this.columns = [];
		this.columnMap = {};
		if($.isArray(events) && events.length > 0){
			for (var i = events.length - 1; i >= 0; i--) {
				var ev = events[i];
				if($.isPlainObject(ev) && $.isPlainObject(ev.rawEvent)){
					var staff;
					if($.isPlainObject(ev.rawEvent.staff)){
						staff = ev.rawEvent.staff;
					}else{
						staff = {id:"~NULL~", name:"Unassigned Events"};
					}
					if(!this.columnMap.hasOwnProperty(staff.id)){
						this.columns.push(staff);
						this.columnMap[staff.id] = staff;
					}
				}
			};
		}
	},

	triggerSelect:function(range, ev){
		this.trigger('select', null, range.start, range.end, ev, range.customProperty);
	}

});	