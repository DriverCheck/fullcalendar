
/* A subclass of AgendaView, it displays an arbitrary number of "agendaDay" views side by side
----------------------------------------------------------------------------------------------------------------------*/

var MultiAgendaView = fc.MultiAgendaView = AgendaView.extend({

	initialize: function() {
		this.timeGrid = new MultiTimeGrid(this);

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
		this.calculateColumns(events);
		this.timeGrid.setCustomColumns(this.columns, this.columnMap);
		this.timeGrid.rangeUpdated();
		this.renderDates();
		AgendaView.prototype.renderEvents.apply(this, arguments);
	},

	updateTitle:function(){
		this.title = "Multi " + this.computeTitle();
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